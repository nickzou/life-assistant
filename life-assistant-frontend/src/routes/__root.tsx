import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/login'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = (
    <>
      <Link
        to="/"
        className="text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
        onClick={() => setMobileMenuOpen(false)}
      >
        Home
      </Link>
      {isAuthenticated && (
        <>
          <Link
            to="/stats"
            className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            onClick={() => setMobileMenuOpen(false)}
          >
            Stats
          </Link>
          <Link
            to="/meals"
            className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            onClick={() => setMobileMenuOpen(false)}
          >
            Meals
          </Link>
          <Link
            to="/shopping"
            className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            onClick={() => setMobileMenuOpen(false)}
          >
            Shopping
          </Link>
          <Link
            to="/webhooks"
            className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            onClick={() => setMobileMenuOpen(false)}
          >
            Webhooks
          </Link>
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isLoginPage && (
        <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile hamburger button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks}
            </div>

            {/* User info and logout */}
            {isAuthenticated && (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3">
              {navLinks}
              {isAuthenticated && (
                <span className="sm:hidden text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {user?.email}
                </span>
              )}
            </div>
          )}
        </nav>
      )}
      <main className={isLoginPage ? '' : 'p-4'}>
        <Outlet />
      </main>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
