import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAllTasks, createTask, getTask } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const assignee = searchParams.get('assignee') || undefined
    const tag = searchParams.get('tag') || undefined
    const search = searchParams.get('search') || undefined
    const mine = searchParams.get('mine') === 'true'

    const tasks = await getAllTasks({
      status,
      priority,
      assignee,
      tag,
      search,
      mine,
      userId: user.userId
    })

    return NextResponse.json({ tasks }, { status: 200 })
  } catch (error) {
    console.error('[API Tasks] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, status_id, priority, start_date, due_date, deliverable, effort_level, assigneeIds, tagIds } = body

    if (!name || !status_id) {
      return NextResponse.json({ error: 'Name and status_id are required' }, { status: 400 })
    }

    const taskId = await createTask({
      name,
      description: description || '',
      status_id,
      priority: priority || 'Medium',
      start_date: start_date || null,
      due_date: due_date || null,
      deliverable: deliverable || '',
      effort_level: effort_level || '',
      created_by: user.userId,
      assigneeIds: assigneeIds || [],
      tagIds: tagIds || []
    })

    if (!taskId) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    const createdTask = await getTask(taskId)
    if (!createdTask) {
      return NextResponse.json({ error: 'Task created but failed to retrieve detail' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('task_created', { task: createdTask, actor: user.email })

    return NextResponse.json({ message: 'Task created successfully', task: createdTask }, { status: 201 })
  } catch (error) {
    console.error('[API Tasks] POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
