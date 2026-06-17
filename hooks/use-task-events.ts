import { useEffect, useRef } from 'react'
import { mutate } from 'swr'
import { toast } from 'sonner'

export function useTaskEvents(activeUserId?: string) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource('/api/tasks/events')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[SSE Hook] Connected to real-time events stream')
    }

    eventSource.onerror = (err) => {
      console.error('[SSE Hook] Error in events stream:', err)
      // EventSource automatically handles reconnects
    }

    eventSource.addEventListener('connected', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      console.log('[SSE Hook] Connection established. Server confirmed User ID:', data.userId)
    })

    eventSource.addEventListener('ping', () => {
      // Keep-alive heartbeat message
    })

    // Task Creation
    eventSource.addEventListener('task_created', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      // Re-fetch all task lists
      mutate('/api/tasks')
      // Mutate specific task statuses if list matches
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })
      
      // Notify client unless they created the task
      if (data.actor && data.task) {
        toast.info(`Task "${data.task.name}" created by ${data.actor}`, {
          description: data.task.description ? `${data.task.description.substring(0, 50)}...` : undefined,
        })
      }
    })

    // Task Update
    eventSource.addEventListener('task_updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const task = data.task
      if (!task) return

      // Update specific task details if open
      mutate(`/api/tasks/${task.id}`, { task }, false)
      // Re-fetch lists
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })

      if (data.actor) {
        // Check if current user is an assignee on the task to notify specifically
        const isAssignee = task.assignees?.some((a: any) => a.id === activeUserId)
        if (isAssignee && data.actor !== task.last_updated_by_name) {
          toast.message('Task assigned to you was updated!', {
            description: `"${task.name}" updated by ${data.actor}`,
          })
        } else {
          toast.info(`Task "${task.name}" updated by ${data.actor}`)
        }
      }
    })

    // Task Status Quick-Change (e.g. Kanban drag and drop)
    eventSource.addEventListener('task_status_changed', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const task = data.task
      if (!task) return

      // Update details cache
      mutate(`/api/tasks/${task.id}`, { task }, false)
      // Re-fetch lists
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })

      if (data.actor) {
        toast.success(`"${task.name}" moved to ${task.status_name || 'new status'} by ${data.actor}`)
      }
    })

    // Task Deletion
    eventSource.addEventListener('task_deleted', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })
      
      if (data.actor) {
        toast.warning(`Task deleted by ${data.actor}`)
      }
    })

    // Status config updates
    eventSource.addEventListener('status_created', () => mutate('/api/tasks/statuses'))
    eventSource.addEventListener('status_updated', () => {
      mutate('/api/tasks/statuses')
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })
    })
    eventSource.addEventListener('status_deleted', () => mutate('/api/tasks/statuses'))

    // Tag config updates
    eventSource.addEventListener('tag_created', () => mutate('/api/tasks/tags'))
    eventSource.addEventListener('tag_deleted', () => {
      mutate('/api/tasks/tags')
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })
    })

    // Comments
    eventSource.addEventListener('comment_added', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const comment = data.comment
      if (!comment) return

      // Update comments lists
      mutate(`/api/tasks/${comment.task_id}/comments`)
      
      if (data.actor) {
        toast.message(`New comment from ${data.actor}`, {
          description: comment.content.length > 60 ? `${comment.content.substring(0, 60)}...` : comment.content,
        })
      }
    })

    return () => {
      console.log('[SSE Hook] Closing real-time events stream')
      eventSource.close()
    }
  }, [activeUserId])
}
