'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionConflictModal } from '@/components/session-conflict-modal';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionConflict, setShowSessionConflict] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('pending')) {
          router.push('/pending');
          router.refresh();
          return;
        }
        if (data.error?.includes('rejected')) {
          router.push('/denied');
          router.refresh();
          return;
        }
        setError(data.error || 'Login failed');
        return;
      }

      if (data.hasOtherSession) {
        setShowSessionConflict(true);
        setTimeout(() => {
          router.refresh();
          if (data.user?.status === 'pending') {
            router.push('/pending');
          } else if (data.user?.status === 'rejected') {
            router.push('/denied');
          } else if (data.user?.status === 'approved') {
            if (data.user?.role === 'admin') {
              router.push('/admin');
            } else {
              router.push('/');
            }
          }
        }, 2000);
        return;
      }

      // Refresh router cache first so middleware sees the new auth cookie
      router.refresh();
      if (data.user?.status === 'pending') {
        router.push('/pending');
      } else if (data.user?.status === 'rejected') {
        router.push('/denied');
      } else if (data.user?.status === 'approved') {
        if (data.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
      
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('[v0] Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md border-border/45 bg-card/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-border/60 transition-all duration-300">
        <CardHeader className="space-y-1.5 pb-5">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Login</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your credentials to access the workspace dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card/30 border-border h-10 text-sm"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-card/30 border-border h-10 text-sm"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-medium leading-normal animate-pulse">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground font-semibold h-10 flex items-center justify-center gap-2 mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-bold transition-all">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <SessionConflictModal isOpen={showSessionConflict} onClose={() => setShowSessionConflict(false)} />
    </>
  );
}