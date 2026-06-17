'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Pending Approval</CardTitle>
          <CardDescription>Your account is awaiting admin approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center p-6 bg-primary/10 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-2">Thank you for signing up!</p>
                <p className="text-sm text-muted-foreground">
                  Your account is currently under review. An administrator will approve or reject your request soon.
                </p>
              </div>
            </div>

            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium text-foreground">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>The admin team will review your signup request</li>
                <li>You'll receive an email once your account is approved</li>
                <li>Return here to login once approved</li>
              </ul>
            </div>
          </div>

          <Button onClick={handleLogout} variant="outline" className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
