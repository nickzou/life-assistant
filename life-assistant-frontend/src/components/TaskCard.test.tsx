import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard, type TaskItem } from './TaskCard'

const createTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: '1',
  name: 'Test Task',
  parentName: null,
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

describe('TaskCard', () => {
  it('renders task name', () => {
    render(<TaskCard task={createTask({ name: 'My Task' })} />)
    expect(screen.getByText('My Task')).toBeInTheDocument()
  })

  it('renders as a link to task URL', () => {
    render(<TaskCard task={createTask({ url: 'https://example.com/task/123' })} />)
    const link = screen.getByRole('link')
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

  it('renders due time when dueDate and hasDueTime are set', () => {
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

  it('does not render due time when hasDueTime is false', () => {
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

  it('does not render due time when dueDate is null', () => {
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
    const card = container.querySelector('a')
    expect(card).toHaveStyle({
      backgroundColor: '#3498db10',
      borderColor: '#3498db40',
    })
  })

  it('applies status color to status badge', () => {
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
})
