'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface BulkCreateDialogProps {
  onSuccess: () => void;
}

interface CreatedUser {
  id: string;
  email: string;
  generatedPassword: string;
}

export function BulkCreateDialog({ onSuccess }: BulkCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [passwordsText, setPasswordsText] = useState('');
  const [dailyHoursText, setDailyHoursText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const emailLines = emailsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const passwordLines = passwordsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const dailyHoursLines = dailyHoursText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const emails = [];
    const names = [];
    const passwords = [];
    const dailyHours = [];

    for (let i = 0; i < emailLines.length; i++) {
      const line = emailLines[i];
      // Support "name email@example.com" or just "email@example.com"
      const parts = line.split(/\s+/);
      let email = '';
      let name = '';

      if (parts.length >= 2) {
        // Last part is email, everything before is name
        email = parts[parts.length - 1];
        name = parts.slice(0, -1).join(' ');
      } else if (parts.length === 1 && parts[0].includes('@')) {
        // Only email provided
        email = parts[0];
        name = email.split('@')[0]; // Use email prefix as name
      }

      if (email.includes('@')) {
        emails.push(email);
        names.push(name);
        // Use provided password or leave empty for auto-generation
        passwords.push(passwordLines[i] || '');
        // Use provided daily hours or default to 24
        const hours = parseInt(dailyHoursLines[i]) || 24;
        dailyHours.push(Math.min(24, Math.max(1, hours))); // Clamp between 1-24
      }
    }

    if (emails.length === 0) {
      setError('Please enter at least one email address (format: "name email@example.com" or "email@example.com")');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, names, passwords, dailyHours }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Bulk create failed');
        return;
      }

      setCreatedUsers(data.users);
      setShowResults(true);
      setEmailsText('');
      setPasswordsText('');
      setDailyHoursText('');
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('[v0] Bulk create error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showResults) {
      setOpen(false);
      setEmailsText('');
      setPasswordsText('');
      setDailyHoursText('');
      setError('');
    }
  };

  if (showResults) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Bulk Create Users</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Users Created Successfully</DialogTitle>
            <DialogDescription>
              {createdUsers.length} users created and auto-approved. Store these passwords securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {createdUsers.map((user) => (
              <Card key={user.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
                    </div>
                    <code className="bg-muted px-3 py-2 rounded text-xs font-mono whitespace-nowrap">
                      {user.generatedPassword}
                    </code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={() => setOpen(false)} className="w-full mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Bulk Create Users</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Create Users</DialogTitle>
          <DialogDescription>
            Enter user details (one per line). Format: "name email@example.com" or just "email@example.com". Users will be created and auto-approved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">User Details</Label>
            <textarea
              id="emails"
              placeholder="John Doe john@example.com&#10;Jane Smith jane@example.com&#10;user@example.com"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              className="w-full min-h-32 p-3 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">One per line: "name email@example.com" or "email@example.com"</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwords">Passwords (Optional)</Label>
            <textarea
              id="passwords"
              placeholder="Password1&#10;Password2&#10;(Leave empty for auto-generated passwords)"
              value={passwordsText}
              onChange={(e) => setPasswordsText(e.target.value)}
              className="w-full min-h-24 p-3 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">One per line, optional. If not provided, passwords will be auto-generated.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyHours">Daily Hours Limit (Optional)</Label>
            <textarea
              id="dailyHours"
              placeholder="8&#10;10&#10;(Leave empty for 24 hours default)"
              value={dailyHoursText}
              onChange={(e) => setDailyHoursText(e.target.value)}
              className="w-full min-h-20 p-3 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">One per line (1-24), optional. Default is 24 hours per day.</p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Users'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
