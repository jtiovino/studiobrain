import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GearItem, GearChain } from './gearService';

interface UserState {
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  roles: string[];
  mainInstrument: 'guitar' | 'keyboard' | 'bass';
  preferredTuning: string;
  genreInfluence: string[];
  lessonMode: boolean;
  flipFretboardView: boolean;
  defaultTab: 'General' | 'Mix' | 'Theory' | 'Instrument';
  currentTab: 'general' | 'mix' | 'theory' | 'instrument' | 'practice';
  gear: {
    guitar: string[];
    pedals: string[];
    interface: string;
    monitors: string;
    plugins: string[];
    daw: string;
  };
  gearChains: {
    selectedMode: 'studiobrainSuggestion' | 'customChain';
    studioBrainChain: GearItem[];
    customChain: GearItem[];
    savedChains: GearChain[];
  };
  hasHydrated: boolean;
  set: (
    partial:
      | Partial<Omit<UserState, 'set' | 'hasHydrated'>>
      | ((state: UserState) => UserState)
  ) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      userLevel: 'beginner',
      roles: ['guitarist'],
      mainInstrument: 'guitar',
      preferredTuning: 'Standard (E-A-D-G-B-E)',
      genreInfluence: [],
      lessonMode: false,
      flipFretboardView: false,
      defaultTab: 'General',
      currentTab: 'general',
      gear: {
        guitar: [],
        pedals: [],
        interface: '',
        monitors: '',
        plugins: [],
        daw: 'none',
      },
      gearChains: {
        selectedMode: 'studiobrainSuggestion',
        studioBrainChain: [],
        customChain: [],
        savedChains: [],
      },
      hasHydrated: false,
      set: partial => {
        console.log('🔧 Zustand Store Update:', partial);
        console.log('🔧 Current state before update:', get());

        if (typeof partial === 'function') {
          // Functional update pattern
          set(state => {
            const newState = partial(state);
            console.log(
              '📦 Complete new state after functional update:',
              newState
            );
            return newState;
          });
        } else {
          // Object update pattern
          set(state => {
            const newState = { ...state, ...partial };

            // Check if the update actually changes anything to prevent unnecessary renders
            const hasChanged = Object.keys(partial).some(key => {
              const currentVal = state[key as keyof typeof state];
              const newVal = partial[key as keyof typeof partial];

              // Deep comparison for objects
              if (
                typeof currentVal === 'object' &&
                typeof newVal === 'object' &&
                currentVal !== null &&
                newVal !== null
              ) {
                return JSON.stringify(currentVal) !== JSON.stringify(newVal);
              }

              return currentVal !== newVal;
            });

            if (!hasChanged) {
              console.log('🔧 No actual change detected, skipping update');
              return state; // Return current state if no change
            }

            console.log('📦 Full gear state after update:', newState.gear);
            console.log('📦 Complete new state:', newState);
            return newState;
          });
        }
      },
      setHasHydrated: state => {
        set({ hasHydrated: state });
      },
    }),
    {
      name: 'studio-brain-user',
      version: 1,
      onRehydrateStorage: () => {
        console.log('💾 Zustand: Starting rehydration from localStorage');
        return (state: UserState | undefined, error: unknown) => {
          if (error) {
            console.error('💾 Zustand: Rehydration failed:', error);
          } else {
            console.log('💾 Zustand: Rehydration complete');
            if (state) {
              console.log('💾 Zustand: Rehydrated gear:', state.gear);
              console.log('💾 Zustand: Full rehydrated state:', state);
              state.setHasHydrated(true);
            } else {
              console.log(
                '💾 Zustand: No state to rehydrate, setting hasHydrated to true'
              );
              // If no state to rehydrate, still mark as hydrated
              setTimeout(() => {
                useUserStore.getState().setHasHydrated(true);
              }, 0);
            }
          }
        };
      },
      partialize: state => ({
        userLevel: state.userLevel,
        roles: state.roles,
        mainInstrument: state.mainInstrument,
        preferredTuning: state.preferredTuning,
        genreInfluence: state.genreInfluence,
        lessonMode: state.lessonMode,
        flipFretboardView: state.flipFretboardView,
        defaultTab: state.defaultTab,
        currentTab: state.currentTab,
        gear: state.gear,
        gearChains: state.gearChains,
      }),
    }
  )
);
