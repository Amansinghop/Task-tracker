import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deleteTag } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

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
    const success = await deleteTag(id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 400 })
    }

    // Broadcast SSE update
    broadcastSseEvent('tag_deleted', { id, actor: user.email })

    return NextResponse.json({ message: 'Tag deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('[API Tag Detail] DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
