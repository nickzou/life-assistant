import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from './ProtectedRoute'
import type { AuthContextType } from '../contexts/AuthContext'
import { AuthContext } from '../contexts/AuthContext'

// Mock TanStack Router's Navigate component
vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}))

function renderWithAuth(authValue: AuthContextType, children: React.ReactNode) {
  return render(
    <AuthContext.Provider value={authValue}>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthContext.Provider>
  )
}

const mockLogin = vi.fn()
const mockLogout = vi.fn()

describe('ProtectedRoute', () => {
  it('shows loading state when isLoading is true', () => {
    renderWithAuth(
      {
        user: null,
        isLoading: true,
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
      },
      <div>Protected Content</div>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderWithAuth(
      {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
      },
      <div>Protected Content</div>
    )

    const navigate = screen.getByTestId('navigate')
    expect(navigate).toBeInTheDocument()
    expect(navigate).toHaveAttribute('data-to', '/login')
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderWithAuth(
      {
        user: { id: '1', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
      },
      <div>Protected Content</div>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('renders multiple children when authenticated', () => {
    renderWithAuth(
      {
        user: { id: '1', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
      },
      <>
        <div>First Child</div>
        <div>Second Child</div>
      </>
    )

    expect(screen.getByText('First Child')).toBeInTheDocument()
    expect(screen.getByText('Second Child')).toBeInTheDocument()
  })

  it('prioritizes loading state over authentication check', () => {
    // Even if isAuthenticated is true, loading should take precedence
    renderWithAuth(
      {
        user: { id: '1', email: 'test@example.com' },
        isLoading: true,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
      },
      <div>Protected Content</div>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
