import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLastSessionTime, addSessionTime, invalidateSession, deleteSession } from '@/lib/db';
import { generateDeviceFingerprint } from '@/lib/device-fingerprint';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser() as { id: string; email: string; role: string } | null;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'Unknown';
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);

    // Get last session time
    const lastSessionTime = await getLastSessionTime(user.id, deviceFingerprint);
    
    // Calculate hours used in this session
    if (lastSessionTime) {
      const now = new Date();
      const hoursUsed = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60 * 60);
      
      // Add to daily usage
      await addSessionTime(user.id, hoursUsed);
    }

    // Delete session completely (not just mark as inactive)
    await deleteSession(user.id, deviceFingerprint);

    // Clear auth cookie
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    response.cookies.set('tasktracker-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
