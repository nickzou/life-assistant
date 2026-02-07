import { ExternalLink } from 'lucide-react'
import type { TaskItem } from './index'
import { SOURCE_LABELS } from './constants'
import { TaskDates } from './DueDate'
import { TimeOfDayDropdown } from './TimeOfDayDropdown'

interface TopShelfProps {
  task: TaskItem
  canChangeDueDate: boolean
  onDueDateClick: (e: React.MouseEvent) => void
  onTimeOfDayChange?: (timeOfDay: string | null) => Promise<void>
}

export function TopShelf({ task, canChangeDueDate, onDueDateClick, onTimeOfDayChange }: TopShelfProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 pb-1.5 border-b"
      style={{ borderColor: task.status.color + '30' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <TaskDates
          startDate={task.startDate}
          hasStartTime={task.hasStartTime}
          dueDate={task.dueDate}
          hasDueTime={task.hasDueTime}
          canChange={canChangeDueDate}
          onClick={onDueDateClick}
        />
        {task.parentName && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {task.parentName}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
          title={`Open in ${SOURCE_LABELS[task.source]}`}
          aria-label={`Open in ${SOURCE_LABELS[task.source]}`}
          data-testid="external-link-button"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        {onTimeOfDayChange ? (
          <TimeOfDayDropdown
            current={task.timeOfDay}
            onTimeOfDayChange={onTimeOfDayChange}
          />
        ) : task.timeOfDay ? (
          <span
            className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white"
            style={{ backgroundColor: task.timeOfDay.color }}
          >
            {task.timeOfDay.name}
          </span>
        ) : null}
      </div>
    </div>
  )
}
