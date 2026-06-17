import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUser, createUser, updateUserStatus, deleteUser, query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const runtime = "nodejs";

interface CSVRow {
  action: 'add' | 'update' | 'approve' | 'reject' | 'delete';
  email: string;
  name?: string;
  password?: string;
  role?: 'user' | 'admin';
  license_days?: number;
  status?: 'pending' | 'approved' | 'rejected';
  max_daily_hours?: number;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip empty lines and comments
    if (!lines[i].trim() || lines[i].startsWith('#')) continue;

    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 2) continue;

    // Parse max_daily_hours (8th column)
    let max_daily_hours = 24;
    if (parts[7]) {
      const h = parseInt(parts[7]);
      max_daily_hours = !isNaN(h) && h >= 1 && h <= 24 ? h : 24;
    }

    const row: CSVRow = {
      action: (parts[0].toLowerCase() as any) || 'add',
      email: parts[1],
      name: parts[2] || parts[1].split('@')[0],
      password: parts[3],
      role: (parts[4] as any) || 'user',
      license_days: parseInt(parts[5] || '30'),
      status: (parts[6] as any) || 'pending',
      max_daily_hours,
    };

    rows.push(row);
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in CSV' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of rows) {
      try {
        if (row.action === 'add') {
          // Add or update user
          const existingUser = await getUser(row.email);
          if (existingUser) {
            // User exists - update
            const newHash = row.password ? await hashPassword(row.password) : null;
            if (newHash) {
              await query(
                `UPDATE users SET name = $1, role = $2, status = $3, license_start = CURRENT_DATE, license_end = CURRENT_DATE + ($4 || ' days')::INTERVAL, max_daily_hours = $6, updated_at = NOW() 
                 WHERE email = $5`,
                [row.name, row.role, row.status || 'approved', row.license_days || 30, row.email, row.max_daily_hours || 24]
              );
            } else {
              await query(
                `UPDATE users SET name = $1, role = $2, status = $3, license_start = CURRENT_DATE, license_end = CURRENT_DATE + ($4 || ' days')::INTERVAL, max_daily_hours = $6, updated_at = NOW() 
                 WHERE email = $5`,
                [row.name, row.role, row.status || 'approved', row.license_days || 30, row.email, row.max_daily_hours || 24]
              );
            }
            results.success++;
          } else {
            // Create new user
            if (!row.password) {
              results.errors.push(`${row.email}: Password required for new users`);
              results.failed++;
              continue;
            }
            const hash = await hashPassword(row.password);
            await query(
              `INSERT INTO users (name, email, password_hash, role, status, license_start, license_end, max_daily_hours, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + ($6 || ' days')::INTERVAL, $7, NOW(), NOW())`,
              [row.name, row.email, hash, row.role || 'user', row.status || 'pending', row.license_days || 30, row.max_daily_hours || 24]
            );
            results.success++;
          }
        } else if (row.action === 'approve') {
          await query(
            `UPDATE users SET status = 'approved', license_start = CURRENT_DATE, license_end = CURRENT_DATE + ($1 || ' days')::INTERVAL, max_daily_hours = $3, updated_at = NOW() 
             WHERE email = $2`,
            [row.license_days || 30, row.email, row.max_daily_hours || 24]
          );
          results.success++;
        } else if (row.action === 'reject') {
          await query(
            `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE email = $1`,
            [row.email]
          );
          results.success++;
        } else if (row.action === 'delete') {
          const user = await getUser(row.email);
          if (user) {
            await deleteUser(user.id);
            results.success++;
          } else {
            results.errors.push(`${row.email}: User not found`);
            results.failed++;
          }
        }
      } catch (err) {
        results.errors.push(`${row.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        results.failed++;
      }
    }

    return NextResponse.json(
      {
        message: 'CSV processing complete',
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] CSV upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV' },
      { status: 500 }
    );
  }
}
