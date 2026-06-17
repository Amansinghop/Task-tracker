'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Task, TaskStatus, TaskTag } from '@/lib/db-tasks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Loader2, Check, ChevronsUpDown, Trash2, Edit } from 'lucide-react'
import { PriorityBadge } from './priority-badge'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'

interface Member {
  id: string
  name: string
  email: string
}

interface TaskTableViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd?: (name: string) => Promise<void>
  statuses: TaskStatus[]
  tags: TaskTag[]
  members: Member[]
  activeUserId?: string
  isAdmin?: boolean
  mutateTasks: () => void
}

const EffortBadge = ({ effort }: { effort: string }) => {
  if (!effort) return <span className="text-muted-foreground/20 text-xs font-normal">-</span>
  
  let bg = 'bg-muted/20 text-muted-foreground'
  if (effort === 'Large') bg = 'bg-red-500/10 text-red-500 border border-red-500/20'
  if (effort === 'Medium') bg = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
  if (effort === 'Small') bg = 'bg-green-500/10 text-green-500 border border-green-500/20'

  return (
    <Badge variant="outline" className={cn(bg, "capitalize text-[10px] font-semibold px-2 py-0.5 rounded-md")}>
      {effort}
    </Badge>
  )
}

export function TaskTableView({
  tasks,
  onTaskClick,
  onQuickAdd,
  statuses,
  tags,
  members,
  activeUserId,
  isAdmin,
  mutateTasks,
}: TaskTableViewProps) {
  // Local state to keep track of edited inputs to prevent focus issues during typing
  const [localNames, setLocalNames] = useState<Record<string, string>>({})
  const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({})
  const [localDeliverables, setLocalDeliverables] = useState<Record<string, string>>({})

  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Auto-save patch helper
  const handleUpdate = async (taskId: string, fields: any) => {
    // Perform optimistic update in SWR cache immediately
    if (mutateTasks) {
      mutateTasks((currentData: any) => {
        if (!currentData || !currentData.tasks) return currentData
        return {
          ...currentData,
          tasks: currentData.tasks.map((t: any) => {
            if (t.id === taskId) {
              const updatedTask = { ...t, ...fields }
              // Handle mapped status objects for immediate display
              if (fields.status_id) {
                const matchedStatus = statuses.find(s => s.id === fields.status_id)
                if (matchedStatus) {
                  updatedTask.status_name = matchedStatus.name
                  updatedTask.status_color = matchedStatus.color
                }
              }
              // Handle mapped assignees objects for immediate display
              if (fields.assigneeIds) {
                updatedTask.assignees = members.filter(m => fields.assigneeIds.includes(m.id))
              }
              // Handle mapped tags objects for immediate display
              if (fields.tagIds) {
                updatedTask.tags = tags.filter(tag => fields.tagIds.includes(tag.id))
              }
              return updatedTask
            }
            return t
          })
        }
      }, { revalidate: false })
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update task')
      // Rollback to original server state on error
      mutateTasks()
    }
  }

  // Delete task helper
  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    setSavingTaskId(taskId)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task')
      }

      toast.success('Task deleted successfully')
      mutateTasks()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete task')
    } finally {
      setSavingTaskId(null)
    }
  }

  // Create a default new task on "+ Add task" click
  const handleQuickAddClick = async () => {
    if (!onQuickAdd) return
    setIsAdding(true)
    try {
      // Create a task with the default name 'Task' matching the user's screenshot
      await onQuickAdd('Task')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      {/* Mobile view: Stacked Task Cards */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {onQuickAdd && (
          <button
            onClick={handleQuickAddClick}
            disabled={isAdding}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted/30 w-full"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add task
          </button>
        )}
      </div>

      {/* Desktop view: Spreadsheet Style Table */}
      <div className="hidden md:block border border-border rounded-lg overflow-x-auto bg-card/45 backdrop-blur-sm shadow-sm">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[220px]">Task</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[160px]">Owner</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[180px]">Task Type</TableHead>
              <TableHead className="w-[120px]">Start Date</TableHead>
              <TableHead className="w-[120px]">End Date</TableHead>
              <TableHead className="w-[180px]">Description</TableHead>
              <TableHead className="w-[180px]">Deliverable</TableHead>
              <TableHead className="w-[120px]">Effort Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                  No tasks found. Click "+ Add task" below to start.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const canDelete = isAdmin || task.created_by === activeUserId
                
                return (
                  <ContextMenu key={task.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        className={cn(
                          "hover:bg-muted/20 transition-colors border-b border-border/40",
                          savingTaskId === task.id && "opacity-75 pointer-events-none"
                        )}
                      >
                        {/* Task Name */}
                        <TableCell className="p-1">
                          <Input
                            value={localNames[task.id] !== undefined ? localNames[task.id] : task.name}
                            onChange={(e) => setLocalNames({ ...localNames, [task.id]: e.target.value })}
                            onBlur={() => {
                              const trimmed = (localNames[task.id] || '').trim()
                              if (trimmed && trimmed !== task.name) {
                                handleUpdate(task.id, { name: trimmed })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent hover:bg-muted/30 px-2 py-1 h-8 text-xs font-medium text-foreground w-full"
                          />
                        </TableCell>

                        {/* Priority */}
                        <TableCell className="p-1">
                          <Select
                            value={task.priority}
                            onValueChange={(val) => handleUpdate(task.id, { priority: val })}
                          >
                            <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-muted/30 p-1 h-8 w-fit text-xs focus:ring-0 focus:ring-offset-0">
                              <PriorityBadge priority={task.priority} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Owner / Assignees */}
                        <TableCell className="p-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1.5 justify-start w-full text-left px-2 py-1 h-8 rounded-md hover:bg-muted/30 text-xs text-foreground truncate">
                                {task.assignees && task.assignees.length > 0 ? (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                      {task.assignees.map((user) => (
                                        <Avatar key={user.id} className="h-5 w-5 border border-card shrink-0">
                                          <AvatarFallback className="bg-primary text-primary-foreground text-[8px] font-bold">
                                            {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                    <span className="truncate">
                                      {task.assignees.map(a => a.name || a.email).join(', ')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/30 font-normal">Add owner...</span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0 border-border" align="start">
                              <Command className="bg-card">
                                <CommandInput placeholder="Search team members..." className="h-9 border-none focus:ring-0" />
                                <CommandEmpty>No members found.</CommandEmpty>
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                  <CommandGroup>
                                    {members.map((member) => {
                                      const isSelected = task.assignees?.some((a) => a.id === member.id)
                                      return (
                                        <CommandItem
                                          key={member.id}
                                          value={member.name || member.email}
                                          onSelect={() => {
                                            const currentIds = task.assignees?.map((a) => a.id) || []
                                            const nextIds = isSelected 
                                              ? currentIds.filter((x) => x !== member.id) 
                                              : [...currentIds, member.id]
                                            handleUpdate(task.id, { assigneeIds: nextIds })
                                          }}
                                          className="flex items-center justify-between py-2 px-3 cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                                                {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-semibold text-foreground leading-none">
                                                {member.name || 'User'}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground leading-tight">
                                                {member.email}
                                              </span>
                                            </div>
                                          </div>
                                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                        </CommandItem>
                                      )
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="p-1">
                          <Select
                            value={task.status_id}
                            onValueChange={(val) => handleUpdate(task.id, { status_id: val })}
                          >
                            <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-muted/30 p-1 h-8 w-fit text-xs focus:ring-0 focus:ring-offset-0">
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  backgroundColor: `${task.status_color || '#6b7280'}15`,
                                  color: task.status_color || '#6b7280',
                                  borderColor: `${task.status_color || '#6b7280'}30`
                                }}
                                className="capitalize font-semibold text-[10px] px-2.5 py-0.5 rounded-full cursor-pointer shrink-0"
                              >
                                {task.status_name}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status.id} value={status.id} className="capitalize text-xs">
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Task Type / Tags */}
                        <TableCell className="p-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer hover:bg-muted/30 px-2 py-1 h-8 rounded-md flex items-center gap-1 overflow-hidden truncate min-w-[100px]">
                                {task.tags && task.tags.length > 0 ? (
                                  <div className="flex gap-1 overflow-hidden truncate">
                                    {task.tags.map((tag) => (
                                      <Badge
                                        key={tag.id}
                                        variant="outline"
                                        style={{
                                          backgroundColor: `${tag.color}15`,
                                          color: tag.color,
                                          borderColor: `${tag.color}30`
                                        }}
                                        className="text-[9px] px-1.5 py-0 font-medium capitalize shrink-0"
                                      >
                                        {tag.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs font-normal">Add type...</span>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0 border-border" align="start">
                              <Command className="bg-card">
                                <CommandInput placeholder="Search types..." className="h-9 border-none focus:ring-0" />
                                <CommandEmpty>No tags found.</CommandEmpty>
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                  <CommandGroup>
                                    {tags.map((tag) => {
                                      const isSelected = task.tags?.some((t) => t.id === tag.id)
                                      return (
                                        <CommandItem
                                          key={tag.id}
                                          value={tag.name}
                                          onSelect={() => {
                                            const currentIds = task.tags?.map((t) => t.id) || []
                                            const nextIds = isSelected
                                              ? currentIds.filter((x) => x !== tag.id)
                                              : [...currentIds, tag.id]
                                            handleUpdate(task.id, { tagIds: nextIds })
                                          }}
                                          className="flex items-center justify-between py-2 px-3 cursor-pointer capitalize"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="h-2.5 w-2.5 rounded-full shrink-0"
                                              style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-xs text-foreground font-medium">
                                              {tag.name}
                                            </span>
                                          </div>
                                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                        </CommandItem>
                                      )
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Start Date */}
                        <TableCell className="p-1">
                          <Input
                            type="date"
                            value={task.start_date ? task.start_date.split('T')[0] : ''}
                            onChange={(e) => handleUpdate(task.id, { start_date: e.target.value || null })}
                            className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent hover:bg-muted/30 px-2 py-1 h-8 text-xs text-muted-foreground w-full cursor-pointer"
                          />
                        </TableCell>

                        {/* End Date */}
                        <TableCell className="p-1">
                          <Input
                            type="date"
                            value={task.due_date ? task.due_date.split('T')[0] : ''}
                            onChange={(e) => handleUpdate(task.id, { due_date: e.target.value || null })}
                            className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent hover:bg-muted/30 px-2 py-1 h-8 text-xs text-muted-foreground w-full cursor-pointer"
                          />
                        </TableCell>

                        {/* Description */}
                        <TableCell className="p-1">
                          <Input
                            value={localDescriptions[task.id] !== undefined ? localDescriptions[task.id] : task.description}
                            onChange={(e) => setLocalDescriptions({ ...localDescriptions, [task.id]: e.target.value })}
                            onBlur={() => {
                              const val = localDescriptions[task.id]
                              if (val !== undefined && val !== task.description) {
                                handleUpdate(task.id, { description: val })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            placeholder="Description..."
                            className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent hover:bg-muted/30 px-2 py-1 h-8 text-xs text-muted-foreground w-full"
                          />
                        </TableCell>

                        {/* Deliverable */}
                        <TableCell className="p-1">
                          <Input
                            value={localDeliverables[task.id] !== undefined ? localDeliverables[task.id] : task.deliverable}
                            onChange={(e) => setLocalDeliverables({ ...localDeliverables, [task.id]: e.target.value })}
                            onBlur={() => {
                              const val = localDeliverables[task.id]
                              if (val !== undefined && val !== task.deliverable) {
                                handleUpdate(task.id, { deliverable: val })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            placeholder="Deliverable..."
                            className="border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent hover:bg-muted/30 px-2 py-1 h-8 text-xs text-muted-foreground w-full"
                          />
                        </TableCell>

                        {/* Effort Level */}
                        <TableCell className="p-1">
                          <Select
                            value={task.effort_level || "None"}
                            onValueChange={(val) => handleUpdate(task.id, { effort_level: val === "None" ? "" : val })}
                          >
                            <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-muted/30 p-1 h-8 w-fit text-xs focus:ring-0 focus:ring-offset-0">
                              <EffortBadge effort={task.effort_level} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">-</SelectItem>
                              <SelectItem value="Small">Small</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    
                    {/* Right Click Context Menu */}
                    <ContextMenuContent className="w-48 bg-card border-border">
                      <ContextMenuItem 
                        onClick={() => onTaskClick(task)}
                        className="flex items-center gap-2 text-xs py-2 px-3 cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Details (Popup)</span>
                      </ContextMenuItem>
                      {canDelete ? (
                        <ContextMenuItem 
                          onClick={() => handleDelete(task.id)}
                          className="flex items-center gap-2 text-xs py-2 px-3 text-red-500 hover:text-red-400 focus:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Task</span>
                        </ContextMenuItem>
                      ) : (
                        <ContextMenuItem 
                          disabled 
                          className="flex items-center gap-2 text-xs py-2 px-3 text-muted-foreground/50"
                        >
                          <Trash2 className="h-3.5 w-3.5 opacity-50" />
                          <span>Delete Task (Created by others)</span>
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Bottom spreadsheet addition options */}
        <div className="border-t border-border/30 px-4 py-2.5 bg-muted/10 flex items-center justify-between">
          <button
            onClick={handleQuickAddClick}
            disabled={isAdding}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 transition-all py-1 px-2.5 rounded-md font-bold"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Plus className="h-3.5 w-3.5 shrink-0" />
            )}
            Add
          </button>
          
          <div className="text-[10px] text-muted-foreground font-medium">
            Right-click on any row to delete or view details
          </div>
        </div>
      </div>
    </div>
  )
}
