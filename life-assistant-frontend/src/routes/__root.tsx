import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const initial = user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              to="/automations"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Automations
            </Link>
            <Link
              to="/webhooks"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Webhooks
            </Link>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 py-1">
            <button
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/login'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const primaryLinks = (
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
              {primaryLinks}
            </div>

            {/* User avatar menu */}
            {isAuthenticated && (
              <div className="hidden md:block">
                <UserMenu />
              </div>
            )}
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3">
              {primaryLinks}
              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
                    <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                      Developer
                    </span>
                  </div>
                  <Link
                    to="/automations"
                    className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Automations
                  </Link>
                  <Link
                    to="/webhooks"
                    className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Webhooks
                  </Link>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user?.email}
                    </span>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        logout()
                      }}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      Logout
                    </button>
                  </div>
                </>
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
