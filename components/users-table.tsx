'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Ban } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  license_start?: string;
  license_end?: string;
  max_daily_hours?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UsersTable() {
  const { data, error, isLoading, mutate } = useSWR<{ users: User[] }>(
    '/api/admin/users',
    fetcher,
    { refreshInterval: 5000 }
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingDailyHours, setEditingDailyHours] = useState<{ userId: string; hours: number } | null>(null);

  const users = data?.users || [];

  const handleApprove = async (userId: string) => {
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('[v0] Approve error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('[v0] Reject error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('[v0] Delete error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke this user\'s access? They will be logged out immediately.')) {
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('[v0] Revoke error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateDailyHours = async (userId: string, hours: number) => {
    if (hours < 1 || hours > 24) {
      alert('Daily hours must be between 1 and 24');
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDailyHours: hours }),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Update local state immediately with the new hours
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              users: currentData.users.map((u) =>
                u.id === userId ? { ...u, max_daily_hours: hours } : u
              ),
            };
          },
          false
        );
        setEditingDailyHours(null);
      } else {
        alert(responseData.error || 'Failed to update daily hours');
      }
    } catch (err) {
      console.error('[v0] Update daily hours error:', err);
      alert('Error updating daily hours');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/20 text-warning';
      case 'approved':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return '';
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading users...</div>;
  }

  if (error) {
    return <div className="text-destructive">Failed to load users</div>;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Daily Hours</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{user.name || '-'}</TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.license_start ? (
                    <div className="text-xs">
                      <div>{new Date(user.license_start).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">
                        to {new Date(user.license_end || '').toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
            <TableCell className="text-sm font-medium">
              {editingDailyHours?.userId === user.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={editingDailyHours.hours}
                    onChange={(e) =>
                      setEditingDailyHours({ userId: user.id, hours: parseInt(e.target.value) || 1 })
                    }
                    className="w-16 px-2 py-1 border border-input rounded text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateDailyHours(user.id, editingDailyHours.hours)}
                    disabled={updatingId === user.id}
                    className="text-xs h-7"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingDailyHours(null)}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                  onClick={() => setEditingDailyHours({ userId: user.id, hours: user.max_daily_hours || 24 })}
                >
                  <span>{user.max_daily_hours || 24} hrs</span>
                  <span className="text-xs text-muted-foreground">✎</span>
                </div>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(user.status)} variant="outline">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(user.id)}
                          disabled={updatingId === user.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(user.id)}
                          disabled={updatingId === user.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {user.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(user.id)}
                        disabled={updatingId === user.id}
                        className="flex items-center gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(user.id)}
                      disabled={updatingId === user.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
