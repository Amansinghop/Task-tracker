'use client'

import { Task, TaskStatus } from '@/lib/db-tasks'
import { Checkbox } from '@/components/ui/checkbox'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { Calendar, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskChecklistViewProps {
  tasks: Task[]
  statuses: TaskStatus[]
  onTaskClick: (task: Task) => void
}

export function TaskChecklistView({ tasks, statuses, onTaskClick }: TaskChecklistViewProps) {
  
  // Find "Done" and "Todo" status IDs
  const doneStatus = statuses.find((s) => s.name.toLowerCase() === 'done')
  const todoStatus = statuses.find((s) => s.name.toLowerCase() === 'todo') || statuses[0]

  const handleToggleDone = async (task: Task, isChecked: boolean) => {
    if (!doneStatus || !todoStatus) {
      toast.error('Task status configuration is missing')
      return
    }

    const targetStatusId = isChecked ? doneStatus.id : todoStatus.id

    // Optimistic Update cache
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/tasks'),
      (currentData: any) => {
        if (!currentData || !currentData.tasks) return currentData
        return {
          ...currentData,
          tasks: currentData.tasks.map((t: any) => 
            t.id === task.id 
              ? { 
                  ...t, 
                  status_id: targetStatusId, 
                  status_name: isChecked ? doneStatus.name : todoStatus.name,
                  status_color: isChecked ? doneStatus.color : todoStatus.color
                } 
              : t
          )
        }
      },
      false
    )

    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: targetStatusId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task status')
      }

      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update task status')
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
    }
  }

  // Format Date helper
  const getFormattedDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-card/20">
        <p className="text-muted-foreground text-sm">No tasks found matching current filters.</p>
      </div>
    )
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/45 backdrop-blur-sm shadow-sm max-w-3xl mx-auto divide-y divide-border/40">
      {tasks.map((task) => {
        const isDone = task.status_name?.toLowerCase() === 'done'

        return (
          <div 
            key={task.id}
            className={cn(
              "flex items-center gap-4 p-4 hover:bg-muted/20 transition-all duration-200 select-none",
              isDone ? "opacity-65" : ""
            )}
          >
            {/* Checkbox status toggle */}
            <div className="flex items-center justify-center h-9 w-9">
              <Checkbox
                checked={isDone}
                onCheckedChange={(checked) => handleToggleDone(task, !!checked)}
                className="h-5.5 w-5.5 border-border/80 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-0 rounded-md cursor-pointer shrink-0"
              />
            </div>

            {/* Task core details */}
            <div 
              onClick={() => onTaskClick(task)}
              className="flex-1 min-w-0 cursor-pointer space-y-1 py-0.5"
            >
              <h4 className={cn(
                "text-sm font-semibold text-foreground tracking-tight transition-all duration-200 truncate",
                isDone ? "line-through text-muted-foreground decoration-muted-foreground/60" : ""
              )}>
                {task.name}
              </h4>
              
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {/* Priority */}
                <span className={cn(
                  "font-bold uppercase tracking-wider",
                  task.priority === 'High' ? 'text-red-400' : task.priority === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                )}>
                  {task.priority} Priority
                </span>

                {/* Due Date */}
                {task.due_date && (
                  <span className={cn(
                    "flex items-center gap-1 font-medium",
                    new Date(task.due_date) < new Date() && !isDone ? "text-red-400" : ""
                  )}>
                    <Calendar className="h-3 w-3" />
                    {getFormattedDate(task.due_date)}
                  </span>
                )}

                {/* Assignees initials summary */}
                {task.assignees && task.assignees.length > 0 && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <UserCheck className="h-3 w-3" />
                    {task.assignees.map(a => a.name || a.email.split('@')[0]).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
