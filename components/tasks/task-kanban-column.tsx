'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/lib/db-tasks'
import { TaskCard } from './task-card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TaskKanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDropTask: (taskId: string, targetStatusId: string) => void
}

export function TaskKanbanColumn({
  status,
  tasks,
  onTaskClick,
  onDropTask,
}: TaskKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      onDropTask(taskId, status.id)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col flex-shrink-0 w-[290px] md:w-full min-h-[450px] max-h-[72vh] md:max-h-none bg-card/25 border border-border/40 rounded-xl p-3 scroll-snap-align-start transition-all duration-200",
        isDragOver ? "bg-muted/30 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.05)]" : ""
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span 
            className="h-3 w-3 rounded-full shrink-0" 
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-semibold text-foreground text-sm tracking-tight capitalize truncate max-w-[170px]">
            {status.name}
          </h3>
        </div>
        <Badge variant="secondary" className="font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
          {tasks.length}
        </Badge>
      </div>

      {/* Column Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="h-full min-h-[100px] flex items-center justify-center text-center text-xs text-muted-foreground/60 border border-dashed border-border/30 rounded-lg p-4">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>
    </div>
  )
}
