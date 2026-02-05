import { test, expect } from '@playwright/test'

const mockStatuses = [
  { id: '1', status: 'To Do', type: 'open', color: '#95a5a6', orderindex: 0 },
  { id: '2', status: 'In Progress', type: 'active', color: '#3498db', orderindex: 1 },
  { id: '3', status: 'Done', type: 'done', color: '#27ae60', orderindex: 2 },
  { id: '4', status: 'Did Not Complete', type: 'closed', color: '#e74c3c', orderindex: 3 },
]

const mockTasks = {
  tasks: [
    {
      id: '1',
      name: 'Complete project report',
      parentName: 'Project Alpha',
      listId: 'list-123',
      status: { status: 'In Progress', type: 'active', color: '#3498db' },
      dueDate: '2026-02-04T14:00:00',
      hasDueTime: true,
      tags: ['work'],
      timeOfDay: { name: 'Morning', color: '#ffa500' },
      url: 'https://app.clickup.com/task/1',
    },
    {
      id: '2',
      name: 'Buy groceries',
      parentName: null,
      listId: 'list-123',
      status: { status: 'To Do', type: 'open', color: '#95a5a6' },
      dueDate: null,
      hasDueTime: false,
      tags: [],
      timeOfDay: null,
      url: 'https://app.clickup.com/task/2',
    },
  ],
  overdueTasks: [],
}

const mockStats = {
  total: 2,
  completed: 0,
  remaining: 2,
  overdue: 0,
  affirmativeCompletions: 0,
  completionRate: 0,
}

