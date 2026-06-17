import { Table, Kanban, User, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskMobileNavProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function TaskMobileNav({ activeTab, setActiveTab }: TaskMobileNavProps) {
  const tabs = [
    { id: 'all', label: 'All Tasks', icon: Table },
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'my', label: 'My Tasks', icon: User },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare }
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-md border-t border-border px-4 py-2 pb-safe-bottom shadow-lg">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all text-xs font-medium",
                isActive 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
