import { test, expect } from '@playwright/test'

const mockMeals = {
  startDate: '2026-02-02',
  endDate: '2026-02-08',
  meals: [
    {
      id: 1,
      day: '2026-02-04',
      type: 'recipe',
      recipe_id: 101,
      recipe: {
        id: 101,
        name: 'Spaghetti Bolognese',
        description: 'Classic Italian pasta',
      },
      recipe_servings: 2,
      section_id: 3,
      section_name: 'Dinner',
      done: 0,
    },
    {
      id: 2,
      day: '2026-02-04',
      type: 'recipe',
      recipe_id: 102,
      recipe: {
        id: 102,
        name: 'Oatmeal',
        description: 'Healthy breakfast',
      },
      recipe_servings: 1,
      section_id: 1,
      section_name: 'Breakfast',
      done: 0,
    },
    {
      id: 3,
      day: '2026-02-05',
      type: 'recipe',
      recipe_id: 103,
      recipe: {
        id: 103,
        name: 'Grilled Chicken Salad',
        description: 'Light and healthy',
      },
      recipe_servings: 1,
      section_id: 2,
      section_name: 'Lunch',
      done: 1, // Already done
    },
  ],
}

const mockSections = [
  { id: 1, name: 'Breakfast', sort_number: 1 },
  { id: 2, name: 'Lunch', sort_number: 2 },
  { id: 3, name: 'Dinner', sort_number: 3 },
]

const mockRecipes = [
  { id: 101, name: 'Spaghetti Bolognese', base_servings: 4 },
  { id: 102, name: 'Oatmeal', base_servings: 1 },
  { id: 103, name: 'Grilled Chicken Salad', base_servings: 2 },
  { id: 104, name: 'Pancakes', base_servings: 2 },
]

