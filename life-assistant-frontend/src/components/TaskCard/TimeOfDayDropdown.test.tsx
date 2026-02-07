import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimeOfDayDropdown } from './TimeOfDayDropdown'

describe('TimeOfDayDropdown', () => {
  describe('rendering', () => {
    it('renders "Set time" when no current value', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      expect(screen.getByText('Set time')).toBeInTheDocument()
    })

    it('renders current value when set', () => {
      render(
        <TimeOfDayDropdown
          current={{ name: 'morning', color: '#F59E0B' }}
          onTimeOfDayChange={vi.fn()}
        />
      )
      expect(screen.getByText('morning')).toBeInTheDocument()
    })

    it('applies current color as background', () => {
      render(
        <TimeOfDayDropdown
          current={{ name: 'morning', color: '#F59E0B' }}
          onTimeOfDayChange={vi.fn()}
        />
      )
      const trigger = screen.getByTestId('time-of-day-dropdown-trigger')
      expect(trigger).toHaveStyle({ backgroundColor: '#F59E0B' })
    })

    it('applies fallback color when no current value', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      const trigger = screen.getByTestId('time-of-day-dropdown-trigger')
      expect(trigger).toHaveStyle({ backgroundColor: '#9CA3AF' })
    })

    it('does not show dropdown menu initially', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      expect(screen.queryByTestId('time-of-day-dropdown-menu')).not.toBeInTheDocument()
    })
  })

  describe('opening and closing', () => {
    it('opens dropdown when trigger is clicked', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      expect(screen.getByTestId('time-of-day-dropdown-menu')).toBeInTheDocument()
    })

    it('shows all 5 time-of-day options', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))

      expect(screen.getByText('early morning')).toBeInTheDocument()
      expect(screen.getByText('morning')).toBeInTheDocument()
      expect(screen.getByText('mid day')).toBeInTheDocument()
      expect(screen.getByText('evening')).toBeInTheDocument()
      expect(screen.getByText('before bed')).toBeInTheDocument()
    })

    it('closes dropdown when trigger is clicked again', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      const trigger = screen.getByTestId('time-of-day-dropdown-trigger')
      fireEvent.click(trigger)
      expect(screen.getByTestId('time-of-day-dropdown-menu')).toBeInTheDocument()

      fireEvent.click(trigger)
      expect(screen.queryByTestId('time-of-day-dropdown-menu')).not.toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
        </div>
      )
      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      expect(screen.getByTestId('time-of-day-dropdown-menu')).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByTestId('outside'))
      expect(screen.queryByTestId('time-of-day-dropdown-menu')).not.toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('calls onTimeOfDayChange with selected value', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined)
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={onChange} />
      )

      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      fireEvent.click(screen.getByText('morning'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('morning')
      })
    })

    it('closes dropdown after successful selection', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined)
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={onChange} />
      )

      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      fireEvent.click(screen.getByText('evening'))

      await waitFor(() => {
        expect(screen.queryByTestId('time-of-day-dropdown-menu')).not.toBeInTheDocument()
      })
    })

    it('does not call handler when selecting the current value', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined)
      render(
        <TimeOfDayDropdown
          current={{ name: 'morning', color: '#F59E0B' }}
          onTimeOfDayChange={onChange}
        />
      )

      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      // "morning" appears in both trigger and menu, and "early morning" also matches
      // Use aria-selected to find the currently selected option
      const selectedOption = screen.getByRole('option', { selected: true })
      fireEvent.click(selectedOption)

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('clear option', () => {
    it('shows clear button when value is set', () => {
      render(
        <TimeOfDayDropdown
          current={{ name: 'morning', color: '#F59E0B' }}
          onTimeOfDayChange={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('does not show clear button when no value is set', () => {
      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={vi.fn()} />
      )
      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      expect(screen.queryByText('Clear')).not.toBeInTheDocument()
    })

    it('calls onTimeOfDayChange with null when clear is clicked', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined)
      render(
        <TimeOfDayDropdown
          current={{ name: 'morning', color: '#F59E0B' }}
          onTimeOfDayChange={onChange}
        />
      )

      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      fireEvent.click(screen.getByText('Clear'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('loading state', () => {
    it('disables trigger while updating', async () => {
      // Create a promise that won't resolve immediately
      let resolveChange: () => void
      const onChange = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveChange = resolve })
      )

      render(
        <TimeOfDayDropdown current={null} onTimeOfDayChange={onChange} />
      )

      fireEvent.click(screen.getByTestId('time-of-day-dropdown-trigger'))
      fireEvent.click(screen.getByText('morning'))

      // Trigger should be disabled while updating
      const trigger = screen.getByTestId('time-of-day-dropdown-trigger')
      expect(trigger).toBeDisabled()

      // Resolve the promise
      resolveChange!()
      await waitFor(() => {
        expect(trigger).not.toBeDisabled()
      })
    })
  })
})
