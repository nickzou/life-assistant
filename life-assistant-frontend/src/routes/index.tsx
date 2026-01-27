import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <h1>Life Assistant</h1>
      <p>Welcome to Life Assistant</p>
    </div>
  )
}
