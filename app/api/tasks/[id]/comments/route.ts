import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTaskComments, createTaskComment, getTask } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const comments = await getTaskComments(id)

    return NextResponse.json({ comments }, { status: 200 })
  } catch (error) {
    console.error('[API Task Comments] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Check if task exists
    const task = await getTask(id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const newComment = await createTaskComment(id, user.userId, content.trim())
    if (!newComment) {
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('comment_added', { comment: newComment, actor: user.email })

    return NextResponse.json({ message: 'Comment added successfully', comment: newComment }, { status: 201 })
  } catch (error) {
    console.error('[API Task Comments] POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
