import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const results: any[] = [];

    // Process each line
    for (const line of dataLines) {
      const [name, email, action] = line.split(',').map((s) => s.trim());

      if (!email || !action) {
        results.push({
          email: email || 'unknown',
          status: 'error',
          message: 'Missing email or action',
        });
        continue;
      }

      // For user CSV, typically just log/validate
      // In a real scenario, you might sync data with admin
      results.push({
        email,
        name: name || email.split('@')[0],
        action,
        status: 'processed',
      });
    }

    return NextResponse.json(
      {
        message: 'CSV processed successfully',
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
