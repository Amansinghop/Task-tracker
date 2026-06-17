import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAllStatuses, createStatus } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statuses = await getAllStatuses()
    return NextResponse.json({ statuses }, { status: 200 })
  } catch (error) {
    console.error('[API Statuses] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, color, position } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const newStatus = await createStatus(name, color, position || 0)
    if (!newStatus) {
      return NextResponse.json({ error: 'Failed to create status' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('status_created', { status: newStatus, actor: user.email })

    return NextResponse.json({ message: 'Status created successfully', status: newStatus }, { status: 201 })
  } catch (error) {
    console.error('[API Statuses] POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
