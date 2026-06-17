import { Task } from '@/lib/db-tasks'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, MessageSquare } from 'lucide-react'
import { PriorityBadge } from './priority-badge'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  onClick: () => void
  onDragStart?: (e: React.DragEvent, taskId: string) => void
}

export function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, task.id)
    }
  }

  // Get date format
  const getFormattedDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Border priority accent
  const priorityBorderClass = {
    High: 'border-l-4 border-l-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] shadow-[0_0_10px_rgba(239,68,68,0.05)]',
    Medium: 'border-l-4 border-l-amber-500',
    Low: 'border-l-4 border-l-emerald-500'
  }[task.priority]

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:bg-muted/30 transition-all duration-200 border border-border select-none bg-card/50 backdrop-blur-sm",
        priorityBorderClass
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Priority & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PriorityBadge priority={task.priority} />
          
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[60%]">
              {task.tags.slice(0, 2).map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="outline" 
                  style={{ 
                    backgroundColor: `${tag.color}15`, 
                    color: tag.color,
                    borderColor: `${tag.color}30`
                  }}
                  className="text-[10px] px-1.5 py-0 font-medium capitalize"
                >
                  {tag.name}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 font-medium">
                  +{task.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Task Title */}
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground text-sm leading-tight tracking-tight line-clamp-2">
            {task.name}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Card Footer: Due Date & Assignees */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
          {/* Due date */}
          <div className="flex items-center gap-1.5">
            {task.due_date ? (
              <span className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                new Date(task.due_date) < new Date() && task.status_name !== 'Done'
                  ? "text-red-400 bg-red-500/10 border border-red-500/20"
                  : "text-muted-foreground"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                {getFormattedDate(task.due_date)}
              </span>
            ) : (
              <span className="text-muted-foreground/40 text-[10px]">No due date</span>
            )}
          </div>

          {/* Assignees */}
          <div className="flex items-center gap-2">
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {task.assignees.slice(0, 3).map((user) => (
                  <Avatar key={user.id} className="h-6 w-6 border-2 border-card ring-offset-background">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold border-2 border-card">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground/40 text-[10px]">Unassigned</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
