import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageContainer } from '.'

describe('PageContainer', () => {
  it('renders children', () => {
    render(
      <PageContainer>
        <p>Test Content</p>
      </PageContainer>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <PageContainer>
        <p>First</p>
        <p>Second</p>
        <p>Third</p>
      </PageContainer>
    )

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  it('applies max-width and centering classes', () => {
    const { container } = render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('max-w-7xl', 'mx-auto')
  })
})
