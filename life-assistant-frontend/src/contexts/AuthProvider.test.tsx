import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../lib/api'

// Test component that uses the auth context
function TestConsumer() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth()

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login({ email: 'test@example.com', password: 'password' })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

const server = setupServer()

describe('AuthProvider', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' })
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
    server.close()
    localStorage.clear()
  })

  it('provides unauthenticated state when no token exists', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Should not show loading since no token exists
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('validates existing token on mount', async () => {
    localStorage.setItem('auth_token', 'valid-token')

    server.use(
      http.get(`${API_BASE_URL}/auth/me`, () => {
        return HttpResponse.json({ id: '1', email: 'user@example.com' })
      })
    )

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Should show loading while validating
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    expect(screen.getByTestId('user')).toHaveTextContent('user@example.com')
  })

  it('clears invalid token on mount', async () => {
    localStorage.setItem('auth_token', 'invalid-token')

    server.use(
      http.get(`${API_BASE_URL}/auth/me`, () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      })
    )

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()

    server.use(
      http.post(`${API_BASE_URL}/auth/login`, () => {
        return HttpResponse.json({
          access_token: 'new-token',
          user: { id: '1', email: 'test@example.com' },
        })
      })
    )

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')

    await user.click(screen.getByTestId('login-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    })

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    expect(localStorage.getItem('auth_token')).toBe('new-token')
  })

  it('handles logout', async () => {
    const user = userEvent.setup()

    localStorage.setItem('auth_token', 'valid-token')

    server.use(
      http.get(`${API_BASE_URL}/auth/me`, () => {
        return HttpResponse.json({ id: '1', email: 'user@example.com' })
      })
    )

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    })

    await user.click(screen.getByTestId('logout-btn'))

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})
