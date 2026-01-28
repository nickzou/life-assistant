import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useAuth } from '../contexts/AuthContext'

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/login'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isLoginPage && (
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/stats" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                  Stats
                </Link>
                <Link to="/meals" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                  Meals
                </Link>
                <Link to="/webhooks" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                  Webhooks
                </Link>
              </>
            )}
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      )}
      <main className={isLoginPage ? '' : 'p-4'}>
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
