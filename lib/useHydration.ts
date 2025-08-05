import { useEffect } from 'react';
import { useUserStore } from './useUserStore';

/**
 * Hook to ensure Zustand hydration is complete before using the store
 * Returns true when hydration is complete
 */
export function useHydration() {
  const hasHydrated = useUserStore(state => state.hasHydrated);
  const setHasHydrated = useUserStore(state => state.setHasHydrated);

  useEffect(() => {
    // Force hydration check after mount
    const checkHydration = () => {
      console.log('🔄 Checking hydration status...');
      const stored = localStorage.getItem('studio-brain-user');
      if (stored) {
        console.log('📱 Found localStorage data:', stored);
        // If we have data but haven't hydrated yet, wait a bit more
        if (!hasHydrated) {
          setTimeout(() => setHasHydrated(true), 100);
        }
      } else {
        console.log('📱 No localStorage data found');
        setHasHydrated(true); // No data to hydrate, consider it "hydrated"
      }
    };

    if (!hasHydrated) {
      checkHydration();
    }
  }, [hasHydrated, setHasHydrated]);

  return hasHydrated;
}
