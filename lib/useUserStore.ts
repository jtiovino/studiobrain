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
  set: (partial: Partial<Omit<UserState, 'set'>>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
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
      set: (partial) => set((state) => ({ ...state, ...partial }))
    }),
    {
      name: 'studio-brain-user'
    }
  )
)