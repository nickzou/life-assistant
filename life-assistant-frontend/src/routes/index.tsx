import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TaskCard, type TaskItem } from '../components/TaskCard'
import { api } from '../lib/api'

interface TasksDueToday {
  total: number
  completed: number
  remaining: number
  overdue: number
  affirmativeCompletions: number
  completionRate: number
}

interface TasksListResponse {
  tasks: TaskItem[]
  overdueTasks: TaskItem[]
}

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [stats, setStats] = useState<TasksDueToday | null>(null)
  const [tasksList, setTasksList] = useState<TasksListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, tasksResponse] = await Promise.all([
          api.get<TasksDueToday>('/clickup/tasks/today'),
          api.get<TasksListResponse>('/clickup/tasks/today/list'),
        ])
        setStats(statsResponse.data)
        setTasksList(tasksResponse.data)
      } catch {
        setError('Failed to fetch tasks')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Life Assistant</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 mb-8">Welcome to Life Assistant</p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tasks Due Today
          </h2>

          {loading && (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          )}

          {stats && (
            <>
              <div className="mb-6 text-center">
                <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                  {stats.completionRate}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completion Rate ({stats.affirmativeCompletions}/{stats.total} tasks)
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Due Today</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.affirmativeCompletions}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.remaining}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Task List */}
        {tasksList && (
          <div className="mt-8 space-y-6">
            {/* Overdue Tasks */}
            {tasksList.overdueTasks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
                  Overdue ({tasksList.overdueTasks.length})
                </h2>
                <div className="space-y-3">
                  {tasksList.overdueTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Tasks */}
            {tasksList.tasks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Today's Tasks ({tasksList.tasks.length})
                </h2>
                <div className="space-y-3">
                  {tasksList.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
