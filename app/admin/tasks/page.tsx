'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'
import { Task, TaskStatus, TaskTag } from '@/lib/db-tasks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  Tag, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export default function AdminTasksPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Status Dialog State
  const [statusName, setStatusName] = useState('')
  const [statusColor, setStatusColor] = useState('#3b82f6')
  const [statusPosition, setStatusPosition] = useState('0')
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)

  // Tag Dialog State
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#8b5cf6')
  const [tagOpen, setTagOpen] = useState(false)

  // Fetch Lookups
  const { data: statusData } = useSWR('/api/tasks/statuses', fetcher)
  const { data: tagData } = useSWR('/api/tasks/tags', fetcher)
  const { data: tasksData } = useSWR('/api/tasks', fetcher)
  const { data: membersData } = useSWR('/api/tasks/members', fetcher)

  const statuses: TaskStatus[] = statusData?.statuses || []
  const tags: TaskTag[] = tagData?.tags || []
  const tasks: Task[] = tasksData?.tasks || []
  const members = membersData?.members || []

  // Stats derivation
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status_name?.toLowerCase() === 'done').length
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status_name?.toLowerCase() !== 'done').length
  const unassignedTasks = tasks.filter((t) => !t.assignees || t.assignees.length === 0).length

  // Status Save (Create / Update)
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusName.trim()) {
      toast.error('Status name is required')
      return
    }

    setLoadingAction('status')
    try {
      const url = editingStatusId ? `/api/tasks/statuses/${editingStatusId}` : '/api/tasks/statuses'
      const method = editingStatusId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: statusName.trim(),
          color: statusColor,
          position: parseInt(statusPosition, 10) || 0,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save status')
      }

      toast.success(editingStatusId ? 'Status updated successfully' : 'Status created successfully')
      mutate('/api/tasks/statuses')
      mutate('/api/tasks') // Revalidate status names
      
      // Reset & Close
      setStatusName('')
      setStatusColor('#3b82f6')
      setStatusPosition('0')
      setEditingStatusId(null)
      setStatusOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Action failed')
    } finally {
      setLoadingAction(null)
    }
  }

  // Edit status helper
  const handleEditStatus = (status: TaskStatus) => {
    setEditingStatusId(status.id)
    setStatusName(status.name)
    setStatusColor(status.color)
    setStatusPosition(status.position.toString())
    setStatusOpen(true)
  }

  // Delete status helper
  const handleDeleteStatus = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return

    setLoadingAction(`delete-status-${id}`)
    try {
      const response = await fetch(`/api/tasks/statuses/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete status')
      }

      toast.success('Status deleted successfully')
      mutate('/api/tasks/statuses')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete status. Ensure no tasks are in this status.')
    } finally {
      setLoadingAction(null)
    }
  }

  // Tag Save (Create)
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) {
      toast.error('Tag name is required')
      return
    }

    setLoadingAction('tag')
    try {
      const response = await fetch('/api/tasks/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagName.trim(),
          color: tagColor,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tag')
      }

      toast.success('Tag created successfully')
      mutate('/api/tasks/tags')
      
      // Reset & Close
      setTagName('')
      setTagColor('#8b5cf6')
      setTagOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to create tag')
    } finally {
      setLoadingAction(null)
    }
  }

  // Delete tag helper
  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return

    setLoadingAction(`delete-tag-${id}`)
    try {
      const response = await fetch(`/api/tasks/tags/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tag')
      }

      toast.success('Tag deleted successfully')
      mutate('/api/tasks/tags')
      mutate('/api/tasks') // Revalidate tags applied to tasks
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete tag')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Tracker Controls</h1>
            <p className="text-muted-foreground mt-1">Configure workspace workflow settings, columns, and tags</p>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="flex items-center gap-2 text-xs font-semibold h-10 border-border">
              <ArrowLeft className="h-4 w-4" /> Back to Admin
            </Button>
          </Link>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/45 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Tasks</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/45 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Done Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{doneTasks}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/45 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{overdueTasks}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/45 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Unassigned</CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{unassignedTasks}</div>
            </CardContent>
          </Card>
        </div>

        {/* Core Settings Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Status Columns Management */}
          <Card className="border-border/45 bg-card/25 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/20 pb-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Task Statuses (Kanban Columns)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Define column ordering, names, and color tags.
                </CardDescription>
              </div>

              <Dialog open={statusOpen} onOpenChange={(open) => {
                setStatusOpen(open)
                if (!open) {
                  setEditingStatusId(null)
                  setStatusName('')
                  setStatusColor('#3b82f6')
                  setStatusPosition('0')
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary text-primary-foreground font-semibold flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Status
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] border-border bg-card">
                  <form onSubmit={handleSaveStatus} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle className="text-md font-bold">
                        {editingStatusId ? 'Edit Task Status' : 'Add Task Status'}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Configure status properties representing card columns.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="status-name" className="text-xs font-semibold">Status Name</Label>
                        <Input
                          id="status-name"
                          value={statusName}
                          onChange={(e) => setStatusName(e.target.value)}
                          placeholder="e.g. In Progress"
                          className="bg-card/45 border-border"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="status-color" className="text-xs font-semibold">Theme Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="status-color"
                              type="color"
                              value={statusColor}
                              onChange={(e) => setStatusColor(e.target.value)}
                              className="h-9 w-12 p-0.5 bg-card/45 border-border cursor-pointer shrink-0"
                            />
                            <Input
                              type="text"
                              value={statusColor}
                              onChange={(e) => setStatusColor(e.target.value)}
                              className="bg-card/45 border-border text-xs font-mono h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="status-position" className="text-xs font-semibold">Position Index</Label>
                          <Input
                            id="status-position"
                            type="number"
                            value={statusPosition}
                            onChange={(e) => setStatusPosition(e.target.value)}
                            placeholder="e.g. 0"
                            className="bg-card/45 border-border h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStatusOpen(false)}
                        className="border-border text-xs h-9"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loadingAction === 'status'}
                        className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4"
                      >
                        {loadingAction === 'status' && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        Save Status
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="pt-4 px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/15 border-b border-border/20">
                    <TableHead className="w-[10%] text-center">Pos</TableHead>
                    <TableHead className="w-[45%]">Name</TableHead>
                    <TableHead className="w-[25%]">Color</TableHead>
                    <TableHead className="w-[20%] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                        No statuses configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statuses.map((status) => (
                      <TableRow key={status.id} className="border-b border-border/20 hover:bg-muted/10">
                        <TableCell className="text-center font-mono text-xs">{status.position}</TableCell>
                        <TableCell className="font-semibold capitalize text-sm flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                          {status.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground uppercase">{status.color}</TableCell>
                        <TableCell className="text-right space-x-1 pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStatus(status)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStatus(status.id)}
                            disabled={loadingAction === `delete-status-${status.id}`}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            {loadingAction === `delete-status-${status.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tags Configuration */}
          <Card className="border-border/45 bg-card/25 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/20 pb-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Task Tags</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Manage labels used to categorize task items.
                </CardDescription>
              </div>

              <Dialog open={tagOpen} onOpenChange={(open) => {
                setTagOpen(open)
                if (!open) {
                  setTagName('')
                  setTagColor('#8b5cf6')
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary text-primary-foreground font-semibold flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Tag
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] border-border bg-card">
                  <form onSubmit={handleSaveTag} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle className="text-md font-bold">Add Task Tag</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Create tags to attach to task cards.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="tag-name" className="text-xs font-semibold">Tag Name</Label>
                        <Input
                          id="tag-name"
                          value={tagName}
                          onChange={(e) => setTagName(e.target.value)}
                          placeholder="e.g. Bug, Research"
                          className="bg-card/45 border-border"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="tag-color" className="text-xs font-semibold">Tag Color</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="tag-color"
                            type="color"
                            value={tagColor}
                            onChange={(e) => setTagColor(e.target.value)}
                            className="h-9 w-12 p-0.5 bg-card/45 border-border cursor-pointer shrink-0"
                          />
                          <Input
                            type="text"
                            value={tagColor}
                            onChange={(e) => setTagColor(e.target.value)}
                            className="bg-card/45 border-border text-xs font-mono h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTagOpen(false)}
                        className="border-border text-xs h-9"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loadingAction === 'tag'}
                        className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4"
                      >
                        {loadingAction === 'tag' && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        Save Tag
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="pt-4 px-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/15 border-b border-border/20">
                    <TableHead className="w-[50%] pl-4">Tag Name</TableHead>
                    <TableHead className="w-[30%]">Color Code</TableHead>
                    <TableHead className="w-[20%] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                        No tags configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tags.map((tag) => (
                      <TableRow key={tag.id} className="border-b border-border/20 hover:bg-muted/10">
                        <TableCell className="font-semibold capitalize text-sm pl-4 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground uppercase">{tag.color}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTag(tag.id)}
                            disabled={loadingAction === `delete-tag-${tag.id}`}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            {loadingAction === `delete-tag-${tag.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Member Activity Metrics */}
        <Card className="border-border bg-card/45 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Workspace Contributors</CardTitle>
            <CardDescription className="text-xs">
              Overview of tasks contribution across registered team members.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/15 border-b border-border/20">
                  <TableHead className="pl-6 w-[40%]">Name</TableHead>
                  <TableHead className="w-[30%]">Email Address</TableHead>
                  <TableHead className="w-[15%] text-center">Tasks Assigned</TableHead>
                  <TableHead className="w-[15%] text-center pr-6">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                      No approved members found in database.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member: any) => {
                    const assignedCount = tasks.filter((t) => t.assignees?.some((a) => a.id === member.id)).length
                    const memberOverdue = tasks.filter((t) => t.assignees?.some((a) => a.id === member.id) && t.due_date && new Date(t.due_date) < new Date() && t.status_name?.toLowerCase() !== 'done').length

                    return (
                      <TableRow key={member.id} className="border-b border-border/20 hover:bg-muted/10">
                        <TableCell className="font-semibold text-sm pl-6">{member.name || 'User'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{member.email}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">{assignedCount}</TableCell>
                        <TableCell className={`text-center text-sm font-bold pr-6 ${memberOverdue > 0 ? 'text-red-400' : 'text-muted-foreground/50'}`}>
                          {memberOverdue}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
