import { DashboardHeader } from "@/components/dashboard-header"

export const metadata = {
  title: "Task Tracker - OpsDash",
  description: "Real-time Team Task Management",
}

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 w-full relative">
        {children}
      </main>
    </div>
  )
}
