import { StatusDropdown, type ClickUpStatus } from './StatusDropdown'

export type TaskItem = {
  id: string
  name: string
  parentName: string | null
  listId: string
  status: {
    status: string
    type: string
    color: string
  }
  dueDate: string | null
  hasDueTime: boolean
  tags: string[]
  timeOfDay: {
    name: string
    color: string
  } | null
  url: string
}

interface TaskCardProps {
  task: TaskItem
  availableStatuses?: ClickUpStatus[]
  onStatusChange?: (taskId: string, newStatus: string) => Promise<void>
  onDueDateChange?: (task: TaskItem) => void
}

export function TaskCard({
  task,
  availableStatuses,
  onStatusChange,
  onDueDateChange,
}: TaskCardProps) {
  const isCompleted = task.status.type === 'done' || task.status.type === 'closed'
  const canChangeStatus = availableStatuses && availableStatuses.length > 0 && onStatusChange
  const canChangeDueDate = !!onDueDateChange

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(task.id, newStatus)
    }
  }

  const handleDueDateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDueDateChange) {
      onDueDateChange(task)
    }
  }

  const formatDueDate = (dueDate: string | null, hasDueTime: boolean) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    if (hasDueTime) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return null
  }

  return (
    <div
      className="block p-3 sm:p-4 rounded-lg border transition-colors"
      style={{
        backgroundColor: task.status.color + '10',
        borderColor: task.status.color + '40',
      }}
      data-testid="task-card"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          {task.parentName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {task.parentName}
            </p>
          )}
          <div className="flex items-start gap-2">
            <p
              className={`text-sm sm:text-base font-medium text-gray-900 dark:text-white flex-1 ${
                isCompleted ? 'line-through opacity-70' : ''
              }`}
            >
              {task.name}
            </p>
            {/* External link button */}
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title="Open in ClickUp"
              aria-label="Open in ClickUp"
              data-testid="external-link-button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Status, Time of Day, and Due time */}
        <div className="flex flex-col items-end gap-1 sm:gap-2">
          {/* Status badge - either clickable dropdown or static */}
          {canChangeStatus ? (
            <StatusDropdown
              currentStatus={task.status}
              availableStatuses={availableStatuses}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <span
              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium"
              style={{
                backgroundColor: task.status.color + '20',
                color: task.status.color,
              }}
            >
              {task.status.status}
            </span>
          )}

          {/* Time of Day */}
          {task.timeOfDay && (
            <span
              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white"
              style={{ backgroundColor: task.timeOfDay.color }}
            >
              {task.timeOfDay.name}
            </span>
          )}

          {/* Due date/time - clickable if onDueDateChange provided */}
          {canChangeDueDate ? (
            <button
              type="button"
              onClick={handleDueDateClick}
              className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 whitespace-nowrap transition-colors flex items-center gap-1"
              data-testid="due-date-button"
            >
              {task.dueDate && task.hasDueTime ? (
                formatDueDate(task.dueDate, task.hasDueTime)
              ) : task.dueDate ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              ) : (
                <span className="flex items-center gap-1 opacity-60">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Set date
                </span>
              )}
            </button>
          ) : (
            // Only show time if explicitly set
            task.dueDate && task.hasDueTime && (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatDueDate(task.dueDate, task.hasDueTime)}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
