import { useState } from 'react'

interface AccordionProps {
  title: string
  count?: number
  defaultExpanded?: boolean
  titleClassName?: string
  children: React.ReactNode
}

export function Accordion({
  title,
  count,
  defaultExpanded = true,
  titleClassName = 'text-gray-900 dark:text-white',
  children,
}: AccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className={`text-base sm:text-lg font-semibold ${titleClassName}`}>
          {title}
          {count !== undefined && ` (${count})`}
        </h2>
        <span className="text-gray-500 dark:text-gray-400 text-xl">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && <div className="mt-4">{children}</div>}
    </div>
  )
}
