import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUser, ensureDbInitialized } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Ensure database tables are initialized
    await ensureDbInitialized()

    const body = await request.json();
    const { email, password, confirmPassword, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await getUser(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password and create user with license dates
    const passwordHash = await hashPassword(password);
    const licenseStart = new Date().toISOString().split('T')[0]; // today
    const licenseEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from today
    const newUser = await createUser(name, email, passwordHash, licenseStart, licenseEnd);

    return NextResponse.json(
      {
        message: 'Signup successful. Your account is pending admin approval.',
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed. Please try again.' },
      { status: 500 }
    );
  }
}
