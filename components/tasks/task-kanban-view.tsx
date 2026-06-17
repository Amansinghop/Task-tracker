'use client'

import { Task, TaskStatus } from '@/lib/db-tasks'
import { TaskKanbanColumn } from './task-kanban-column'
import { mutate } from 'swr'
import { toast } from 'sonner'

interface TaskKanbanViewProps {
  tasks: Task[]
  statuses: TaskStatus[]
  onTaskClick: (task: Task) => void
}

export function TaskKanbanView({ tasks, statuses, onTaskClick }: TaskKanbanViewProps) {
  
  // Handles card drops from one column to another
  const handleDropTask = async (taskId: string, targetStatusId: string) => {
    // Find task
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // If status is identical, ignore drop
    if (task.status_id === targetStatusId) return

    // Optimistic Update local tasks cache instantly
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/tasks'),
      (currentData: any) => {
        if (!currentData || !currentData.tasks) return currentData
        return {
          ...currentData,
          tasks: currentData.tasks.map((t: any) => 
            t.id === taskId 
              ? { 
                  ...t, 
                  status_id: targetStatusId, 
                  status_name: statuses.find((s) => s.id === targetStatusId)?.name || t.status_name 
                } 
              : t
          )
        }
      },
      false // Prevent immediate revalidation, let PATCH trigger update
    )

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: targetStatusId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task status')
      }

      // Re-fetch all active queries to align state with server
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to move task')
      // Revert cache on error
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
    }
  }

  // Filter tasks belonging to each status
  const getTasksByStatus = (statusId: string) => {
    return tasks.filter((task) => task.status_id === statusId)
  }

  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground text-sm">No task statuses configured. Create status in settings.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 flex flex-row md:grid md:grid-flow-col md:auto-cols-fr gap-4 scroll-snap-x scrollbar-thin">
      {statuses.map((status) => (
        <TaskKanbanColumn
          key={status.id}
          status={status}
          tasks={getTasksByStatus(status.id)}
          onTaskClick={onTaskClick}
          onDropTask={handleDropTask}
        />
      ))}
    </div>
  )
}
