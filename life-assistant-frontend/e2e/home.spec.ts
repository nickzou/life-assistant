import { test, expect } from '@playwright/test'

const mockTasks = {
  tasks: [
    {
      id: '1',
      name: 'Complete project report',
      parentName: 'Project Alpha',
      listId: 'list-123',
      status: { status: 'In Progress', type: 'active', color: '#3498db' },
      dueDate: null,
      hasDueTime: false,
      tags: ['work'],
      timeOfDay: { name: 'Morning', color: '#ffa500' },
      url: 'https://example.com/task/1',
    },
    {
      id: '2',
      name: 'Buy groceries',
      parentName: null,
      listId: 'list-123',
      status: { status: 'To Do', type: 'open', color: '#95a5a6' },
      dueDate: '2026-02-04T17:00:00',
      hasDueTime: true,
      tags: [],
      timeOfDay: { name: 'Evening', color: '#9b59b6' },
      url: 'https://example.com/task/2',
    },
    {
      id: '3',
      name: 'Review PR',
      parentName: 'Project Beta',
      listId: 'list-123',
      status: { status: 'Done', type: 'done', color: '#27ae60' },
      dueDate: null,
      hasDueTime: false,
      tags: ['work'],
      timeOfDay: null,
      url: 'https://example.com/task/3',
    },
  ],
  overdueTasks: [
    {
      id: '4',
      name: 'Pay bills',
      parentName: null,
      listId: 'list-123',
      status: { status: 'To Do', type: 'open', color: '#e74c3c' },
      dueDate: '2026-02-03T23:59:00',
      hasDueTime: false,
      tags: [],
      timeOfDay: null,
      url: 'https://example.com/task/4',
    },
  ],
}

