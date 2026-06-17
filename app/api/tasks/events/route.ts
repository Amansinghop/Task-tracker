import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { addSseClient, removeSseClient } from '@/lib/sse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    // Add client to in-memory active set
    addSseClient(writer)

    // Write initial connection success payload
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: user.userId })}\n\n`))

    // Handle connection close
    request.signal.addEventListener('abort', () => {
      removeSseClient(writer)
      try {
        writer.close()
      } catch (err) {
        // Already closed
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[SSE Route] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
