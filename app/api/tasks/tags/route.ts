import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAllTags, createTag } from '@/lib/db-tasks'
import { broadcastSseEvent } from '@/lib/sse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tags = await getAllTags()
    return NextResponse.json({ tags }, { status: 200 })
  } catch (error) {
    console.error('[API Tags] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
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
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const newTag = await createTag(name, color)
    if (!newTag) {
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
    }

    // Broadcast SSE update
    broadcastSseEvent('tag_created', { tag: newTag, actor: user.email })

    return NextResponse.json({ message: 'Tag created successfully', tag: newTag }, { status: 201 })
  } catch (error) {
    console.error('[API Tags] POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
