import { Calendar } from 'lucide-react'

interface DateContentProps {
  startDate: string | null
  hasStartTime: boolean
  dueDate: string | null
  hasDueTime: boolean
  placeholder: string
}

interface TaskDatesProps {
  startDate: string | null
  hasStartTime: boolean
  dueDate: string | null
  hasDueTime: boolean
  canChange: boolean
  onClick: (e: React.MouseEvent) => void
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DateContent({ startDate, hasStartTime, dueDate, hasDueTime, placeholder }: DateContentProps) {
  if (!startDate && !dueDate) {
    return (
      <>
        <Calendar className="w-3 h-3" />
        <span className="opacity-60">{placeholder}</span>
      </>
    )
  }

  return (
    <>
      <Calendar className="w-3 h-3" />
      {startDate && (
        <>
          {formatDate(startDate)}
          {hasStartTime && (
            <span className="text-gray-400 dark:text-gray-500">
              {' '}at {formatTime(startDate)}
            </span>
          )}
          {dueDate && <span className="text-gray-400 dark:text-gray-500">{' '}-{' '}</span>}
        </>
      )}
      {dueDate && (
        <>
          {formatDate(dueDate)}
          {hasDueTime && (
            <span className="text-gray-400 dark:text-gray-500">
              {' '}at {formatTime(dueDate)}
            </span>
          )}
        </>
      )}
    </>
  )
}

export function TaskDates({ startDate, hasStartTime, dueDate, hasDueTime, canChange, onClick }: TaskDatesProps) {
  if (canChange) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        data-testid="due-date-button"
      >
        <DateContent startDate={startDate} hasStartTime={hasStartTime} dueDate={dueDate} hasDueTime={hasDueTime} placeholder="Set date" />
      </button>
    )
  }

  return (
    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center gap-1">
      <DateContent startDate={startDate} hasStartTime={hasStartTime} dueDate={dueDate} hasDueTime={hasDueTime} placeholder="No date" />
    </span>
  )
}
