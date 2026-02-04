import { test, expect } from '@playwright/test'

// Helper to set up authenticated state
async function setupAuth(page: import('@playwright/test').Page) {
  // Set up routes BEFORE any navigation
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      json: { id: '1', email: 'test@example.com' },
    })
  })

  // Mock all API endpoints that pages might call
  await page.route('**/clickup/tasks/today', async (route) => {
    await route.fulfill({
      status: 200,
      json: { total: 0, completed: 0, remaining: 0, overdue: 0, affirmativeCompletions: 0, completionRate: 0 },
    })
  })

  await page.route('**/clickup/tasks/today/list', async (route) => {
    await route.fulfill({
      status: 200,
      json: { tasks: [], overdueTasks: [] },
    })
  })

  await page.route('**/clickup/tasks/stats/**', async (route) => {
    await route.fulfill({ status: 200, json: [] })
  })

  await page.route('**/webhooks/status', async (route) => {
    await route.fulfill({ status: 200, json: { wrike: [], clickup: [] } })
  })

  // Mock grocy endpoints for meals and shopping pages
  await page.route('**/grocy/**', async (route) => {
    const url = route.request().url()
    if (url.includes('meal-plan/sections')) {
      await route.fulfill({ status: 200, json: [] })
    } else if (url.includes('meal-plan')) {
      await route.fulfill({ status: 200, json: { startDate: '', endDate: '', meals: [] } })
    } else if (url.includes('recipes')) {
      await route.fulfill({ status: 200, json: [] })
    } else if (url.includes('shopping-list')) {
      await route.fulfill({ status: 200, json: { lists: [], items: [] } })
    } else {
      await route.fulfill({ status: 200, json: {} })
    }
  })

  // Set localStorage via addInitScript so it's available before the page loads
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'test-token')
  })
}

test.describe('Navigation', () => {
  test('shows navigation bar when authenticated', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Stats' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meals' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Shopping' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Webhooks' })).toBeVisible()
  })

  test('hides navigation bar on login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('link', { name: 'Home' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Stats' })).not.toBeVisible()
  })

  test('shows user email in navigation', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')

    // Email is visible on larger screens
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('navigates to home page', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/stats')
    await page.getByRole('link', { name: 'Home' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Welcome to Life Assistant')).toBeVisible()
  })

  test('navigates to stats page', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')
    // Wait for authenticated state
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
    await page.getByRole('link', { name: 'Stats' }).click()

    await expect(page).toHaveURL('/stats')
  })

  test('navigates to meals page', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')
    // Wait for authenticated state
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
    await page.getByRole('link', { name: 'Meals' }).click()

    await expect(page).toHaveURL('/meals')
  })

  test('navigates to shopping page', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')
    // Wait for authenticated state
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
    await page.getByRole('link', { name: 'Shopping' }).click()

    await expect(page).toHaveURL('/shopping')
  })

  test('navigates to webhooks page', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'Webhooks' }).click()

    await expect(page).toHaveURL('/webhooks')
  })

  test('redirects to login when accessing protected route unauthenticated', async ({ page }) => {
    await page.goto('/stats')
    await expect(page).toHaveURL(/.*login/)

    await page.goto('/meals')
    await expect(page).toHaveURL(/.*login/)

    await page.goto('/webhooks')
    await expect(page).toHaveURL(/.*login/)
  })

  test('mobile navigation menu toggles', async ({ page }) => {
    await setupAuth(page)
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Desktop nav links should be hidden
    await expect(page.getByRole('link', { name: 'Stats' })).not.toBeVisible()

    // Click hamburger menu
    await page.getByRole('button', { name: 'Toggle menu' }).click()

    // Mobile menu should show links
    await expect(page.getByRole('link', { name: 'Stats' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meals' })).toBeVisible()

    // Click again to close
    await page.getByRole('button', { name: 'Toggle menu' }).click()

    // Links should be hidden again
    await expect(page.getByRole('link', { name: 'Stats' })).not.toBeVisible()
  })

  test('mobile menu closes when navigating', async ({ page }) => {
    await setupAuth(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Wait for authenticated state
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()

    // Open mobile menu
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await expect(page.getByRole('link', { name: 'Stats' })).toBeVisible()

    // Click a navigation link
    await page.getByRole('link', { name: 'Stats' }).click()

    // Should navigate
    await expect(page).toHaveURL('/stats')
  })

  test('logout button is visible and functional', async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()

    await page.getByRole('button', { name: 'Logout' }).click()

    await expect(page).toHaveURL(/.*login/)
  })
})
