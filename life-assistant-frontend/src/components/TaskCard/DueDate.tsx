import { Calendar } from 'lucide-react'

interface DateContentProps {
  dueDate: string | null
  hasDueTime: boolean
  placeholder: string
}

interface DueDateProps {
  dueDate: string | null
  hasDueTime: boolean
  canChange: boolean
  onClick: (e: React.MouseEvent) => void
}

function formatDueTime(dueDate: string) {
  return new Date(dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DateContent({ dueDate, hasDueTime, placeholder }: DateContentProps) {
  return (
    <>
      <Calendar className="w-3 h-3" />
      {dueDate ? (
        <>
          {new Date(dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          {hasDueTime && (
            <span className="text-gray-400 dark:text-gray-500">
              {' '}at {formatDueTime(dueDate)}
            </span>
          )}
        </>
      ) : (
        <span className="opacity-60">{placeholder}</span>
      )}
    </>
  )
}

export function DueDate({ dueDate, hasDueTime, canChange, onClick }: DueDateProps) {
  if (canChange) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        data-testid="due-date-button"
      >
        <DateContent dueDate={dueDate} hasDueTime={hasDueTime} placeholder="Set date" />
      </button>
    )
  }

  return (
    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center gap-1">
      <DateContent dueDate={dueDate} hasDueTime={hasDueTime} placeholder="No date" />
    </span>
  )
}
