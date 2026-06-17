import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { updateStatus, deleteStatus } from '@/lib/db-tasks'
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

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, color, position } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const updated = await updateStatus(id, name, color, position || 0)
    if (!updated) {
      return NextResponse.json({ error: 'Status not found or update failed' }, { status: 404 })
    }

    // Broadcast SSE update
    broadcastSseEvent('status_updated', { status: updated, actor: user.email })

    return NextResponse.json({ message: 'Status updated successfully', status: updated }, { status: 200 })
  } catch (error) {
    console.error('[API Status Detail] PATCH error:', error)
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

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const success = await deleteStatus(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete status. Ensure it has no active tasks.' },
        { status: 400 }
      )
    }

    // Broadcast SSE update
    broadcastSseEvent('status_deleted', { id, actor: user.email })

    return NextResponse.json({ message: 'Status deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('[API Status Detail] DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
