import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteOtherSessions, updateUserStatus, ensureDbInitialized } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database tables are initialized
    await ensureDbInitialized()

    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete all sessions for this user (revoke access)
    // This will force them to log out
    await deleteOtherSessions(id, 'revoked-by-admin');

    // Update user status to pending
    await updateUserStatus(id, 'pending');

    return NextResponse.json(
      {
        message: 'User access revoked and status changed to pending. They will be logged out on next activity.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Revoke user error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke user access' },
      { status: 500 }
    );
  }
}
