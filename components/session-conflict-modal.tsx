import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionConflictModal({ isOpen, onClose }: SessionConflictModalProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear cookie and redirect to login
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Conflict</AlertDialogTitle>
          <AlertDialogDescription>
            Your account was logged in from another device. Your previous session has been ended. You are now logged in on this device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogAction onClick={handleLogout}>
          Understood
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
