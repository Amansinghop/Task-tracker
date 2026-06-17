import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllUsers } from '@/lib/db';

export const runtime = "nodejs";

async function checkAdminAuth(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await checkAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();

    return NextResponse.json(
      { users },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
