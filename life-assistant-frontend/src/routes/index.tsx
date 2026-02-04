import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { PageContainer } from '../components/PageContainer'
import { Accordion } from '../components/Accordion'
import { TaskCard, type TaskItem } from '../components/TaskCard'
import { DueDateModal } from '../components/DueDateModal'
import type { ClickUpStatus } from '../components/StatusDropdown'
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

interface StatusesResponse {
  statuses: ClickUpStatus[]
}

export const Route = createFileRoute('/')({
  component: Index,
})

type TaskFilter = 'all' | 'work' | 'personal'

function Index() {
  const [stats, setStats] = useState<TasksDueToday | null>(null)
  const [tasksList, setTasksList] = useState<TasksListResponse | null>(null)
  const [availableStatuses, setAvailableStatuses] = useState<ClickUpStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dueDateModalTask, setDueDateModalTask] = useState<TaskItem | null>(null)

  const fetchData = useCallback(async () => {
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
  }, [])

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await api.get<StatusesResponse>('/clickup/statuses')
      setAvailableStatuses(response.data.statuses)
    } catch {
      // Statuses are optional - don't show error if this fails
      console.error('Failed to fetch statuses')
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchStatuses()
  }, [fetchData, fetchStatuses])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setError(null)
    try {
      await api.patch(`/clickup/tasks/${taskId}`, { status: newStatus })
      setSuccessMessage('Status updated')
      // Refetch data to update the UI
      await fetchData()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      setError('Failed to update status')
      throw new Error('Failed to update status') // Re-throw so dropdown knows it failed
    }
  }

  const handleDueDateChange = (task: TaskItem) => {
    setDueDateModalTask(task)
  }

  const handleDueDateSave = async (dueDate: number | null) => {
    if (!dueDateModalTask) return
    setError(null)
    try {
      await api.patch(`/clickup/tasks/${dueDateModalTask.id}`, { due_date: dueDate })
      setSuccessMessage('Due date updated')
      // Refetch data to update the UI
      await fetchData()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      setError('Failed to update due date')
      throw new Error('Failed to update due date')
    }
  }

  const filterTasks = (tasks: TaskItem[]): TaskItem[] => {
    if (filter === 'all') return tasks
    const isWork = (task: TaskItem) => task.tags.some(tag => tag.toLowerCase() === 'work')
    return filter === 'work' ? tasks.filter(isWork) : tasks.filter(t => !isWork(t))
  }

  const filteredTasks = tasksList ? filterTasks(tasksList.tasks) : []
  const filteredOverdue = tasksList ? filterTasks(tasksList.overdueTasks) : []

  return (
    <ProtectedRoute>
      <PageContainer>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Life Assistant</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300 mb-8">Welcome to Life Assistant</p>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/50 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tasks Due Today
          </h2>

          {loading && (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
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

        {/* Filter */}
        {tasksList && (
          <div className="mt-8 flex gap-2">
            {(['all', 'work', 'personal'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All' : f === 'work' ? 'Work' : 'Personal'}
              </button>
            ))}
          </div>
        )}

        {/* Task List */}
        {tasksList && (
          <div className="mt-6 space-y-6">
            {/* Overdue Tasks */}
            {filteredOverdue.length > 0 && (
              <Accordion
                title="Overdue"
                count={filteredOverdue.length}
                titleClassName="text-red-600 dark:text-red-400"
              >
                <div className="space-y-3">
                  {filteredOverdue.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      availableStatuses={availableStatuses}
                      onStatusChange={handleStatusChange}
                      onDueDateChange={handleDueDateChange}
                    />
                  ))}
                </div>
              </Accordion>
            )}

            {/* Today's Tasks */}
            {filteredTasks.length > 0 && (
              <Accordion
                title="Today's Tasks"
                count={filteredTasks.length}
              >
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      availableStatuses={availableStatuses}
                      onStatusChange={handleStatusChange}
                      onDueDateChange={handleDueDateChange}
                    />
                  ))}
                </div>
              </Accordion>
            )}

            {/* Empty state */}
            {filteredTasks.length === 0 && filteredOverdue.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No {filter === 'all' ? '' : filter + ' '}tasks to show
              </p>
            )}
          </div>
        )}

        {/* Due Date Modal */}
        <DueDateModal
          isOpen={dueDateModalTask !== null}
          taskName={dueDateModalTask?.name || ''}
          currentDueDate={dueDateModalTask?.dueDate || null}
          onSave={handleDueDateSave}
          onClose={() => setDueDateModalTask(null)}
        />
      </PageContainer>
    </ProtectedRoute>
  )
}
