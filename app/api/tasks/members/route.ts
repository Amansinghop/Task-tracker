import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getApprovedMembers } from '@/lib/db-tasks'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.status !== 'approved') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const members = await getApprovedMembers()
    return NextResponse.json({ members }, { status: 200 })
  } catch (error) {
    console.error('[API Members] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
