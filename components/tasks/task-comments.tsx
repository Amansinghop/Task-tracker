'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { TaskComment } from '@/lib/db-tasks'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TaskCommentsProps {
  taskId: string
  activeUserId?: string
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function TaskComments({ taskId, activeUserId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch comments
  const { data, error, mutate } = useSWR(`/api/tasks/${taskId}/comments`, fetcher)
  const comments: TaskComment[] = data?.comments || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to post comment')
      }

      setNewComment('')
      mutate() // Re-fetch local cache
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  // Format Date helper
  const getFormattedTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
        Comments ({comments.length})
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto max-h-[260px] pr-1 space-y-3 scrollbar-thin">
        {error ? (
          <p className="text-xs text-destructive text-center py-4">Failed to load comments.</p>
        ) : !data ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 items-start">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                  {comment.user_name ? comment.user_name[0].toUpperCase() : comment.user_email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/30 border border-border/40 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-foreground">
                    {comment.user_name || 'Team Member'}
                  </span>
                  <span className="text-muted-foreground">
                    {getFormattedTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-auto pt-2 border-t border-border/30">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="bg-card/45 border-border min-h-[40px] max-h-[80px] text-xs flex-1 py-2 px-3 focus-visible:ring-1 resize-none"
          onKeyDown={(e) => {
            // Submit on Enter (without shift key)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={submitting || !newComment.trim()}
          className="bg-primary text-primary-foreground h-9 w-9 shrink-0"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
