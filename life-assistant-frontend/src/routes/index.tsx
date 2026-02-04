import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { api } from '../lib/api'

interface TasksDueToday {
  total: number
  completed: number
  remaining: number
  overdue: number
  affirmativeCompletions: number
  completionRate: number
}

interface TaskItem {
  id: string
  name: string
  status: {
    status: string
    type: string
    color: string
  }
  dueDate: string | null
  tags: string[]
  timeOfDay: string | null
  url: string
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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

function TaskCard({ task }: { task: TaskItem }) {
  const isCompleted = task.status.type === 'done' || task.status.type === 'closed'

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block p-4 rounded-lg border transition-colors ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium ${
              isCompleted
                ? 'text-green-700 dark:text-green-300 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Status badge */}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: task.status.color + '20',
                color: task.status.color,
              }}
            >
              {task.status.status}
            </span>

            {/* Time of Day */}
            {task.timeOfDay && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {task.timeOfDay}
              </span>
            )}

            {/* Tags */}
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Due time */}
        {task.dueDate && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {new Date(task.dueDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </a>
  )
}
