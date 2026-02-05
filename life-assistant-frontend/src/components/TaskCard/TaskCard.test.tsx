import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard, type TaskItem } from '.'
import type { ClickUpStatus } from '../StatusDropdown'

const createTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: '1',
  name: 'Test Task',
  parentName: null,
  listId: 'list-123',
  status: {
    status: 'In Progress',
    type: 'active',
    color: '#3498db',
  },
  dueDate: null,
  hasDueTime: false,
  tags: [],
  timeOfDay: null,
  url: 'https://example.com/task/1',
  ...overrides,
})

const mockStatuses: ClickUpStatus[] = [
  { id: '1', status: 'To Do', type: 'open', color: '#95a5a6', orderindex: 0 },
  { id: '2', status: 'In Progress', type: 'active', color: '#3498db', orderindex: 1 },
  { id: '3', status: 'Done', type: 'done', color: '#27ae60', orderindex: 2 },
]

describe('TaskCard', () => {
  it('renders task name', () => {
    render(<TaskCard task={createTask({ name: 'My Task' })} />)
    expect(screen.getByText('My Task')).toBeInTheDocument()
  })

  it('renders external link button with correct href', () => {
    render(<TaskCard task={createTask({ url: 'https://example.com/task/123' })} />)
    const link = screen.getByTestId('external-link-button')
    expect(link).toHaveAttribute('href', 'https://example.com/task/123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders status badge', () => {
    render(
      <TaskCard
        task={createTask({
          status: { status: 'Done', type: 'done', color: '#00ff00' },
        })}
      />
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders parent name when provided', () => {
    render(<TaskCard task={createTask({ parentName: 'Parent Project' })} />)
    expect(screen.getByText('Parent Project')).toBeInTheDocument()
  })

  it('does not render parent name when null', () => {
    render(<TaskCard task={createTask({ parentName: null })} />)
    expect(screen.queryByText('Parent Project')).not.toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<TaskCard task={createTask({ tags: ['urgent', 'bug', 'frontend'] })} />)
    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('bug')).toBeInTheDocument()
    expect(screen.getByText('frontend')).toBeInTheDocument()
  })

  it('does not render tags section when empty', () => {
    const { container } = render(<TaskCard task={createTask({ tags: [] })} />)
    // Tags would be in a flex container with gap - check it doesn't exist
    expect(container.querySelectorAll('[class*="flex-wrap"]')).toHaveLength(0)
  })

  it('renders time of day badge when provided', () => {
    render(
      <TaskCard
        task={createTask({
          timeOfDay: { name: 'Morning', color: '#ffa500' },
        })}
      />
    )
    expect(screen.getByText('Morning')).toBeInTheDocument()
  })

  it('does not render time of day when null', () => {
    render(<TaskCard task={createTask({ timeOfDay: null })} />)
    expect(screen.queryByText('Morning')).not.toBeInTheDocument()
    expect(screen.queryByText('Evening')).not.toBeInTheDocument()
  })

  it('renders due time when dueDate and hasDueTime are set (without mutation handlers)', () => {
    render(
      <TaskCard
        task={createTask({
          dueDate: '2026-02-04T14:30:00',
          hasDueTime: true,
        })}
      />
    )
    // Time format may vary by locale, but should contain the hour
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
  })

  it('does not render due time when hasDueTime is false (without mutation handlers)', () => {
    render(
      <TaskCard
        task={createTask({
          dueDate: '2026-02-04T14:30:00',
          hasDueTime: false,
        })}
      />
    )
    // Should not show any time element
    expect(screen.queryByText(/\d{1,2}:\d{2}\s*(AM|PM)?/i)).not.toBeInTheDocument()
  })

  it('does not render due time when dueDate is null (without mutation handlers)', () => {
    render(
      <TaskCard
        task={createTask({
          dueDate: null,
          hasDueTime: true,
        })}
      />
    )
    expect(screen.queryByText(/\d{1,2}:\d{2}\s*(AM|PM)?/i)).not.toBeInTheDocument()
  })

  it('applies line-through styling for completed tasks (done type)', () => {
    render(
      <TaskCard
        task={createTask({
          name: 'Completed Task',
          status: { status: 'Done', type: 'done', color: '#00ff00' },
        })}
      />
    )
    const taskName = screen.getByText('Completed Task')
    expect(taskName).toHaveClass('line-through', 'opacity-70')
  })

  it('applies line-through styling for closed tasks', () => {
    render(
      <TaskCard
        task={createTask({
          name: 'Closed Task',
          status: { status: 'Closed', type: 'closed', color: '#888888' },
        })}
      />
    )
    const taskName = screen.getByText('Closed Task')
    expect(taskName).toHaveClass('line-through', 'opacity-70')
  })

  it('does not apply line-through for active tasks', () => {
    render(
      <TaskCard
        task={createTask({
          name: 'Active Task',
          status: { status: 'In Progress', type: 'active', color: '#3498db' },
        })}
      />
    )
    const taskName = screen.getByText('Active Task')
    expect(taskName).not.toHaveClass('line-through')
  })

  it('applies status color to card background and border', () => {
    const { container } = render(
      <TaskCard
        task={createTask({
          status: { status: 'In Progress', type: 'active', color: '#3498db' },
        })}
      />
    )
    const card = container.querySelector('[data-testid="task-card"]')
    expect(card).toHaveStyle({
      backgroundColor: '#3498db10',
      borderColor: '#3498db40',
    })
  })

  it('applies status color to status badge (when no dropdown)', () => {
    render(
      <TaskCard
        task={createTask({
          status: { status: 'Custom Status', type: 'active', color: '#ff5722' },
        })}
      />
    )
    const badge = screen.getByText('Custom Status')
    expect(badge).toHaveStyle({
      backgroundColor: '#ff572220',
      color: '#ff5722',
    })
  })

  it('applies time of day color to badge', () => {
    render(
      <TaskCard
        task={createTask({
          timeOfDay: { name: 'Evening', color: '#9b59b6' },
        })}
      />
    )
    const badge = screen.getByText('Evening')
    expect(badge).toHaveStyle({ backgroundColor: '#9b59b6' })
  })

  // New tests for mutation functionality

  describe('with status change handler', () => {
    it('renders status as dropdown when onStatusChange is provided', () => {
      const onStatusChange = vi.fn()
      render(
        <TaskCard
          task={createTask()}
          availableStatuses={mockStatuses}
          onStatusChange={onStatusChange}
        />
      )
      const dropdown = screen.getByTestId('status-dropdown-trigger')
      expect(dropdown).toBeInTheDocument()
      expect(dropdown).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('opens dropdown menu when status is clicked', () => {
      const onStatusChange = vi.fn()
      render(
        <TaskCard
          task={createTask()}
          availableStatuses={mockStatuses}
          onStatusChange={onStatusChange}
        />
      )

      const trigger = screen.getByTestId('status-dropdown-trigger')
      fireEvent.click(trigger)

      const menu = screen.getByTestId('status-dropdown-menu')
      expect(menu).toBeInTheDocument()
    })

    it('renders static badge when no onStatusChange provided', () => {
      render(
        <TaskCard
          task={createTask()}
          availableStatuses={mockStatuses}
        />
      )
      expect(screen.queryByTestId('status-dropdown-trigger')).not.toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('renders static badge when no availableStatuses provided', () => {
      const onStatusChange = vi.fn()
      render(
        <TaskCard
          task={createTask()}
          onStatusChange={onStatusChange}
        />
      )
      expect(screen.queryByTestId('status-dropdown-trigger')).not.toBeInTheDocument()
    })
  })

  describe('with due date change handler', () => {
    it('renders due date button when onDueDateChange is provided', () => {
      const onDueDateChange = vi.fn()
      render(
        <TaskCard
          task={createTask({ dueDate: '2026-02-04T00:00:00' })}
          onDueDateChange={onDueDateChange}
        />
      )
      const button = screen.getByTestId('due-date-button')
      expect(button).toBeInTheDocument()
    })

    it('shows "Set date" when no due date and onDueDateChange provided', () => {
      const onDueDateChange = vi.fn()
      render(
        <TaskCard
          task={createTask({ dueDate: null })}
          onDueDateChange={onDueDateChange}
        />
      )
      expect(screen.getByText('Set date')).toBeInTheDocument()
    })

    it('shows formatted date when due date exists', () => {
      const onDueDateChange = vi.fn()
      render(
        <TaskCard
          task={createTask({ dueDate: '2026-02-04T00:00:00', hasDueTime: false })}
          onDueDateChange={onDueDateChange}
        />
      )
      // Should show month and day
      expect(screen.getByText(/Feb 4|4 Feb/)).toBeInTheDocument()
    })

    it('calls onDueDateChange when due date button is clicked', () => {
      const onDueDateChange = vi.fn()
      const task = createTask({ dueDate: '2026-02-04T00:00:00' })
      render(
        <TaskCard
          task={task}
          onDueDateChange={onDueDateChange}
        />
      )

      const button = screen.getByTestId('due-date-button')
      fireEvent.click(button)

      expect(onDueDateChange).toHaveBeenCalledWith(task)
    })

    it('does not render due date button when onDueDateChange not provided', () => {
      render(
        <TaskCard
          task={createTask({ dueDate: null })}
        />
      )
      expect(screen.queryByTestId('due-date-button')).not.toBeInTheDocument()
      expect(screen.queryByText('Set date')).not.toBeInTheDocument()
    })
  })

  describe('external link button', () => {
    it('stops event propagation when clicked', () => {
      const onDueDateChange = vi.fn()
      render(
        <TaskCard
          task={createTask()}
          onDueDateChange={onDueDateChange}
        />
      )

      const link = screen.getByTestId('external-link-button')
      const clickEvent = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

      link.dispatchEvent(clickEvent)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })
  })
})
