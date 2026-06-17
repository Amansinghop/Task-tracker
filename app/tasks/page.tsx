import { getCurrentUser } from "@/lib/auth"
import { TaskBoard } from "@/components/tasks/task-board"

export default async function TasksPage() {
  // Ensure user is authenticated (middleware will also handle redirects)
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return <TaskBoard />
}
