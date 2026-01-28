import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

function StatsPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Completion Stats
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Historical completion rates coming soon.
        </p>
      </div>
    </ProtectedRoute>
  )
}
