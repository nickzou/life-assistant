import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { api } from '../lib/api'

interface TasksDueToday {
  total: number
  completed: number
  remaining: number
  overdue: number
}

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [tasks, setTasks] = useState<TasksDueToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get<TasksDueToday>('/clickup/tasks/today')
        setTasks(response.data)
      } catch {
        setError('Failed to fetch tasks')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Life Assistant</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 mb-8">Welcome to Life Assistant</p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tasks Due Today
          </h2>

          {loading && (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          )}

          {tasks && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{tasks.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due Today</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{tasks.completed}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{tasks.remaining}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{tasks.overdue}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
