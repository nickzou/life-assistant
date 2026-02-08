import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { AuthProvider } from './contexts/AuthProvider'
import { HomeFiltersProvider } from './contexts/HomeFiltersProvider'
import './index.css'

import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <HomeFiltersProvider>
        <RouterProvider router={router} />
      </HomeFiltersProvider>
    </AuthProvider>
  </StrictMode>,
)
