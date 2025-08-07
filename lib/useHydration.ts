import { useEffect, useState } from 'react';

import { useUserStore } from './useUserStore';

/**
 * Hook to ensure Zustand hydration is complete before using the store
 * Returns true when hydration is complete
 */
export function useHydration() {
  const [isClient, setIsClient] = useState(false);
  const hasHydrated = useUserStore(state => state.hasHydrated);
  const setHasHydrated = useUserStore(state => state.setHasHydrated);

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true);

    // Check if we're actually hydrated
    const checkHydration = () => {
      console.log('🔄 Checking hydration status...');

      try {
        const stored = localStorage.getItem('studio-brain-user');
        if (stored) {
          console.log('📱 Found localStorage data');
          // If we have data but haven't hydrated yet, mark as hydrated
          if (!hasHydrated) {
            setHasHydrated(true);
          }
        } else {
          console.log('📱 No localStorage data found');
          setHasHydrated(true); // No data to hydrate, consider it "hydrated"
        }
      } catch (error) {
        console.error('❌ Error accessing localStorage:', error);
        setHasHydrated(true); // If we can't access localStorage, just proceed
      }
    };

    if (!hasHydrated) {
      checkHydration();
    }
  }, [hasHydrated, setHasHydrated]);

  // Only return true when we're on client AND hydrated
  return isClient && hasHydrated;
}
