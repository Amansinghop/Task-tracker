import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateUserStatus, deleteUser, updateUserDailyHours, ensureDbInitialized } from '@/lib/db';

export const runtime = "nodejs";

async function checkAdminAuth() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database tables are initialized
    await ensureDbInitialized()

    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, maxDailyHours } = body;
    const { id } = await params;

    console.log('[v0] PATCH request received:', { id, status, maxDailyHours });

    // Handle maxDailyHours update
    if (maxDailyHours !== undefined) {
      const hours = parseInt(maxDailyHours);
      if (isNaN(hours) || hours < 1 || hours > 24) {
        return NextResponse.json(
          { error: 'Daily hours must be between 1 and 24' },
          { status: 400 }
        );
      }
      console.log('[v0] Updating daily hours for user:', { id, hours });
      const updated = await updateUserDailyHours(id, hours);
      if (!updated) {
        console.log('[v0] User not found:', id);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      console.log('[v0] Daily hours updated successfully:', { id, hours });
      return NextResponse.json(
        {
          message: `Daily hours limit updated to ${hours} successfully`,
          user: updated,
        },
        { status: 200 }
      );
    }

    // Handle status update
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved, rejected, or pending.' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserStatus(id, status);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `User ${status} successfully`,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Update user status error:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const deleted = await deleteUser(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'User deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
