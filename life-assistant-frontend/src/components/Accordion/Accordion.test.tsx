import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Accordion } from '.'

describe('Accordion', () => {
  it('renders title', () => {
    render(
      <Accordion title="Test Title">
        <p>Content</p>
      </Accordion>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders children when expanded by default', () => {
    render(
      <Accordion title="Test">
        <p>Child Content</p>
      </Accordion>
    )

    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('hides children when defaultExpanded is false', () => {
    render(
      <Accordion title="Test" defaultExpanded={false}>
        <p>Child Content</p>
      </Accordion>
    )

    expect(screen.queryByText('Child Content')).not.toBeInTheDocument()
  })

  it('toggles content visibility on click', async () => {
    const user = userEvent.setup()
    render(
      <Accordion title="Test">
        <p>Content</p>
      </Accordion>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('−')).toBeInTheDocument()

    await user.click(screen.getByRole('button'))

    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('expands collapsed content on click', async () => {
    const user = userEvent.setup()
    render(
      <Accordion title="Test" defaultExpanded={false}>
        <p>Content</p>
      </Accordion>
    )

    expect(screen.queryByText('Content')).not.toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('−')).toBeInTheDocument()
  })

  it('shows count in title when provided', () => {
    render(
      <Accordion title="Tasks" count={5}>
        <p>Content</p>
      </Accordion>
    )

    expect(screen.getByText('Tasks (5)')).toBeInTheDocument()
  })

  it('shows zero count', () => {
    render(
      <Accordion title="Tasks" count={0}>
        <p>Content</p>
      </Accordion>
    )

    expect(screen.getByText('Tasks (0)')).toBeInTheDocument()
  })

  it('does not show count when not provided', () => {
    render(
      <Accordion title="Tasks">
        <p>Content</p>
      </Accordion>
    )

    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.queryByText(/Tasks \(/)).not.toBeInTheDocument()
  })

  it('applies custom titleClassName', () => {
    render(
      <Accordion title="Test" titleClassName="custom-class text-red-500">
        <p>Content</p>
      </Accordion>
    )

    const title = screen.getByText('Test')
    expect(title).toHaveClass('custom-class', 'text-red-500')
  })
})
