export type TaskItem = {
  id: string
  name: string
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
}

export function TaskCard({ task }: TaskCardProps) {
  const isCompleted = task.status.type === 'done' || task.status.type === 'closed'

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block p-3 sm:p-4 rounded-lg border transition-colors ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm sm:text-base font-medium ${
              isCompleted
                ? 'text-green-700 dark:text-green-300 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.name}
          </p>
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
          {/* Status badge */}
          <span
            className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium"
            style={{
              backgroundColor: task.status.color + '20',
              color: task.status.color,
            }}
          >
            {task.status.status}
          </span>

          {/* Time of Day */}
          {task.timeOfDay && (
            <span
              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white"
              style={{ backgroundColor: task.timeOfDay.color }}
            >
              {task.timeOfDay.name}
            </span>
          )}

          {/* Due time - only show if explicitly set */}
          {task.dueDate && task.hasDueTime && (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {new Date(task.dueDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
