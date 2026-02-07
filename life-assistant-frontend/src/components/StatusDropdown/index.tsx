import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'

export interface ClickUpStatus {
  id: string
  status: string
  type: string
  color: string
  orderindex: number
}

interface StatusDropdownProps {
  currentStatus: {
    status: string
    type: string
    color: string
  }
  availableStatuses: ClickUpStatus[]
  onStatusChange: (newStatus: string) => Promise<void>
  disabled?: boolean
}

export function StatusDropdown({
  currentStatus,
  availableStatuses,
  onStatusChange,
  disabled = false,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleStatusSelect = async (status: ClickUpStatus) => {
    if (status.status === currentStatus.status) {
      setIsOpen(false)
      return
    }

    setIsUpdating(true)
    try {
      await onStatusChange(status.status)
      setIsOpen(false)
    } catch {
      // Error is handled by the parent component
      // Just close the dropdown and clear loading state
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!disabled && !isUpdating) {
        setIsOpen(!isOpen)
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled && !isUpdating) {
            setIsOpen(!isOpen)
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || isUpdating}
        className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: currentStatus.color + '20',
          color: currentStatus.color,
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="status-dropdown-trigger"
      >
        {isUpdating ? (
          <span className="flex items-center gap-1">
            <Loader2 className="animate-spin h-3 w-3" />
            Updating...
          </span>
        ) : (
          <>
            {currentStatus.status}
            <ChevronDown className="ml-1 h-3 w-3" />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          role="listbox"
          data-testid="status-dropdown-menu"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {availableStatuses.map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusSelect(status)
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                  status.status === currentStatus.status
                    ? 'bg-gray-50 dark:bg-gray-700/50'
                    : ''
                }`}
                role="option"
                aria-selected={status.status === currentStatus.status}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span
                  className="truncate"
                  style={{ color: status.color }}
                >
                  {status.status}
                </span>
                {status.status === currentStatus.status && (
                  <Check className="ml-auto h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
