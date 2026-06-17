type SseWriter = WritableStreamDefaultWriter<any>

// Store writers globally to persist across Next.js HMR in development
const globalForSse = global as unknown as {
  sseClients?: Set<SseWriter>
  heartbeatInterval?: NodeJS.Timeout
}

if (!globalForSse.sseClients) {
  globalForSse.sseClients = new Set<SseWriter>()
}

const clients = globalForSse.sseClients

// Heartbeat to keep connections alive (every 25 seconds)
if (!globalForSse.heartbeatInterval) {
  globalForSse.heartbeatInterval = setInterval(() => {
    broadcastSseEvent('ping', { time: new Date().toISOString() })
  }, 25000)
}

export function addSseClient(writer: SseWriter) {
  clients.add(writer)
  console.log(`[SSE] Client connected. Total clients: ${clients.size}`)
}

export function removeSseClient(writer: SseWriter) {
  clients.delete(writer)
  console.log(`[SSE] Client disconnected. Total clients: ${clients.size}`)
}

export function broadcastSseEvent(event: string, data: any) {
  if (clients.size === 0) return

  const encoder = new TextEncoder()
  const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  const deadWriters: SseWriter[] = []

  clients.forEach((writer) => {
    try {
      writer.write(payload).catch((err) => {
        console.error('[SSE] Failed to write to client:', err)
        deadWriters.push(writer)
      })
    } catch (err) {
      console.error('[SSE] Error sending SSE payload:', err)
      deadWriters.push(writer)
    }
  })

  // Clean up any closed writers
  deadWriters.forEach((writer) => {
    clients.delete(writer)
  })
}