test.describe('Task Mutations', () => {
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
      await route.fulfill({ status: 200, json: { statuses: mockStatuses } })
    })
  })

  test.describe('Status Dropdown', () => {
    test('can change task status via dropdown', async ({ page }) => {
      let updatedStatus = 'In Progress'

      await page.route('**/clickup/tasks/1', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          const body = request.postDataJSON()
          updatedStatus = body.status
          await route.fulfill({
            status: 200,
            json: { success: true, task: { ...mockTasks.tasks[0], status: { status: updatedStatus, type: 'done', color: '#27ae60' } } },
          })
        }
      })

      // Also update the tasks list response to reflect the change
      await page.route('**/clickup/tasks/today/list', async (route) => {
        const updatedTasks = {
          ...mockTasks,
          tasks: mockTasks.tasks.map((t) =>
            t.id === '1' ? { ...t, status: { status: updatedStatus, type: updatedStatus === 'Done' ? 'done' : 'active', color: updatedStatus === 'Done' ? '#27ae60' : '#3498db' } } : t
          ),
        }
        await route.fulfill({ status: 200, json: updatedTasks })
      })

      await page.goto('/')

      // Click on the status dropdown trigger for the first task
      const statusDropdown = page.getByTestId('status-dropdown-trigger').first()
      await expect(statusDropdown).toBeVisible()
      await statusDropdown.click()

      // Wait for dropdown menu to appear
      const menu = page.getByTestId('status-dropdown-menu')
      await expect(menu).toBeVisible()

      // Select "Done" status
      await page.getByRole('option', { name: /Done/ }).click()

      // Wait for success message
      await expect(page.getByText('Status updated')).toBeVisible()

      // Verify the PATCH request was made
      expect(updatedStatus).toBe('Done')
    })

    test('shows loading state while updating status', async ({ page }) => {
      await page.route('**/clickup/tasks/1', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          // Delay to see loading state
          await new Promise((r) => setTimeout(r, 500))
          await route.fulfill({
            status: 200,
            json: { success: true, task: mockTasks.tasks[0] },
          })
        }
      })

      await page.goto('/')

      const statusDropdown = page.getByTestId('status-dropdown-trigger').first()
      await statusDropdown.click()

      await page.getByRole('option', { name: /Done/ }).click()

      // Should show updating text
      await expect(page.getByText('Updating...')).toBeVisible()
    })

    test('shows error message on status update failure', async ({ page }) => {
      await page.route('**/clickup/tasks/1', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          await route.fulfill({
            status: 500,
            json: { message: 'Server error' },
          })
        }
      })

      await page.goto('/')

      const statusDropdown = page.getByTestId('status-dropdown-trigger').first()
      await statusDropdown.click()

      await page.getByRole('option', { name: /Done/ }).click()

      // Should show error message
      await expect(page.getByText('Failed to update status')).toBeVisible()
    })

    test('dropdown closes when clicking outside', async ({ page }) => {
      await page.goto('/')

      const statusDropdown = page.getByTestId('status-dropdown-trigger').first()
      await statusDropdown.click()

      await expect(page.getByTestId('status-dropdown-menu')).toBeVisible()

      // Click outside the dropdown
      await page.getByText('Life Assistant').click()

      await expect(page.getByTestId('status-dropdown-menu')).not.toBeVisible()
    })
  })

  test.describe('Due Date Modal', () => {
    test('can change due date via modal', async ({ page }) => {
      let updatedDueDate: number | null = null

      await page.route('**/clickup/tasks/2', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          const body = request.postDataJSON()
          updatedDueDate = body.due_date
          await route.fulfill({
            status: 200,
            json: { success: true, task: { ...mockTasks.tasks[1], due_date: updatedDueDate } },
          })
        }
      })

      await page.goto('/')

      // Click on the due date button for the second task (which has no due date)
      const dueDateButton = page.getByTestId('due-date-button').nth(1)
      await expect(dueDateButton).toBeVisible()
      await dueDateButton.click()

      // Wait for modal to appear
      const modal = page.getByTestId('due-date-modal')
      await expect(modal).toBeVisible()

      // Set a date
      const dateInput = page.getByTestId('due-date-input')
      await dateInput.fill('2026-02-15')

      // Save
      await page.getByTestId('due-date-save').click()

      // Wait for success message
      await expect(page.getByText('Due date updated')).toBeVisible()

      // Verify a due date was set
      expect(updatedDueDate).not.toBeNull()
    })

    test('can clear due date via modal', async ({ page }) => {
      let updatedDueDate: number | null = 12345

      await page.route('**/clickup/tasks/1', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          const body = request.postDataJSON()
          updatedDueDate = body.due_date
          await route.fulfill({
            status: 200,
            json: { success: true, task: { ...mockTasks.tasks[0], due_date: null } },
          })
        }
      })

      await page.goto('/')

      // Click on the due date button for the first task (which has a due date)
      const dueDateButton = page.getByTestId('due-date-button').first()
      await dueDateButton.click()

      // Wait for modal to appear
      await expect(page.getByTestId('due-date-modal')).toBeVisible()

      // Click Clear button
      await page.getByTestId('due-date-clear').click()

      // Wait for success message
      await expect(page.getByText('Due date updated')).toBeVisible()

      // Verify the due date was cleared
      expect(updatedDueDate).toBeNull()
    })

    test('modal closes when Cancel is clicked', async ({ page }) => {
      await page.goto('/')

      const dueDateButton = page.getByTestId('due-date-button').first()
      await dueDateButton.click()

      await expect(page.getByTestId('due-date-modal')).toBeVisible()

      await page.getByTestId('due-date-cancel').click()

      await expect(page.getByTestId('due-date-modal')).not.toBeVisible()
    })

    test('modal closes when clicking backdrop', async ({ page }) => {
      await page.goto('/')

      const dueDateButton = page.getByTestId('due-date-button').first()
      await dueDateButton.click()

      const modal = page.getByTestId('due-date-modal')
      await expect(modal).toBeVisible()

      // Click on the backdrop (the modal overlay itself, not the content)
      await modal.click({ position: { x: 10, y: 10 } })

      await expect(page.getByTestId('due-date-modal')).not.toBeVisible()
    })

    test('shows error message on due date update failure', async ({ page }) => {
      await page.route('**/clickup/tasks/1', async (route) => {
        const request = route.request()
        if (request.method() === 'PATCH') {
          await route.fulfill({
            status: 500,
            json: { message: 'Server error' },
          })
        }
      })

      await page.goto('/')

      const dueDateButton = page.getByTestId('due-date-button').first()
      await dueDateButton.click()

      await page.getByTestId('due-date-input').fill('2026-02-15')
      await page.getByTestId('due-date-save').click()

      // Should show error message
      await expect(page.getByText('Failed to update due date')).toBeVisible()
    })
  })

  test.describe('External Link Button', () => {
    test('external link button opens ClickUp URL', async ({ page }) => {
      await page.goto('/')

      const externalLink = page.getByTestId('external-link-button').first()
      await expect(externalLink).toHaveAttribute('href', 'https://app.clickup.com/task/1')
      await expect(externalLink).toHaveAttribute('target', '_blank')
    })
  })

  test.describe('Integration', () => {
    test('task card shows all interactive elements', async ({ page }) => {
      await page.goto('/')

      // First task should have:
      // - External link button
      const externalLink = page.getByTestId('external-link-button').first()
      await expect(externalLink).toBeVisible()

      // - Status dropdown
      const statusDropdown = page.getByTestId('status-dropdown-trigger').first()
      await expect(statusDropdown).toBeVisible()
      await expect(statusDropdown).toHaveText(/In Progress/)

      // - Due date button
      const dueDateButton = page.getByTestId('due-date-button').first()
      await expect(dueDateButton).toBeVisible()
    })

    test('task without due date shows "Set date" button', async ({ page }) => {
      await page.goto('/')

      // Second task has no due date
      const dueDateButton = page.getByTestId('due-date-button').nth(1)
      await expect(dueDateButton).toHaveText(/Set date/)
    })
  })
})
