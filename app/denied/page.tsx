'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeniedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          <CardDescription>Your account has been denied or you do not have permission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center p-6 bg-destructive/10 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-medium text-destructive mb-2">Access Not Granted</p>
                <p className="text-sm text-muted-foreground">
                  Your account request has been rejected. Contact the administrator if you believe this is a mistake.
                </p>
              </div>
            </div>

            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium text-foreground">What can you do?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Contact the admin team for more information</li>
                <li>You may create a new account with a different email</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLogout} variant="outline" className="flex-1">
              Logout
            </Button>
            <Button onClick={() => router.push('/signup')} className="flex-1">
              Sign Up Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
