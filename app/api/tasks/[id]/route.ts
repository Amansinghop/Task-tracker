import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTask, updateTask, deleteTask } from '@/lib/db-tasks'
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
    const task = await getTask(id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task }, { status: 200 })
  } catch (error) {
    console.error('[API Task Detail] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch task details' }, { status: 500 })
  }
}

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
    
    // Check if task exists
    const task = await getTask(id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update parameters
    const updateData: any = {
      last_updated_by: user.userId
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.status_id !== undefined) updateData.status_id = body.status_id
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.deliverable !== undefined) updateData.deliverable = body.deliverable
    if (body.effort_level !== undefined) updateData.effort_level = body.effort_level
    if (body.assigneeIds !== undefined) updateData.assigneeIds = body.assigneeIds
    if (body.tagIds !== undefined) updateData.tagIds = body.tagIds

    const success = await updateTask(id, updateData)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    const updatedTask = await getTask(id)
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task updated but failed to retrieve details' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('task_updated', { task: updatedTask, actor: user.email })

    return NextResponse.json({ message: 'Task updated successfully', task: updatedTask }, { status: 200 })
  } catch (error) {
    console.error('[API Task Detail] PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if task exists
    const task = await getTask(id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check permission: Admin can delete any task; regular users only tasks they created
    if (user.role !== 'admin' && task.created_by !== user.userId) {
      return NextResponse.json({ error: 'Forbidden. You did not create this task.' }, { status: 403 })
    }

    const success = await deleteTask(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('task_deleted', { id, actor: user.email })

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('[API Task Detail] DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
