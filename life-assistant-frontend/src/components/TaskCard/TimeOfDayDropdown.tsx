import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Loader2 } from 'lucide-react'

const TIME_OF_DAY_OPTIONS = [
  { name: 'early morning', color: '#6B7280' },
  { name: 'morning', color: '#F59E0B' },
  { name: 'mid day', color: '#3B82F6' },
  { name: 'evening', color: '#8B5CF6' },
  { name: 'before bed', color: '#6366F1' },
]

interface TimeOfDayDropdownProps {
  current: { name: string; color: string } | null
  onTimeOfDayChange: (timeOfDay: string | null) => Promise<void>
}

export function TimeOfDayDropdown({ current, onTimeOfDayChange }: TimeOfDayDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleSelect = async (option: { name: string } | null) => {
    if (option?.name === current?.name) {
      setIsOpen(false)
      return
    }

    setIsUpdating(true)
    try {
      await onTimeOfDayChange(option?.name ?? null)
      setIsOpen(false)
    } catch {
      // Error handled by parent
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!isUpdating) setIsOpen(!isOpen)
        }}
        disabled={isUpdating}
        className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50 text-white"
        style={{ backgroundColor: current?.color ?? '#9CA3AF' }}
        data-testid="time-of-day-dropdown-trigger"
      >
        {isUpdating ? (
          <span className="flex items-center gap-1">
            <Loader2 className="animate-spin h-3 w-3" />
          </span>
        ) : (
          <>
            {current?.name ?? 'Set time'}
            <ChevronDown className="ml-1 h-3 w-3" />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          role="listbox"
          data-testid="time-of-day-dropdown-menu"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {TIME_OF_DAY_OPTIONS.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(option)
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                  option.name === current?.name ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                }`}
                role="option"
                aria-selected={option.name === current?.name}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.color }}
                />
                <span className="truncate capitalize text-gray-700 dark:text-gray-300">
                  {option.name}
                </span>
              </button>
            ))}
            {current && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(null)
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
              >
                <X className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Clear</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
