import { useState, useEffect } from 'react'

interface DueDateModalProps {
  isOpen: boolean
  taskName: string
  currentDueDate: string | null
  onSave: (dueDate: number | null) => Promise<void>
  onClose: () => void
}

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Format as YYYY-MM-DD for date input
  return date.toISOString().split('T')[0]
}

export function DueDateModal({
  isOpen,
  taskName,
  currentDueDate,
  onSave,
  onClose,
}: DueDateModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Reset the date when modal opens with new due date
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(formatDateForInput(currentDueDate))
    }
  }, [isOpen, currentDueDate])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Convert date string to Unix timestamp in milliseconds
      // If no date selected, send null to clear the due date
      const dueDate = selectedDate
        ? new Date(selectedDate + 'T23:59:59').getTime()
        : null
      await onSave(dueDate)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setIsSaving(true)
    try {
      await onSave(null)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSaving) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="due-date-modal-title"
      data-testid="due-date-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
        <h2
          id="due-date-modal-title"
          className="text-lg font-bold text-gray-900 dark:text-white mb-2"
        >
          Set Due Date
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 truncate">
          {taskName}
        </p>

        <div className="mb-4">
          <label
            htmlFor="due-date-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Due Date
          </label>
          <input
            type="date"
            id="due-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            data-testid="due-date-input"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            data-testid="due-date-cancel"
          >
            Cancel
          </button>
          {currentDueDate && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              data-testid="due-date-clear"
            >
              {isSaving ? 'Clearing...' : 'Clear'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="due-date-save"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
