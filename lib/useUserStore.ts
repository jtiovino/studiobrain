import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  roles: string[]
  mainInstrument: 'guitar' | 'keyboard' | 'bass'
  preferredTuning: string
  genreInfluence: string[]
  lessonMode: boolean
  flipFretboardView: boolean
  defaultTab: 'General' | 'Mix' | 'Theory' | 'Instrument'
  gear: {
    guitar: string[]
    pedals: string[]
    interface: string
    monitors: string
    plugins: string[]
    daw: string
  }
  hasHydrated: boolean
  set: (partial: Partial<Omit<UserState, 'set' | 'hasHydrated'>>) => void
  setHasHydrated: (state: boolean) => void
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
      gear: {
        guitar: [],
        pedals: [],
        interface: '',
        monitors: '',
        plugins: [],
        daw: 'none'
      },
      hasHydrated: false,
      set: (partial) => {
        console.log('🔧 Zustand Store Update:', partial)
        console.log('🔧 Current state before update:', get())
        set((state) => {
          const newState = { ...state, ...partial }
          console.log('📦 Full gear state after update:', newState.gear)
          console.log('📦 Complete new state:', newState)
          return newState
        })
      },
      setHasHydrated: (state) => {
        set({ hasHydrated: state })
      }
    }),
    {
      name: 'studio-brain-user',
      version: 1,
      onRehydrateStorage: () => {
        console.log('💾 Zustand: Starting rehydration from localStorage')
        return (state: UserState | undefined, error: any) => {
          if (error) {
            console.error('💾 Zustand: Rehydration failed:', error)
          } else {
            console.log('💾 Zustand: Rehydration complete')
            if (state) {
              console.log('💾 Zustand: Rehydrated gear:', state.gear)
              console.log('💾 Zustand: Full rehydrated state:', state)
              state.setHasHydrated(true)
            } else {
              console.log('💾 Zustand: No state to rehydrate, setting hasHydrated to true')
              // If no state to rehydrate, still mark as hydrated
              setTimeout(() => {
                useUserStore.getState().setHasHydrated(true)
              }, 0)
            }
          }
        }
      },
      partialize: (state) => ({
        userLevel: state.userLevel,
        roles: state.roles,
        mainInstrument: state.mainInstrument,
        preferredTuning: state.preferredTuning,
        genreInfluence: state.genreInfluence,
        lessonMode: state.lessonMode,
        flipFretboardView: state.flipFretboardView,
        defaultTab: state.defaultTab,
        gear: state.gear
      })
    }
  )
)