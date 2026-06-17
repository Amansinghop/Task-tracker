import { NextRequest, NextResponse } from 'next/server';
import { getUser, createUserSession, getAllActiveSessions, deleteOtherSessions, canUserLogin, ensureDbInitialized } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';
import { generateDeviceFingerprint, generateTokenHash } from '@/lib/device-fingerprint';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Ensure database tables are initialized before any queries
    await ensureDbInitialized()

    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUser(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check user status
    if (user.status === 'rejected') {
      return NextResponse.json(
        { error: 'Your account has been rejected. Contact admin for more information.' },
        { status: 403 }
      );
    }

    if (user.status === 'pending') {
      return NextResponse.json(
        { error: 'Your account is pending admin approval.' },
        { status: 403 }
      );
    }

    // Check daily hour limit
    const canLogin = await canUserLogin(user.id);
    if (!canLogin.allowed) {
      return NextResponse.json(
        { error: canLogin.reason || 'Daily usage limit reached. Please try again after midnight.' },
        { status: 403 }
      );
    }

    // Get device info
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'Unknown';
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);

    // Check for other active sessions
    const activeSessions = await getAllActiveSessions(user.id);
    const hasOtherSession = activeSessions.some(s => s.device_fingerprint !== deviceFingerprint);

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // Create session record
    const tokenHash = generateTokenHash(token);
    await createUserSession(user.id, deviceFingerprint, tokenHash, ipAddress, userAgent);

    // Delete other sessions (supersede previous login) instead of just invalidating
    await deleteOtherSessions(user.id, deviceFingerprint);

    // Create response with cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
        hasOtherSession, // Flag to show popup alert if other session exists
      },
      { status: 200 }
    );

    // Set auth cookie on response
    	const isHttps = request.headers.get('x-forwarded-proto') === 'https'
               || request.headers.get('x-forwarded-ssl') === 'on';

response.cookies.set('tasktracker-token', token, {
  httpOnly: true,
  secure: isHttps, // ? only true when actually on HTTPS
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24,
});

    return response;
  } catch (error) {
    console.error('[v0] Login error:', error)
    
    // Provide more specific error messages based on error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please check your DATABASE_URL and that the server is running.' },
        { status: 500 }
      )
    }
    
    if (errorMessage.includes('certificate')) {
      return NextResponse.json(
        { error: 'Database SSL certificate error. Please verify your CA certificate is correct.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}