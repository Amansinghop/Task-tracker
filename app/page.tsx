import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Task Tracker",
  description: "Team Task Tracker",
}

export default async function Home() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  // Redirect to the Task Tracker as the main landing page
  redirect("/tasks")
}