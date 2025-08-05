import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionData {
  lastInput: string;
  lastOutput: string;
}

interface SessionState extends SessionData {
  setSession: (data: Partial<SessionData>) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    set => ({
      lastInput: '',
      lastOutput: '',
      setSession: data => set(state => ({ ...state, ...data })),
    }),
    {
      name: 'studio-brain-session',
    }
  )
);
