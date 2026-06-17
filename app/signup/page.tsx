import { SignupForm } from '@/components/signup-form';
import Image from 'next/image';

export const metadata = {
  title: 'Sign Up - ADRP Task Tracker',
  description: 'Create a new account',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Neon Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[15%] right-[15%] w-[350px] h-[350px] rounded-full bg-primary/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[15%] left-[15%] w-[350px] h-[350px] rounded-full bg-violet-600/15 blur-[120px] animate-pulse [animation-delay:1.5s]" />
      </div>

      <div className="w-full flex flex-col items-center justify-center max-w-md z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image 
              src="/logo.jpg" 
              alt="QInsights Logo" 
              width={75} 
              height={75}
              className="rounded-xl shadow-2xl border border-border/20"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Task Tracker
            </h1>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              Track your task with us.
            </p>
          </div>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
