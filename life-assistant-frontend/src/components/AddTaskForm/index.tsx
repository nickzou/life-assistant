import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, X, Loader2 } from 'lucide-react'
import { api } from '@lib/api'
import type { ClickUpStatus } from '@components/StatusDropdown'

interface PersonalListResponse {
  id: string
  name: string
  statuses: ClickUpStatus[]
}

interface AddTaskFormProps {
  onTaskCreated?: () => void
}

export function AddTaskForm({ onTaskCreated }: AddTaskFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Available statuses from the Personal list
  const [availableStatuses, setAvailableStatuses] = useState<ClickUpStatus[]>([])
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Fetch statuses when expanded
  useEffect(() => {
    if (isExpanded && availableStatuses.length === 0) {
      fetchStatuses()
    }
  }, [isExpanded])

  // Focus name input when expanded
  useEffect(() => {
    if (isExpanded && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isExpanded])

  const fetchStatuses = async () => {
    setIsLoadingStatuses(true)
    try {
      const response = await api.get<PersonalListResponse>('/clickup/personal-list')
      setAvailableStatuses(response.data.statuses)
      // Set default status to first non-closed status
      const defaultStatus = response.data.statuses.find(
        (s) => s.type !== 'done' && s.type !== 'closed'
      )
      if (defaultStatus) {
        setStatus(defaultStatus.status)
      }
    } catch {
      setError('Failed to load statuses')
    } finally {
      setIsLoadingStatuses(false)
    }
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const taskData: {
        name: string
        due_date?: number
        status?: string
        tags?: string[]
      } = {
        name: name.trim(),
      }

      if (dueDate) {
        // Convert to Unix timestamp in milliseconds
        taskData.due_date = new Date(dueDate).getTime()
      }

      if (status) {
        taskData.status = status
      }

      if (tags.length > 0) {
        taskData.tags = tags
      }

      await api.post('/clickup/tasks', taskData)

      // Reset form
      setName('')
      setDueDate('')
      setTags([])
      setTagInput('')
      setIsExpanded(false)

      onTaskCreated?.()
    } catch {
      setError('Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setDueDate('')
    setTags([])
    setTagInput('')
    setError(null)
    setIsExpanded(false)
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add Task
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/50 rounded text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Task Name */}
      <input
        ref={nameInputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name"
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        required
      />

      {/* Second Row: Due Date, Status */}
      <div className="mt-3 flex flex-wrap gap-3">
        {/* Due Date */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        {/* Status */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Status
          </label>
          {isLoadingStatuses ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer"
              >
                {availableStatuses.map((s) => (
                  <option key={s.id} value={s.status}>
                    {s.status}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag..."
            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Task
        </button>
      </div>
    </form>
  )
}
