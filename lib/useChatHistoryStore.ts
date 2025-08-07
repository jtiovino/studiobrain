import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PracticeSessionState,
  PracticeStepState,
} from './practice-plan-schema';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  plugins?: Array<{
    name: string;
    type: string;
    description: string;
    explanation?: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  tabType: 'general' | 'mix' | 'theory' | 'instrument' | 'practice';
  messages: Message[];
  createdAt: Date;
  lastModified: Date;
}

interface ChatHistorySettings {
  maxSessions: number;
  autoSave: boolean;
}

interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  settingsSessionId: string | null; // Temporarily store session ID when navigating to settings
  settings: ChatHistorySettings;
  practiceSessions: PracticeSessionState[];

  // Actions
  createSession: (
    tabType: ChatSession['tabType'],
    firstMessage: Message
  ) => string;
  addMessageToSession: (sessionId: string, message: Message) => void;
  loadSession: (sessionId: string) => ChatSession | null;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  duplicateSession: (sessionId: string) => string;
  setCurrentSession: (sessionId: string | null) => void;
  setSettingsSession: (sessionId: string | null) => void;
  restoreFromSettings: () => void;
  clearAllSessions: () => void;
  getSessionsByTab: (tabType: ChatSession['tabType']) => ChatSession[];
  searchSessions: (query: string) => ChatSession[];
  exportSessions: () => string;
  importSessions: (jsonData: string) => boolean;

  // Practice Session Actions
  getPracticeSession: (sessionId: string) => PracticeSessionState | null;
  updatePracticeSession: (
    sessionId: string,
    updates: Partial<PracticeSessionState>
  ) => void;
  updateStepState: (
    sessionId: string,
    stepIndex: number,
    stepUpdates: Partial<PracticeStepState>
  ) => void;
}

// Helper function to generate session title from first user message
const generateTitle = (firstMessage: Message): string => {
  const content = firstMessage.content.trim();
  const words = content.split(' ').slice(0, 6); // First 6 words
  let title = words.join(' ');

  if (content.length > title.length) {
    title += '...';
  }

  return title || 'New Chat';
};

// Helper function to generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      settingsSessionId: null,
      settings: {
        maxSessions: 50,
        autoSave: true,
      },
      practiceSessions: [],

      createSession: (tabType, firstMessage) => {
        const sessionId = generateSessionId();
        const now = new Date();

        const newSession: ChatSession = {
          id: sessionId,
          title: generateTitle(firstMessage),
          tabType,
          messages: [firstMessage],
          createdAt: now,
          lastModified: now,
        };

        set(state => {
          let sessions = [...state.sessions, newSession];

          // Enforce max sessions limit
          if (sessions.length > state.settings.maxSessions) {
            // Remove oldest sessions first (keep most recently modified)
            sessions = sessions
              .sort(
                (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
              )
              .slice(0, state.settings.maxSessions);
          }

          return {
            sessions,
            currentSessionId: sessionId,
          };
        });

        return sessionId;
      },

      addMessageToSession: (sessionId, message) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  lastModified: new Date(),
                }
              : session
          ),
        }));
      },

      loadSession: sessionId => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          set({ currentSessionId: sessionId });
          return session;
        }
        return null;
      },

      deleteSession: sessionId => {
        set(state => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          currentSessionId:
            state.currentSessionId === sessionId
              ? null
              : state.currentSessionId,
        }));
      },

      renameSession: (sessionId, newTitle) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, title: newTitle, lastModified: new Date() }
              : session
          ),
        }));
      },

      duplicateSession: sessionId => {
        const originalSession = get().sessions.find(s => s.id === sessionId);
        if (!originalSession) return '';

        const newSessionId = generateSessionId();
        const now = new Date();

        const duplicatedSession: ChatSession = {
          ...originalSession,
          id: newSessionId,
          title: `${originalSession.title} (Copy)`,
          createdAt: now,
          lastModified: now,
        };

        set(state => ({
          sessions: [...state.sessions, duplicatedSession],
        }));

        return newSessionId;
      },

      setCurrentSession: sessionId => {
        set({ currentSessionId: sessionId });
      },

      setSettingsSession: sessionId => {
        set({ settingsSessionId: sessionId });
      },

      restoreFromSettings: () => {
        const { settingsSessionId } = get();
        set({
          currentSessionId: settingsSessionId,
          settingsSessionId: null,
        });
      },

      clearAllSessions: () => {
        set({
          sessions: [],
          currentSessionId: null,
        });
      },

      getSessionsByTab: tabType => {
        return get()
          .sessions.filter(session => session.tabType === tabType)
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      },

      searchSessions: query => {
        const lowercaseQuery = query.toLowerCase();
        return get()
          .sessions.filter(
            session =>
              session.title.toLowerCase().includes(lowercaseQuery) ||
              session.messages.some(message =>
                message.content.toLowerCase().includes(lowercaseQuery)
              )
          )
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      },

      exportSessions: () => {
        const { sessions, settings } = get();
        return JSON.stringify({ sessions, settings }, null, 2);
      },

      importSessions: jsonData => {
        try {
          const data = JSON.parse(jsonData);
          if (data.sessions && Array.isArray(data.sessions)) {
            set({
              sessions: data.sessions.map(
                (session: Record<string, unknown>) => ({
                  ...session,
                  createdAt: new Date(session.createdAt),
                  lastModified: new Date(session.lastModified),
                  messages: (
                    session.messages as Array<Record<string, unknown>>
                  ).map((msg: Record<string, unknown>) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                  })),
                })
              ),
              settings: data.settings || get().settings,
            });
            return true;
          }
        } catch (error) {
          console.error('Failed to import sessions:', error);
        }
        return false;
      },

      // Practice Session Methods
      getPracticeSession: (sessionId: string) => {
        const state = get();
        return (
          state.practiceSessions.find(session => session.id === sessionId) ||
          null
        );
      },

      updatePracticeSession: (
        sessionId: string,
        updates: Partial<PracticeSessionState>
      ) => {
        set(state => ({
          practiceSessions: state.practiceSessions.map(session =>
            session.id === sessionId
              ? { ...session, ...updates, updatedAt: new Date() }
              : session
          ),
        }));
      },

      updateStepState: (
        sessionId: string,
        stepIndex: number,
        stepUpdates: Partial<PracticeStepState>
      ) => {
        set(state => ({
          practiceSessions: state.practiceSessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  stepStates: session.stepStates.map((stepState, index) =>
                    index === stepIndex
                      ? { ...stepState, ...stepUpdates }
                      : stepState
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },
    }),
    {
      name: 'studio-brain-chat-history',
    }
  )
);
