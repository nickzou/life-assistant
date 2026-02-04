import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DueDateModal } from './DueDateModal'

describe('DueDateModal', () => {
  let onSave: ReturnType<typeof vi.fn>
  let onClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined)
    onClose = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(
      <DueDateModal
        isOpen={false}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.queryByTestId('due-date-modal')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('due-date-modal')).toBeInTheDocument()
    expect(screen.getByText('Set Due Date')).toBeInTheDocument()
    expect(screen.getByText('Test Task')).toBeInTheDocument()
  })

  it('shows current due date in input when provided', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input') as HTMLInputElement
    expect(input.value).toBe('2026-02-15')
  })

  it('shows empty input when no current due date', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input') as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByTestId('due-date-cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSave with timestamp when Save button is clicked', async () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input')
    fireEvent.change(input, { target: { value: '2026-02-20' } })

    fireEvent.click(screen.getByTestId('due-date-save'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.any(Number))
    })

    // Verify the date is close to what we expect (end of day Feb 20)
    const calledWith = onSave.mock.calls[0][0] as number
    const date = new Date(calledWith)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(1) // February is month 1
    expect(date.getDate()).toBe(20)
  })

  it('calls onSave with null when saving with empty date', async () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input')
    fireEvent.change(input, { target: { value: '' } })

    fireEvent.click(screen.getByTestId('due-date-save'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null)
    })
  })

  it('shows Clear button when currentDueDate exists', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('due-date-clear')).toBeInTheDocument()
  })

  it('does not show Clear button when no currentDueDate', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.queryByTestId('due-date-clear')).not.toBeInTheDocument()
  })

  it('calls onSave with null when Clear button is clicked', async () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByTestId('due-date-clear'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null)
    })
  })

  it('closes modal after successful save', async () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input')
    fireEvent.change(input, { target: { value: '2026-02-20' } })

    fireEvent.click(screen.getByTestId('due-date-save'))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows saving state while save is in progress', async () => {
    const slowSave = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={slowSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input')
    fireEvent.change(input, { target: { value: '2026-02-20' } })

    fireEvent.click(screen.getByTestId('due-date-save'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    })
  })

  it('disables buttons while saving', async () => {
    const slowSave = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={slowSave}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByTestId('due-date-save'))

    await waitFor(() => {
      expect(screen.getByTestId('due-date-cancel')).toBeDisabled()
      expect(screen.getByTestId('due-date-clear')).toBeDisabled()
      expect(screen.getByTestId('due-date-save')).toBeDisabled()
    })
  })

  it('closes modal when clicking backdrop', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const backdrop = screen.getByTestId('due-date-modal')
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when clicking modal content', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const modalContent = screen.getByText('Set Due Date').closest('div')
    if (modalContent) {
      fireEvent.click(modalContent)
    }

    // onClose should not be called when clicking inside the modal
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes modal when Escape key is pressed', () => {
    render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate={null}
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.keyDown(screen.getByTestId('due-date-modal'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('resets date when modal reopens with different due date', () => {
    const { rerender } = render(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    const input = screen.getByTestId('due-date-input') as HTMLInputElement
    expect(input.value).toBe('2026-02-15')

    // Close and reopen with different date
    rerender(
      <DueDateModal
        isOpen={false}
        taskName="Test Task"
        currentDueDate="2026-02-15T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    rerender(
      <DueDateModal
        isOpen={true}
        taskName="Test Task"
        currentDueDate="2026-03-20T12:00:00"
        onSave={onSave}
        onClose={onClose}
      />
    )

    const newInput = screen.getByTestId('due-date-input') as HTMLInputElement
    expect(newInput.value).toBe('2026-03-20')
  })
})
