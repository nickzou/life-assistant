import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Life Assistant</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">Welcome to Life Assistant</p>
    </div>
  )
}
