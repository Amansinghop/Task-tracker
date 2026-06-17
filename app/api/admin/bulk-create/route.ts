import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, generatePassword } from '@/lib/auth';
import { createBulkUsers, ensureDbInitialized } from '@/lib/db';

export const runtime = "nodejs";

async function checkAdminAuth() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

export async function POST(request: NextRequest) {
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
    const { emails, names, passwords, dailyHours } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. emails array required.' },
        { status: 400 }
      );
    }

    // Validate emails and names
    const validEmails: string[] = [];
    const validNames: string[] = [];
    const validPasswords: string[] = [];
    const validDailyHours: number[] = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const name = names?.[i] || email.split('@')[0]; // fallback to email prefix
      const password = passwords?.[i] || ''; // custom password or empty for auto-generation
      let hours = 24; // default
      if (dailyHours?.[i]) {
        const h = parseInt(dailyHours[i]);
        hours = !isNaN(h) && h >= 1 && h <= 24 ? h : 24;
      }
      
      if (typeof email === 'string' && email.includes('@')) {
        validEmails.push(email);
        validNames.push(name);
        validPasswords.push(password);
        validDailyHours.push(hours);
      }
    }

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails provided' },
        { status: 400 }
      );
    }

    // Generate passwords and hashes
    const generatedPasswords = new Map<string, string>();
    const usersToCreate = [];

    for (let i = 0; i < validEmails.length; i++) {
      const email = validEmails[i];
      const name = validNames[i];
      // Use custom password if provided, otherwise generate one
      const password = validPasswords[i] && validPasswords[i].length > 0 
        ? validPasswords[i] 
        : generatePassword();
      const hash = await hashPassword(password);
      
      generatedPasswords.set(email, password);
      
      usersToCreate.push({
        name: name || email.split('@')[0],
        email,
        passwordHash: hash,
        licenseStart: new Date().toISOString().split('T')[0], // today
        licenseEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from today
        status: 'approved',
        maxDailyHours: validDailyHours[i],
      });
    }

    // Create users in bulk
    const createdUsers = await createBulkUsers(usersToCreate);

    // Prepare response with generated passwords
    const usersWithPasswords = createdUsers.map((user) => ({
      ...user,
      generatedPassword: generatedPasswords.get(user.email),
    }));

    return NextResponse.json(
      {
        message: `${usersWithPasswords.length} users created successfully`,
        users: usersWithPasswords,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Bulk create error:', error);
    return NextResponse.json(
      { error: 'Failed to create users' },
      { status: 500 }
    );
  }
}
