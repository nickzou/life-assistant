import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddTaskForm } from '.'
import { api } from '@lib/api'

vi.mock('@lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockStatuses = [
  { id: '1', status: 'to do', type: 'open', color: '#87909e', orderindex: 0 },
  { id: '2', status: 'in progress', type: 'custom', color: '#5f55ee', orderindex: 1 },
  { id: '3', status: 'complete', type: 'closed', color: '#008844', orderindex: 2 },
]

const mockPersonalListResponse = {
  data: {
    id: '901708770035',
    name: 'Personal List',
    statuses: mockStatuses,
  },
}

describe('AddTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(mockPersonalListResponse)
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, task: { id: '123' } } })
  })

  it('renders collapsed state with Add Task button', () => {
    render(<AddTaskForm />)
    expect(screen.getByText('Add Task')).toBeInTheDocument()
  })

  it('expands form when Add Task button is clicked', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })
    expect(screen.getByText('Due Date')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
  })

  it('fetches statuses when expanded', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/clickup/personal-list')
    })
  })

  it('populates status dropdown with fetched statuses', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })

    // Check that status options are present
    expect(screen.getByRole('option', { name: 'to do' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'in progress' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'complete' })).toBeInTheDocument()
  })

  it('sets default status to first non-closed status', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('to do')
    })
  })

  it('collapses form when Cancel is clicked', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.getByText('Add Task')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Task name')).not.toBeInTheDocument()
  })

  it('submits task with name only', async () => {
    const onTaskCreated = vi.fn()
    render(<AddTaskForm onTaskCreated={onTaskCreated} />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'My new task' },
    })

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/clickup/tasks', {
        name: 'My new task',
        status: 'to do',
      })
    })

    expect(onTaskCreated).toHaveBeenCalled()
  })

  it('submits task with all fields', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })

    // Fill in name
    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Complete task' },
    })

    // Set due date
    const dueDateInput = document.querySelector('input[type="date"]')
    fireEvent.change(dueDateInput!, {
      target: { value: '2026-03-15' },
    })

    // Change status
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'in progress' },
    })

    // Add a tag
    fireEvent.change(screen.getByPlaceholderText('Add tag...'), {
      target: { value: 'urgent' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/clickup/tasks', {
        name: 'Complete task',
        due_date: expect.any(Number),
        status: 'in progress',
        tags: ['urgent'],
      })
    })
  })

  it('adds tags when pressing Enter', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument()
    })

    const tagInput = screen.getByPlaceholderText('Add tag...')
    fireEvent.change(tagInput, { target: { value: 'work' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('removes tags when X is clicked', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument()
    })

    // Add a tag
    fireEvent.change(screen.getByPlaceholderText('Add tag...'), {
      target: { value: 'removeme' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('removeme')).toBeInTheDocument()

    // Remove the tag - find the X button within the tag
    const tagElement = screen.getByText('removeme').parentElement
    const removeButton = tagElement?.querySelector('button')
    fireEvent.click(removeButton!)

    expect(screen.queryByText('removeme')).not.toBeInTheDocument()
  })

  it('does not add duplicate tags', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument()
    })

    const tagInput = screen.getByPlaceholderText('Add tag...')

    // Add same tag twice
    fireEvent.change(tagInput, { target: { value: 'duplicate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    fireEvent.change(tagInput, { target: { value: 'duplicate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    // Should only appear once
    expect(screen.getAllByText('duplicate')).toHaveLength(1)
  })

  it('disables Create Task button when name is empty', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByText('Create Task')).toBeInTheDocument()
    })

    expect(screen.getByText('Create Task')).toBeDisabled()
  })

  it('enables Create Task button when name is entered', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Test' },
    })

    expect(screen.getByText('Create Task')).not.toBeDisabled()
  })

  it('shows error message when API fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('API Error'))

    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Failing task' },
    })

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      expect(screen.getByText('Failed to create task')).toBeInTheDocument()
    })
  })

  it('shows error when fetching statuses fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'))

    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByText('Failed to load statuses')).toBeInTheDocument()
    })
  })

  it('resets form after successful submission', async () => {
    render(<AddTaskForm />)

    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Task name')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Task name'), {
      target: { value: 'Task to reset' },
    })

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      // Form should collapse back to Add Task button
      expect(screen.getByText('Add Task')).toBeInTheDocument()
    })

    // Expand again and check fields are empty
    fireEvent.click(screen.getByText('Add Task'))

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Task name') as HTMLInputElement
      expect(nameInput.value).toBe('')
    })
  })
})
