'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in -> Go to Dashboard
        router.replace('/dashboard');
      } else {
        // User is NOT logged in -> Go to Login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show a loading spinner while checking
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  );
}