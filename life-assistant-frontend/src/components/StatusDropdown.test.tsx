import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StatusDropdown, type ClickUpStatus } from './StatusDropdown'

const mockStatuses: ClickUpStatus[] = [
  { id: '1', status: 'To Do', type: 'open', color: '#95a5a6', orderindex: 0 },
  { id: '2', status: 'In Progress', type: 'active', color: '#3498db', orderindex: 1 },
  { id: '3', status: 'Done', type: 'done', color: '#27ae60', orderindex: 2 },
]

const currentStatus = {
  status: 'In Progress',
  type: 'active',
  color: '#3498db',
}

describe('StatusDropdown', () => {
  let onStatusChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onStatusChange = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders current status', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    const trigger = screen.getByTestId('status-dropdown-trigger')
    fireEvent.click(trigger)

    expect(screen.getByTestId('status-dropdown-menu')).toBeInTheDocument()
  })

  it('closes dropdown when clicked again', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    const trigger = screen.getByTestId('status-dropdown-trigger')
    fireEvent.click(trigger)
    expect(screen.getByTestId('status-dropdown-menu')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.queryByTestId('status-dropdown-menu')).not.toBeInTheDocument()
  })

  it('renders all available status options', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))

    expect(screen.getByRole('option', { name: /To Do/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /In Progress/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Done/ })).toBeInTheDocument()
  })

  it('shows checkmark for current status', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))

    const inProgressOption = screen.getByRole('option', { name: /In Progress/ })
    expect(inProgressOption).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onStatusChange with correct status when option selected', async () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    fireEvent.click(screen.getByRole('option', { name: /Done/ }))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('Done')
    })
  })

  it('does not call onStatusChange when selecting current status', async () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    fireEvent.click(screen.getByRole('option', { name: /In Progress/ }))

    expect(onStatusChange).not.toHaveBeenCalled()
  })

  it('shows loading state while updating', async () => {
    const slowStatusChange = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={slowStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    fireEvent.click(screen.getByRole('option', { name: /Done/ }))

    await waitFor(() => {
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    })
  })

  it('closes dropdown after successful status change', async () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    fireEvent.click(screen.getByRole('option', { name: /Done/ }))

    await waitFor(() => {
      expect(screen.queryByTestId('status-dropdown-menu')).not.toBeInTheDocument()
    })
  })

  it('handles failed status change gracefully', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failingStatusChange = vi.fn().mockRejectedValue(new Error('Failed'))

    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={failingStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    fireEvent.click(screen.getByRole('option', { name: /Done/ }))

    // Wait for the promise to reject and loading to clear
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
        disabled
      />
    )

    const trigger = screen.getByTestId('status-dropdown-trigger')
    expect(trigger).toBeDisabled()

    fireEvent.click(trigger)
    expect(screen.queryByTestId('status-dropdown-menu')).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <StatusDropdown
          currentStatus={currentStatus}
          availableStatuses={mockStatuses}
          onStatusChange={onStatusChange}
        />
      </div>
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))
    expect(screen.getByTestId('status-dropdown-menu')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('status-dropdown-menu')).not.toBeInTheDocument()
  })

  it('closes dropdown when Escape key is pressed', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    const trigger = screen.getByTestId('status-dropdown-trigger')
    fireEvent.click(trigger)
    expect(screen.getByTestId('status-dropdown-menu')).toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByTestId('status-dropdown-menu')).not.toBeInTheDocument()
  })

  it('opens dropdown when Enter key is pressed', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    const trigger = screen.getByTestId('status-dropdown-trigger')
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(screen.getByTestId('status-dropdown-menu')).toBeInTheDocument()
  })

  it('applies status colors to options', () => {
    render(
      <StatusDropdown
        currentStatus={currentStatus}
        availableStatuses={mockStatuses}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByTestId('status-dropdown-trigger'))

    // Check that the "Done" option text has the correct color
    const doneOptionText = screen.getByText('Done')
    expect(doneOptionText).toHaveStyle({ color: '#27ae60' })
  })
})
