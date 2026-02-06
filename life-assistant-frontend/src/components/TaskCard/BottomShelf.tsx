import { ChevronDown } from 'lucide-react'
import type { TaskItem } from './index'

interface BottomShelfProps {
  task: TaskItem
  isExpanded: boolean
  onToggle: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  wrike: 'Wrike',
  clickup: 'ClickUp',
  openproject: 'OpenProject',
}

export function BottomShelf({ task, isExpanded, onToggle }: BottomShelfProps) {
  return (
    <>
      {/* Accordion toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-center border-t text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        style={{ borderColor: task.status.color + '30' }}
        data-testid="accordion-toggle"
      >
        <ChevronDown
          className="w-4 h-4 transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Accordion shelf */}
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: isExpanded ? '200px' : '0px' }}
        data-testid="accordion-shelf"
      >
        <div className="pt-2 flex items-center justify-between gap-2">
          {task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Source: {SOURCE_LABELS[task.source] || task.source}
          </span>
        </div>
      </div>
    </>
  )
}
