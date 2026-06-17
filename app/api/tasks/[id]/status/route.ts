import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTask, updateTask } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

export async function PATCH(
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
    const { status_id } = body

    if (!status_id) {
      return NextResponse.json({ error: 'status_id is required' }, { status: 400 })
    }

    // Check if task exists
    const task = await getTask(id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const success = await updateTask(id, {
      status_id,
      last_updated_by: user.userId
    })

    if (!success) {
      return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 })
    }

    const updatedTask = await getTask(id)
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task updated but failed to retrieve details' }, { status: 500 })
    }

    // Broadcast SSE update specifically for status change
    broadcastSseEvent('task_status_changed', { task: updatedTask, actor: user.email })

    return NextResponse.json({ message: 'Task status updated successfully', task: updatedTask }, { status: 200 })
  } catch (error) {
    console.error('[API Task Status Update] PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
