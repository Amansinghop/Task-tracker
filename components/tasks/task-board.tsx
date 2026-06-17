'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Task, TaskStatus, TaskTag } from '@/lib/db-tasks'
import { TaskTableView } from './task-table-view'
import { TaskMobileNav } from './task-mobile-nav'
import { TaskCreateSheet } from './task-create-sheet'
import { TaskDetailSheet } from './task-detail-sheet'
import { TaskKanbanView } from './task-kanban-view'
import { TaskChecklistView } from './task-checklist-view'
import { useTaskEvents } from '@/hooks/use-task-events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Plus, Search, SlidersHorizontal, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Fetcher helper
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function TaskBoard() {
  // Authentication check
  const { data: userData } = useSWR('/api/auth/me', fetcher)
  const user = userData?.user

  // Bind Server-Sent Events (SSE) for real-time updates
  useTaskEvents(user?.id)

  // Views & Filters state
  const [activeTab, setActiveTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all-statuses')
  const [selectedPriority, setSelectedPriority] = useState<string>('all-priorities')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all-assignees')
  const [selectedTag, setSelectedTag] = useState<string>('all-tags')

  // Sheets/Dialogs state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  // Fetch core lookups
  const { data: statusData } = useSWR('/api/tasks/statuses', fetcher)
  const { data: tagData } = useSWR('/api/tasks/tags', fetcher)
  const { data: membersData } = useSWR('/api/tasks/members', fetcher)

  const statuses: TaskStatus[] = statusData?.statuses || []
  const tags: TaskTag[] = tagData?.tags || []
  const members = membersData?.members || []

  // Fetch tasks with query params based on state
  const buildTaskQuery = () => {
    const params = new URLSearchParams()
    
    if (search.trim()) params.append('search', search.trim())
    if (selectedStatus !== 'all-statuses') params.append('status', selectedStatus)
    if (selectedPriority !== 'all-priorities') params.append('priority', selectedPriority)
    if (selectedAssignee !== 'all-assignees') params.append('assignee', selectedAssignee)
    if (selectedTag !== 'all-tags') params.append('tag', selectedTag)
    
    if (activeTab === 'my') {
      params.append('mine', 'true')
    }
    
    return `/api/tasks?${params.toString()}`
  }

  const { data: tasksData, error: tasksError, isValidating: tasksValidating, mutate: mutateTasks } = useSWR(
    user ? buildTaskQuery() : null,
    fetcher
  )
  const tasks: Task[] = tasksData?.tasks || []

  // Keyboard shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypress when user is writing inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setCreateOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.getElementById('search-tasks-input')
        if (searchInput) {
          searchInput.focus()
        }
      } else if (e.key === '1') {
        setActiveTab('all')
      } else if (e.key === '2') {
        setActiveTab('board')
      } else if (e.key === '3') {
        setActiveTab('my')
      } else if (e.key === '4') {
        setActiveTab('checklist')
      } else if (e.key === 'Escape') {
        setCreateOpen(false)
        setDetailOpen(false)
        setSelectedTask(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Clear filters helper
  const handleClearFilters = () => {
    setSearch('')
    setSelectedStatus('all-statuses')
    setSelectedPriority('all-priorities')
    setSelectedAssignee('all-assignees')
    setSelectedTag('all-tags')
    toast.success('Filters cleared')
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  // Quick-add: create a task with just a name from the inline row
  const handleQuickAdd = async (name: string) => {
    if (!statuses.length) {
      toast.error('No task statuses configured')
      return
    }
    const defaultStatus = statuses.find((s) => s.position === 0) || statuses[0]
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          status_id: defaultStatus.id,
          priority: 'Medium',
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create task')
      }
      mutateTasks()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task')
      throw err
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      {/* Top Banner/Action Bar */}
      <div className="bg-card/30 backdrop-blur-sm border-b border-border p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Team Tasks</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Manage, track, and update tasks in real-time across your workspace.
            </p>
          </div>

          <Button 
            onClick={() => setCreateOpen(true)}
            size="sm" 
            className="bg-primary text-primary-foreground shadow hover:bg-primary/95 flex items-center gap-1.5 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-tasks-input"
              type="text"
              placeholder="Search tasks... (Press '/' to focus)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9.5 text-sm bg-card/40 border-border"
            />
          </div>

          {/* Filtering dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px] h-9.5 text-xs bg-card/40 border-border capitalize">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All Statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="capitalize">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[140px] h-9.5 text-xs bg-card/40 border-border">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-priorities">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Assignee Filter */}
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-[150px] h-9.5 text-xs bg-card/40 border-border">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-assignees">All Assignees</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[130px] h-9.5 text-xs bg-card/40 border-border capitalize">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-tags">All Tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="capitalize">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {(search || selectedStatus !== 'all-statuses' || selectedPriority !== 'all-priorities' || selectedAssignee !== 'all-assignees' || selectedTag !== 'all-tags') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-xs h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* View Switcher (Desktop tabs) */}
        <div className="hidden md:flex items-center gap-1 border-b border-border pb-1">
          {['all', 'board', 'my', 'checklist'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-md border-b-2 transition-all capitalize -mb-[5px] ${
                activeTab === tab 
                  ? 'border-primary text-foreground bg-muted/30 font-bold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Tasks' : tab === 'board' ? 'Kanban Board' : tab === 'my' ? 'My Tasks' : 'Checklist'}
            </button>
          ))}
          {tasksValidating && (
            <div className="ml-auto flex items-center gap-1.5 text-muted-foreground text-xs font-medium px-2 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Syncing...
            </div>
          )}
        </div>
      </div>

      {/* Main Grid View Container */}
      <div className="flex-1 p-4 md:p-6">
        {tasksError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <p className="text-destructive font-medium">Failed to load tasks</p>
            <Button variant="outline" size="sm" onClick={() => mutateTasks()} className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : !tasksData ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading workspace task board...</p>
          </div>
        ) : (
          <div>
            {/* View Render */}
            {activeTab === 'all' && (
              <TaskTableView 
                tasks={tasks} 
                onTaskClick={handleTaskClick} 
                onQuickAdd={handleQuickAdd}
                statuses={statuses}
                tags={tags}
                members={members}
                activeUserId={user?.id}
                isAdmin={user?.role === 'admin'}
                mutateTasks={mutateTasks}
              />
            )}
            
            {activeTab === 'board' && (
              <TaskKanbanView 
                tasks={tasks} 
                statuses={statuses} 
                onTaskClick={handleTaskClick} 
              />
            )}

            {activeTab === 'my' && (
              <TaskTableView 
                tasks={tasks} 
                onTaskClick={handleTaskClick} 
                onQuickAdd={handleQuickAdd}
                statuses={statuses}
                tags={tags}
                members={members}
                activeUserId={user?.id}
                isAdmin={user?.role === 'admin'}
                mutateTasks={mutateTasks}
              />
            )}

            {activeTab === 'checklist' && (
              <TaskChecklistView 
                tasks={tasks} 
                statuses={statuses} 
                onTaskClick={handleTaskClick} 
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <TaskMobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <TaskCreateSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        statuses={statuses}
        tags={tags}
        members={members}
      />

      <TaskDetailSheet
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedTask(null)
        }}
        task={selectedTask}
        statuses={statuses}
        tags={tags}
        members={members}
        activeUserId={user?.id}
        isAdmin={user?.role === 'admin'}
      />
    </div>
  )
}
