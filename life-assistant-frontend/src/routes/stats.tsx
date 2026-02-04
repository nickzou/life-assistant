import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { PageContainer } from '../components/PageContainer'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DayStats {
  date: string
  total: number
  affirmativeCompletions: number
  completionRate: number
}

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

function StatsPage() {
  const [stats, setStats] = useState<DayStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get<DayStats[]>('/clickup/tasks/stats/5')
        setStats(response.data)
      } catch {
        setError('Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Use local date parts to avoid UTC conversion issues
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    if (dateStr === todayStr) {
      return 'Today'
    }
    if (dateStr === yesterdayStr) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <ProtectedRoute>
      <PageContainer>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Completion Stats
        </h1>

        {loading && (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        )}

        {error && (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Completion Rate Trend
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={[...stats].reverse().map(day => ({
                  ...day,
                  label: formatDate(day.date)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="label"
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#F9FAFB'
                    }}
                    formatter={(value) => [`${value}%`, 'Completion Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.map((day) => (
                  <tr key={day.date}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(day.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 dark:text-green-400">
                      {day.affirmativeCompletions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">
                      {day.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {day.completionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </PageContainer>
    </ProtectedRoute>
  )
}
