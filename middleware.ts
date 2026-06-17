import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth required
  const publicRoutes = ['/login', '/signup', '/pending', '/denied', '/api/auth/signup', '/api/auth/login'];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('tasktracker-token')?.value;

  if (!token) {
    // Redirect to login if accessing protected routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/tasks') || pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Verify token
  const decoded = await verifyToken(token);

  if (!decoded) {
    // Invalid token - redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('opsdash-token');
    return response;
  }

  // Check user status
  if (decoded.status === 'pending') {
    // Pending users can only access /pending page
    if (!pathname.startsWith('/pending') && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
  } else if (decoded.status === 'rejected') {
    // Rejected users can only access /denied page
    if (!pathname.startsWith('/denied') && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/denied', request.url));
    }
  }

  // Check admin routes
  if (pathname.startsWith('/admin')) {
    if (decoded.role !== 'admin') {
      return NextResponse.redirect(new URL('/denied', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
