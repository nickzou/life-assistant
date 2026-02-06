import type { TaskItem } from './index'

interface TopShelfProps {
  task: TaskItem
  canChangeDueDate: boolean
  onDueDateClick: (e: React.MouseEvent) => void
}

function formatDueTime(dueDate: string | null, hasDueTime: boolean) {
  if (!dueDate) return null
  const date = new Date(dueDate)
  if (hasDueTime) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return null
}

export function TopShelf({ task, canChangeDueDate, onDueDateClick }: TopShelfProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 pb-1.5 border-b"
      style={{ borderColor: task.status.color + '30' }}
    >
      {canChangeDueDate ? (
        <button
          type="button"
          onClick={onDueDateClick}
          className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
          data-testid="due-date-button"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {task.dueDate ? (
            <>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {task.hasDueTime && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}at {formatDueTime(task.dueDate, task.hasDueTime)}
                </span>
              )}
            </>
          ) : (
            <span className="opacity-60">Set date</span>
          )}
        </button>
      ) : (
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {task.dueDate ? (
            <>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {task.hasDueTime && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}at {formatDueTime(task.dueDate, task.hasDueTime)}
                </span>
              )}
            </>
          ) : (
            <span className="opacity-60">No date</span>
          )}
        </span>
      )}
      {task.timeOfDay && (
        <span
          className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white"
          style={{ backgroundColor: task.timeOfDay.color }}
        >
          {task.timeOfDay.name}
        </span>
      )}
    </div>
  )
}
