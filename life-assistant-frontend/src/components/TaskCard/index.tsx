import { useState } from 'react'
import { StatusDropdown, type ClickUpStatus } from '../StatusDropdown'
import { TopShelf } from './TopShelf'
import { BottomShelf } from './BottomShelf'

export type TaskSource = 'clickup' | 'wrike' | 'openproject'

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
  startDate: string | null
  hasStartTime: boolean
  dueDate: string | null
  hasDueTime: boolean
  tags: string[]
  timeOfDay: {
    name: string
    color: string
  } | null
  url: string
  source: TaskSource
  readOnly: boolean
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
  const [isExpanded, setIsExpanded] = useState(false)
  const isCompleted = task.status.type === 'done' || task.status.type === 'closed'
  const canChangeStatus = availableStatuses && availableStatuses.length > 0 && onStatusChange && !task.readOnly
  const canChangeDueDate = !!onDueDateChange && !task.readOnly

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

  return (
    <div
      className="p-2 sm:p-3 flex flex-col gap-y-1.5 rounded-lg border"
      style={{
        backgroundColor: task.status.color + '10',
        borderColor: task.status.color + '40',
        transition: 'background-color 200ms ease-in-out, border-color 200ms ease-in-out',
      }}
      data-testid="task-card"
    >
      <TopShelf
        task={task}
        canChangeDueDate={canChangeDueDate}
        onDueDateClick={handleDueDateClick}
      />

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
              className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
              title={`Open in ${task.source === 'wrike' ? 'Wrike' : task.source === 'openproject' ? 'OpenProject' : 'ClickUp'}`}
              aria-label={`Open in ${task.source === 'wrike' ? 'Wrike' : task.source === 'openproject' ? 'OpenProject' : 'ClickUp'}`}
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
        </div>

        {/* Right side: Status */}
        <div className="flex flex-col items-end gap-1 sm:gap-2">
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
        </div>
      </div>

      <BottomShelf
        task={task}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
    </div>
  )
}