const mockStats = {
  total: 4,
  completed: 1,
  remaining: 3,
  overdue: 1,
  affirmativeCompletions: 1,
  completionRate: 25,
}

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token')
    })

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: '1', email: 'test@example.com' },
      })
    })

    await page.route('**/clickup/tasks/today', async (route) => {
      await route.fulfill({ status: 200, json: mockStats })
    })

    await page.route('**/clickup/tasks/today/list', async (route) => {
      await route.fulfill({ status: 200, json: mockTasks })
    })

    await page.route('**/clickup/statuses/*', async (route) => {
      await route.fulfill({ status: 200, json: { statuses: [] } })
    })

    await page.goto('/')
  })

  test('displays task statistics', async ({ page }) => {
    await expect(page.getByText('25%')).toBeVisible()
    await expect(page.getByText('Completion Rate (1/4 tasks)')).toBeVisible()

    // Check stat cards - use exact text to avoid matching heading
    await expect(page.getByText('4').first()).toBeVisible() // Due Today count
    await expect(page.getByText('Due Today', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    await expect(page.getByText('Remaining', { exact: true })).toBeVisible()
    // Use first() since "Overdue" appears in both stats and accordion
    await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible()
  })

  test('displays tasks in accordions', async ({ page }) => {
    // Check in progress section (tasks with status "In Progress" are separated)
    await expect(page.getByText('In Progress (1)')).toBeVisible()
    await expect(page.getByText('Complete project report')).toBeVisible()

    // Check overdue section
    await expect(page.getByText('Overdue (1)')).toBeVisible()
    await expect(page.getByText('Pay bills')).toBeVisible()

    // Check today's tasks section (excluding in-progress tasks)
    await expect(page.getByText("Today's Tasks (2)")).toBeVisible()
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Review PR')).toBeVisible()
  })

  test('in progress tasks appear in dedicated section above overdue', async ({ page }) => {
    // The "In Progress" section should appear before "Overdue"
    const inProgressSection = page.getByText('In Progress (1)')
    const overdueSection = page.getByText('Overdue (1)')

    await expect(inProgressSection).toBeVisible()
    await expect(overdueSection).toBeVisible()

    // Verify "Complete project report" (in progress) is not in Today's Tasks
    // by checking it appears under In Progress section
    const inProgressAccordion = page.locator('button', { hasText: 'In Progress (1)' }).locator('..')
    await expect(inProgressAccordion.getByText('Complete project report')).toBeVisible()
  })

  test('displays task details correctly', async ({ page }) => {
    // Check parent name
    await expect(page.getByText('Project Alpha')).toBeVisible()

    // Check status badge
    await expect(page.getByText('In Progress')).toBeVisible()
    await expect(page.getByText('To Do').first()).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible()

    // Check time of day badges
    await expect(page.getByText('Morning')).toBeVisible()
    await expect(page.getByText('Evening')).toBeVisible()

    // Check tags
    await expect(page.getByText('work').first()).toBeVisible()
  })

  test('tasks have external link buttons', async ({ page }) => {
    // Task names are no longer links - we use external link buttons instead
    const externalLinks = page.getByTestId('external-link-button')
    // Should have 4 external link buttons (1 overdue + 3 today's tasks)
    await expect(externalLinks).toHaveCount(4)
    // All should open in new tab
    await expect(externalLinks.first()).toHaveAttribute('target', '_blank')
    await expect(externalLinks.first()).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('filters tasks by All', async ({ page }) => {
    await page.getByRole('button', { name: 'All' }).click()

    // Should show all tasks
    await expect(page.getByText('Complete project report')).toBeVisible()
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Review PR')).toBeVisible()
    await expect(page.getByText('Pay bills')).toBeVisible()
  })

  test('filters tasks by Work', async ({ page }) => {
    await page.getByRole('button', { name: 'Work' }).click()

    // Should show only work tasks (those with 'work' tag)
    await expect(page.getByText('Complete project report')).toBeVisible()
    await expect(page.getByText('Review PR')).toBeVisible()

    // Should not show personal tasks
    await expect(page.getByText('Buy groceries')).not.toBeVisible()
    await expect(page.getByText('Pay bills')).not.toBeVisible()
  })

  test('filters tasks by Personal', async ({ page }) => {
    await page.getByRole('button', { name: 'Personal' }).click()

    // Should show only personal tasks (those without 'work' tag)
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Pay bills')).toBeVisible()

    // Should not show work tasks
    await expect(page.getByText('Complete project report')).not.toBeVisible()
    await expect(page.getByText('Review PR')).not.toBeVisible()
  })

  test('filter buttons show active state', async ({ page }) => {
    // All should be active by default
    const allButton = page.getByRole('button', { name: 'All' })
    await expect(allButton).toHaveClass(/bg-blue-600/)

    // Click Work filter
    await page.getByRole('button', { name: 'Work' }).click()
    const workButton = page.getByRole('button', { name: 'Work' })
    await expect(workButton).toHaveClass(/bg-blue-600/)
    await expect(allButton).not.toHaveClass(/bg-blue-600/)
  })

  test('shows empty state when no tasks match filter', async ({ page }) => {
    // Set up mock with no work tasks
    await page.route('**/clickup/tasks/today/list', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          tasks: [
            {
              id: '1',
              name: 'Personal task',
              parentName: null,
              status: { status: 'To Do', type: 'open', color: '#95a5a6' },
              dueDate: null,
              hasDueTime: false,
              tags: [],
              timeOfDay: null,
              url: 'https://example.com/task/1',
            },
          ],
          overdueTasks: [],
        },
      })
    })

    await page.reload()
    await page.getByRole('button', { name: 'Work' }).click()

    await expect(page.getByText('No work tasks to show')).toBeVisible()
  })

  test('shows loading state', async ({ page }) => {
    // Set up a slow response
    await page.route('**/clickup/tasks/today', async (route) => {
      await new Promise((r) => setTimeout(r, 1000))
      await route.fulfill({ status: 200, json: mockStats })
    })

    await page.goto('/')
    await expect(page.getByText('Loading...')).toBeVisible()
  })

  test('shows error state on API failure', async ({ page }) => {
    await page.route('**/clickup/tasks/today', async (route) => {
      await route.fulfill({ status: 500, json: { message: 'Server error' } })
    })

    await page.route('**/clickup/tasks/today/list', async (route) => {
      await route.fulfill({ status: 500, json: { message: 'Server error' } })
    })

    await page.goto('/')
    await expect(page.getByText('Failed to fetch tasks')).toBeVisible()
  })

  test('accordions can be collapsed and expanded', async ({ page }) => {
    // Initially expanded - tasks visible
    await expect(page.getByText('Complete project report')).toBeVisible()

    // Collapse today's tasks accordion
    await page.getByRole('button', { name: /Today's Tasks/ }).click()

    // Tasks should be hidden
    await expect(page.getByText('Complete project report')).not.toBeVisible()

    // Expand again
    await page.getByRole('button', { name: /Today's Tasks/ }).click()

    // Tasks visible again
    await expect(page.getByText('Complete project report')).toBeVisible()
  })
})