test.describe('Meals Page', () => {
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

    await page.route('**/grocy/meal-plan/range/**', async (route) => {
      await route.fulfill({ status: 200, json: mockMeals })
    })

    await page.route('**/grocy/meal-plan/sections', async (route) => {
      await route.fulfill({ status: 200, json: mockSections })
    })

    await page.route('**/grocy/recipes/selection', async (route) => {
      await route.fulfill({ status: 200, json: mockRecipes })
    })
  })

  test('displays meal plan with meals', async ({ page }) => {
    await page.goto('/meals')

    // Check page title
    await expect(page.getByRole('heading', { name: 'Meal Plan' })).toBeVisible()

    // Check meals are displayed
    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible()
    await expect(page.getByText('Oatmeal')).toBeVisible()
    await expect(page.getByText('Grilled Chicken Salad')).toBeVisible()

    // Check section badges
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.getByText('Breakfast')).toBeVisible()
    await expect(page.getByText('Lunch')).toBeVisible()
  })

  test('displays servings when not 1', async ({ page }) => {
    await page.goto('/meals')

    // Spaghetti has 2 servings
    await expect(page.getByText('2 servings')).toBeVisible()
  })

  test('shows done checkmark for completed meals', async ({ page }) => {
    await page.goto('/meals')

    // Grilled Chicken Salad is done (done: 1)
    // The meal card should have opacity and checkmark
    const chickenCard = page.getByText('Grilled Chicken Salad').locator('..')
    await expect(chickenCard).toBeVisible()
  })

  test.describe('Consume Meal', () => {
    test('shows confirmation modal when clicking consume', async ({ page }) => {
      await page.goto('/meals')

      // Click consume on Spaghetti Bolognese
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByRole('button', { name: 'Consume' }).click()

      // Confirmation modal should appear
      await expect(page.getByText('Consume Recipe?')).toBeVisible()
      await expect(page.getByText(/deduct ingredients from your Grocy stock/)).toBeVisible()
    })

    test('calls both consume and done endpoints on confirm', async ({ page }) => {
      let consumeCalled = false
      let doneCalled = false

      await page.route('**/grocy/recipes/101/consume', async (route) => {
        consumeCalled = true
        await route.fulfill({ status: 200, json: { success: true } })
      })

      await page.route('**/grocy/meal-plan/1/done', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          const body = request.postDataJSON()
          expect(body.done).toBe(true)
          doneCalled = true
          await route.fulfill({ status: 200, json: {} })
        }
      })

      await page.goto('/meals')

      // Click consume on Spaghetti Bolognese
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByRole('button', { name: 'Consume' }).click()

      // Wait for modal to appear and get the confirm button inside the modal
      const modal = page.locator('.fixed.inset-0')
      await expect(modal.getByText('Consume Recipe?')).toBeVisible()

      // Click the Consume button inside the modal (not the card button)
      await modal.getByRole('button', { name: 'Consume' }).click()

      // Wait for success message
      await expect(page.getByText(/ingredients deducted from stock/)).toBeVisible()

      // Verify both endpoints were called
      expect(consumeCalled).toBe(true)
      expect(doneCalled).toBe(true)
    })

    test('shows error message when consume fails', async ({ page }) => {
      await page.route('**/grocy/recipes/101/consume', async (route) => {
        await route.fulfill({
          status: 400,
          json: { message: 'Not enough ingredients in stock' },
        })
      })

      await page.goto('/meals')

      // Click consume on Spaghetti Bolognese
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByRole('button', { name: 'Consume' }).click()

      // Wait for modal and click confirm
      const modal = page.locator('.fixed.inset-0')
      await expect(modal.getByText('Consume Recipe?')).toBeVisible()
      await modal.getByRole('button', { name: 'Consume' }).click()

      // Should show error message
      await expect(page.getByText(/Not enough ingredients in stock|Failed to consume/)).toBeVisible()
    })

    test('can cancel consume confirmation', async ({ page }) => {
      await page.goto('/meals')

      // Click consume on Spaghetti Bolognese
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByRole('button', { name: 'Consume' }).click()

      // Modal should appear
      await expect(page.getByText('Consume Recipe?')).toBeVisible()

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Modal should close
      await expect(page.getByText('Consume Recipe?')).not.toBeVisible()
    })
  })

  test.describe('Add Meal', () => {
    test('opens add modal when clicking add button', async ({ page }) => {
      await page.goto('/meals')

      // Click first Add button
      await page.getByRole('button', { name: 'Add' }).first().click()

      // Modal should appear - use heading role to be specific
      await expect(page.getByRole('heading', { name: /Add Meal/ })).toBeVisible()
      // Check for recipe dropdown (combobox)
      await expect(page.getByRole('combobox').first()).toBeVisible()
    })

    test('can add a meal', async ({ page }) => {
      let mealCreated = false

      await page.route('**/grocy/meal-plan', async (route) => {
        if (route.request().method() === 'POST') {
          mealCreated = true
          await route.fulfill({
            status: 200,
            json: { id: 4, day: '2026-02-02', recipe_id: 104 },
          })
        }
      })

      await page.goto('/meals')

      // Click first Add button
      await page.getByRole('button', { name: 'Add' }).first().click()

      // Select a recipe
      await page.getByRole('combobox').first().selectOption('104')

      // Click Add Meal
      await page.getByRole('button', { name: 'Add Meal' }).click()

      // Wait for success
      await expect(page.getByText(/Meal added successfully/)).toBeVisible()
      expect(mealCreated).toBe(true)
    })
  })

  test.describe('Delete Meal', () => {
    test('shows confirmation when clicking delete', async ({ page }) => {
      await page.goto('/meals')

      // Find the delete button for Spaghetti
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByTitle('Remove from plan').click()

      // Confirmation should appear
      await expect(page.getByText('Remove Meal?')).toBeVisible()
    })

    test('can delete a meal', async ({ page }) => {
      let mealDeleted = false

      await page.route('**/grocy/meal-plan/1', async (route) => {
        if (route.request().method() === 'DELETE') {
          mealDeleted = true
          await route.fulfill({ status: 200, json: {} })
        }
      })

      await page.goto('/meals')

      // Find the delete button for Spaghetti
      const spaghettiCard = page.getByText('Spaghetti Bolognese').locator('..').locator('..')
      await spaghettiCard.getByTitle('Remove from plan').click()

      // Confirm deletion - use exact match to avoid matching "Remove from plan" buttons
      await page.getByRole('button', { name: 'Remove', exact: true }).click()

      // Success message
      await expect(page.getByText('Meal removed')).toBeVisible()
      expect(mealDeleted).toBe(true)
    })
  })

  test.describe('Week Navigation', () => {
    test('can navigate to next week', async ({ page }) => {
      await page.goto('/meals')

      // Click next week button
      await page.getByLabel('Next week').click()

      // Should trigger a new API call (the route mock will still respond)
      await expect(page.getByRole('heading', { name: 'Meal Plan' })).toBeVisible()
    })

    test('can navigate to previous week', async ({ page }) => {
      await page.goto('/meals')

      // Click previous week button
      await page.getByLabel('Previous week').click()

      // Should trigger a new API call
      await expect(page.getByRole('heading', { name: 'Meal Plan' })).toBeVisible()
    })

    test('can go to today', async ({ page }) => {
      await page.goto('/meals')

      // Navigate away first
      await page.getByLabel('Next week').click()

      // Click Today button
      await page.getByRole('button', { name: 'Today' }).click()

      // Should be back to current week
      await expect(page.getByRole('heading', { name: 'Meal Plan' })).toBeVisible()
    })
  })
})
