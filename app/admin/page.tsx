'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersTable } from '@/components/users-table';
import { BulkCreateDialog } from '@/components/bulk-create-dialog';
import { CSVUploadDialog } from '@/components/csv-upload-dialog';

export default function AdminPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  const handleBulkSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Manage users and approvals</p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <Card className="bg-muted/30 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Manage user accounts in bulk or individually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <BulkCreateDialog key={refreshTrigger} onSuccess={handleBulkSuccess} />
              <Button 
                variant="outline"
                onClick={() => setShowCsvDialog(true)}
                className="border-border text-xs h-9"
              >
                CSV Bulk Operations
              </Button>
              <Link href="/admin/tasks">
                <Button className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4">
                  Manage Task Board Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Review and approve pending user signups</CardDescription>
          </CardHeader>
          <CardContent>
            <UsersTable key={refreshTrigger} />
          </CardContent>
        </Card>
      </div>

      <CSVUploadDialog 
        isOpen={showCsvDialog} 
        onClose={() => setShowCsvDialog(false)}
        onSuccess={handleBulkSuccess}
      />
    </main>
  );
}
