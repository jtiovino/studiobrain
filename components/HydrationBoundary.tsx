'use client';

import { useEffect, useState } from 'react';

import { useUserStore } from '@/lib/useUserStore';

interface HydrationBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Ensures components only render after Zustand store has hydrated from localStorage
 * Prevents SSR hydration mismatches and ensures gear data is available
 */
export function HydrationBoundary({
  children,
  fallback,
}: HydrationBoundaryProps) {
  const [mounted, setMounted] = useState(false);
  const hasHydrated = useUserStore(state => state.hasHydrated);
  const setHasHydrated = useUserStore(state => state.setHasHydrated);

  useEffect(() => {
    setMounted(true);

    // Force hydration check after mounting
    const checkAndSetHydration = () => {
      const stored = localStorage.getItem('studio-brain-user');
      console.log(
        '🏗️ HydrationBoundary: Checking localStorage:',
        stored ? 'found' : 'not found'
      );

      if (!hasHydrated) {
        // Give Zustand a moment to hydrate, then force it
        setTimeout(() => {
          console.log('🏗️ HydrationBoundary: Forcing hydration complete');
          setHasHydrated(true);
        }, 150);
      }
    };

    checkAndSetHydration();
  }, [hasHydrated, setHasHydrated]);

  // Don't render on server or before hydration
  if (!mounted || !hasHydrated) {
    return (
      <div className="flex items-center justify-center p-4">
        {fallback || <p className="text-slate-600">Loading...</p>}
      </div>
    );
  }

  return <>{children}</>;
}
