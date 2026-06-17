'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { Task, TaskStatus, TaskTag } from '@/lib/db-tasks'
import { AssigneePicker } from './assignee-picker'
import { TagPicker } from './tag-picker'
import { TaskComments } from './task-comments'
import { useIsMobile } from '@/components/ui/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Loader2, Calendar, User, Tag, Sparkles, UserCheck } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
}

interface TaskDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  statuses: TaskStatus[]
  tags: TaskTag[]
  members: Member[]
  activeUserId?: string
  isAdmin?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function TaskDetailSheet({
  isOpen,
  onClose,
  task: initialTask,
  statuses,
  tags,
  members,
  activeUserId,
  isAdmin,
}: TaskDetailSheetProps) {
  const isMobile = useIsMobile()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch full task details (including recent updates)
  const { data: detailData, mutate: mutateDetail } = useSWR(
    initialTask ? `/api/tasks/${initialTask.id}` : null,
    fetcher
  )
  const task: Task | null = detailData?.task || initialTask

  // Editable Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])

  // Load values when task changes
  useEffect(() => {
    if (task) {
      setName(task.name || '')
      setDescription(task.description || '')
      setStatusId(task.status_id || '')
      setPriority(task.priority || 'Medium')
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setAssigneeIds(task.assignees?.map((a) => a.id) || [])
      setTagIds(task.tags?.map((t) => t.id) || [])
    }
  }, [task, isOpen])

  if (!task) return null

  // Check delete permission: admin or creator
  const canDelete = isAdmin || task.created_by === activeUserId

  // Auto-save edit fields on blur/change
  const handleFieldSave = async (updatedFields: any) => {
    if (!task) return
    setSaving(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task')
      }

      // Optimistic updates
      mutateDetail()
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save task update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task')
      }

      toast.success('Task deleted successfully')
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  const renderContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-4 md:p-6 overflow-y-auto max-h-[82vh]">
      {/* Left Columns (3/5) - Core info and Comments */}
      <div className="md:col-span-3 space-y-5">
        {/* Task Title */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Task Title</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== task?.name && handleFieldSave({ name: name.trim() })}
            className="text-base font-bold bg-transparent border-transparent focus:border-border hover:bg-muted/15 px-1 py-1 focus:px-3 focus:py-2 rounded-md h-auto transition-all text-foreground"
            placeholder="Task title"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description.trim() !== task?.description && handleFieldSave({ description: description.trim() })}
            className="text-xs bg-transparent border-transparent focus:border-border hover:bg-muted/15 min-h-[90px] px-1 py-1 focus:px-3 focus:py-2 rounded-md transition-all text-foreground/90 resize-none leading-relaxed"
            placeholder="Add a detailed description..."
          />
        </div>

        {/* Comments Section */}
        <div className="pt-4 border-t border-border/40 flex-1">
          <TaskComments taskId={task.id} activeUserId={activeUserId} />
        </div>
      </div>

      {/* Right Column (2/5) - Metadata settings */}
      <div className="md:col-span-2 bg-muted/20 border border-border/40 rounded-xl p-4 space-y-4 h-fit">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/30">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Task Configuration
        </h4>

        {/* Status */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">Status</Label>
          <Select 
            value={statusId} 
            onValueChange={(val) => {
              setStatusId(val)
              handleFieldSave({ status_id: val })
            }}
          >
            <SelectTrigger className="bg-card border-border h-9 text-xs capitalize">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id} className="capitalize text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</Label>
          <Select 
            value={priority} 
            onValueChange={(val: any) => {
              setPriority(val)
              handleFieldSave({ priority: val })
            }}
          >
            <SelectTrigger className="bg-card border-border h-9 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High" className="text-xs">High</SelectItem>
              <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="Low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Due Date
          </Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value)
              handleFieldSave({ due_date: e.target.value || null })
            }}
            className="bg-card border-border h-9 text-xs text-muted-foreground"
          />
        </div>

        {/* Assignees */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <User className="h-3 w-3" /> Assignees
          </Label>
          <AssigneePicker
            members={members}
            selectedIds={assigneeIds}
            onChange={(ids) => {
              setAssigneeIds(ids)
              handleFieldSave({ assigneeIds: ids })
            }}
          />
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Tag className="h-3 w-3" /> Tags
          </Label>
          <TagPicker
            tags={tags}
            selectedIds={tagIds}
            onChange={(ids) => {
              setTagIds(ids)
              handleFieldSave({ tagIds: ids })
            }}
          />
        </div>

        {/* Created / Updated Info */}
        <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground space-y-1">
          <p>Created by: <span className="text-foreground font-semibold">{task.created_by_name || 'System'}</span></p>
          {task.last_updated_by_name && (
            <p>Last updated by: <span className="text-foreground font-semibold">{task.last_updated_by_name}</span></p>
          )}
        </div>

        {/* Delete Controls */}
        {canDelete && (
          <div className="pt-2">
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="outline"
              size="sm"
              className="w-full text-xs text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10 flex items-center gap-1.5 h-9"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete Task
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="px-1 border-t border-border">
          <DrawerHeader className="text-left border-b border-border/20 pb-2">
            <DrawerTitle className="text-md font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Task Configuration
            </DrawerTitle>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 border-border bg-card overflow-hidden">
        <DialogHeader className="px-6 pt-4 pb-2 border-b border-border/20">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary animate-pulse" /> Task Details
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
