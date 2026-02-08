import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeFiltersProvider } from './HomeFiltersProvider'
import { useHomeFilters } from './HomeFiltersContext'

// Test component that uses the home filters context
function TestConsumer() {
  const { filter, showDone, setFilter, setShowDone } = useHomeFilters()

  return (
    <div>
      <div data-testid="filter">{filter}</div>
      <div data-testid="showDone">{showDone ? 'yes' : 'no'}</div>
      <button data-testid="set-work" onClick={() => setFilter('work')}>
        Set Work
      </button>
      <button data-testid="set-personal" onClick={() => setFilter('personal')}>
        Set Personal
      </button>
      <button data-testid="set-all" onClick={() => setFilter('all')}>
        Set All
      </button>
      <button data-testid="toggle-done" onClick={() => setShowDone(!showDone)}>
        Toggle Done
      </button>
    </div>
  )
}

describe('HomeFiltersProvider', () => {
  it('provides default filter values', () => {
    render(
      <HomeFiltersProvider>
        <TestConsumer />
      </HomeFiltersProvider>
    )

    expect(screen.getByTestId('filter')).toHaveTextContent('all')
    expect(screen.getByTestId('showDone')).toHaveTextContent('yes')
  })

  it('updates filter when setFilter is called', async () => {
    const user = userEvent.setup()

    render(
      <HomeFiltersProvider>
        <TestConsumer />
      </HomeFiltersProvider>
    )

    expect(screen.getByTestId('filter')).toHaveTextContent('all')

    await user.click(screen.getByTestId('set-work'))
    expect(screen.getByTestId('filter')).toHaveTextContent('work')

    await user.click(screen.getByTestId('set-personal'))
    expect(screen.getByTestId('filter')).toHaveTextContent('personal')

    await user.click(screen.getByTestId('set-all'))
    expect(screen.getByTestId('filter')).toHaveTextContent('all')
  })

  it('updates showDone when setShowDone is called', async () => {
    const user = userEvent.setup()

    render(
      <HomeFiltersProvider>
        <TestConsumer />
      </HomeFiltersProvider>
    )

    expect(screen.getByTestId('showDone')).toHaveTextContent('yes')

    await user.click(screen.getByTestId('toggle-done'))
    expect(screen.getByTestId('showDone')).toHaveTextContent('no')

    await user.click(screen.getByTestId('toggle-done'))
    expect(screen.getByTestId('showDone')).toHaveTextContent('yes')
  })

  it('throws error when useHomeFilters is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useHomeFilters must be used within a HomeFiltersProvider')

    consoleSpy.mockRestore()
  })
})
