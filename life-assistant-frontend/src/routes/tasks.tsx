import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { api } from '../lib/api'

interface LeaderboardItem {
  clickup_task_id: string
  reschedule_count: number
  task_name: string
  current_due_date: string | null
  tags: string[]
}

interface LeaderboardResponse {
  leaderboard: LeaderboardItem[]
  meta: {
    total_tasks: number
    total_tracked_changes: number
    min_reschedules: number
  }
}

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
})

function TasksPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get<LeaderboardResponse>('/task-insights/reschedule-leaderboard')
        setData(response.data)
      } catch {
        setError('Failed to fetch leaderboard')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Task Insights
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Track patterns in your task management
        </p>

        {loading && (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        )}

        {error && (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && data && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Reschedule Leaderboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Tasks that have been pushed {data.meta.min_reschedules}+ times
              </p>

              {data.leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No chronic procrastinators yet!
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Tasks will appear here once they've been rescheduled {data.meta.min_reschedules}+ times.
                  </p>
                  {data.meta.total_tracked_changes > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                      Tracking {data.meta.total_tracked_changes} due date changes so far
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                          Due
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                          Pushes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.leaderboard.map((item, index) => (
                        <tr key={item.clickup_task_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.task_name}
                            </div>
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                            {formatDate(item.current_due_date)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              {item.reschedule_count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Tracking started when this feature was deployed. Historical data is not available.
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
