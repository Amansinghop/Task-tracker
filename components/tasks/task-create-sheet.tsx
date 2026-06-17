'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import { useIsMobile } from '@/components/ui/use-mobile'
import { TaskStatus, TaskTag } from '@/lib/db-tasks'
import { AssigneePicker } from './assignee-picker'
import { TagPicker } from './tag-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
import { Loader2 } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
}

interface TaskCreateSheetProps {
  isOpen: boolean
  onClose: () => void
  statuses: TaskStatus[]
  tags: TaskTag[]
  members: Member[]
}

export function TaskCreateSheet({
  isOpen,
  onClose,
  statuses,
  tags,
  members,
}: TaskCreateSheetProps) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState(statuses[0]?.id || '')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])

  // Reset form helper
  const resetForm = () => {
    setName('')
    setDescription('')
    setStatusId(statuses[0]?.id || '')
    setPriority('Medium')
    setDueDate('')
    setAssigneeIds([])
    setTagIds([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Task name is required')
      return
    }
    if (!statusId) {
      toast.error('Task status is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status_id: statusId,
          priority,
          due_date: dueDate || null,
          assigneeIds,
          tagIds,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task')
      }

      toast.success('Task created successfully')
      
      // Mutate all SWR key matches for tasks
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'))
      
      handleClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6 sm:px-0 sm:pb-0 overflow-y-auto max-h-[70vh]">
      {/* Task Name */}
      <div className="space-y-1.5">
        <Label htmlFor="task-name" className="text-xs font-semibold text-foreground">Task Title</Label>
        <Input
          id="task-name"
          placeholder="What needs to be done?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-card/45 border-border h-10 text-sm"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="task-description" className="text-xs font-semibold text-foreground">Description</Label>
        <Textarea
          id="task-description"
          placeholder="Add details about this task..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card/45 border-border min-h-[80px] text-sm"
        />
      </div>

      {/* Status & Priority Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Status</Label>
          <Select value={statusId} onValueChange={setStatusId}>
            <SelectTrigger className="bg-card/45 border-border h-10 text-xs capitalize">
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

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-card/45 border-border h-10 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High" className="text-xs">High</SelectItem>
              <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="Low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due Date */}
      <div className="space-y-1.5">
        <Label htmlFor="task-due-date" className="text-xs font-semibold text-foreground">Due Date</Label>
        <Input
          id="task-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-card/45 border-border h-10 text-xs text-muted-foreground w-full"
        />
      </div>

      {/* Assignees & Tags Multi-selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Assignees</Label>
          <AssigneePicker
            members={members}
            selectedIds={assigneeIds}
            onChange={setAssigneeIds}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Tags</Label>
          <TagPicker
            tags={tags}
            selectedIds={tagIds}
            onChange={setTagIds}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={loading}
          className="border-border text-xs h-10"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-4 flex items-center gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create Task
        </Button>
      </div>
    </form>
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent className="px-1 border-t border-border">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg font-bold">New Team Task</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Define the title, due date, status, priority, assignees, and tags.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-2">{renderForm()}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New Team Task</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define details to assign and track this task.
          </DialogDescription>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}
