'use client';

import React from 'react';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { HydrationBoundary } from '@/components/HydrationBoundary';
import {
  getModeChords,
  getScaleNotes,
  normalizeModeNames,
  ChordInfo,
  NoteName,
} from '@/lib/music-theory';

interface PluginSuggestion {
  name: string;
  type: string;
  description: string;
  explanation?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  plugins?: PluginSuggestion[];
}

interface TabNote {
  string: number;
  fret: number;
}
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Music,
  Guitar,
  Piano,
  Volume2,
  Lightbulb,
  Loader2,
  RotateCcw,
  History,
  X,
  BookOpen,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { OpenAIService } from '@/lib/openai-service';
import { stripMarkdown } from '@/lib/utils';
import { VoicingView } from '@/components/VoicingView';
import { ChordShape } from '@/lib/voicings';
import SettingsButton from '@/components/SettingsButton';
import { useSessionStore } from '@/lib/useSessionStore';
import {
  useChatHistoryStore,
  ChatSession,
  Message,
} from '@/lib/useChatHistoryStore';
import ChatHistoryPanel from '@/components/ChatHistoryPanel';
import { useUserStore } from '@/lib/useUserStore';

interface PianoKey {
  note: string;
  octave: number;
  fullName: string;
  isBlackKey: boolean;
  isInScale: boolean;
  isRoot: boolean;
}

export default function StudioBrain() {
  const { lastInput, lastOutput, setSession } = useSessionStore();
  const {
    currentSessionId,
    setSettingsSession,
    restoreFromSettings,
    loadSession,
    createSession,
    addMessageToSession,
    setCurrentSession,
  } = useChatHistoryStore();
  const {
    userLevel,
    preferredTuning,
    lessonMode: storeLessonMode,
    flipFretboardView,
    currentTab: storeCurrentTab,
    set,
  } = useUserStore();
  const router = useRouter();
  const [selectedInstrument] = useState('guitar');
  const [selectedChord, setSelectedChord] = useState('C');
  const [selectedMode, setSelectedMode] = useState('major');
  const [lessonMode, setLessonMode] = useState(false);
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [visualizerView, setVisualizerView] = useState<'guitar' | 'piano'>(
    'guitar'
  );
  const [scaleChangeAnimation, setScaleChangeAnimation] = useState(false);
  const [selectedTuning, setSelectedTuning] = useState('standard');
  const [tuningChangeAnimation] = useState(false);
  const [fretboardFlipped, setFretboardFlipped] = useState(false); // Default to standard view (high e on top, low E on bottom)
  const [flipAnimation, setFlipAnimation] = useState(false);
  const [selectedVoicing, setSelectedVoicing] = useState<string | null>(null);
  const [voicingView, setVoicingView] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [currentActiveTab, setCurrentActiveTabState] = useState<
    'general' | 'mix' | 'theory' | 'instrument' | 'practice'
  >('general');

  // Wrapper function to persist tab changes
  const setCurrentActiveTab = useCallback(
    (tab: 'general' | 'mix' | 'theory' | 'instrument' | 'practice') => {
      setCurrentActiveTabState(tab);
      set({ currentTab: tab });
    },
    [set]
  );

  // Chat states for different tabs - now using message arrays
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([]);
  const [generalQuestion, setGeneralQuestion] = useState('');
  const [generalLoading, setGeneralLoading] = useState(false);

  const [mixMessages, setMixMessages] = useState<ChatMessage[]>([]);
  const [mixQuestion, setMixQuestion] = useState('');
  const [mixLoading, setMixLoading] = useState(false);

  const [theoryMessages, setTheoryMessages] = useState<ChatMessage[]>([]);
  const [theoryQuestion, setTheoryQuestion] = useState('');
  const [theoryLoading, setTheoryLoading] = useState(false);

  const [instrumentMessages, setInstrumentMessages] = useState<ChatMessage[]>(
    []
  );
  const [instrumentQuestion, setInstrumentQuestion] = useState('');
  const [instrumentLoading, setInstrumentLoading] = useState(false);

  const [practiceMessages, setPracticeMessages] = useState<ChatMessage[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceFollowUp, setPracticeFollowUp] = useState('');

  // Pre-planning chat state
  const [practiceChatMessages, setPracticeChatMessages] = useState<
    ChatMessage[]
  >([]);
  const [practiceChatInput, setPracticeChatInput] = useState('');
  const [practiceChatLoading, setPracticeChatLoading] = useState(false);

  // Practice form state
  const [practiceForm, setPracticeForm] = useState({
    focus_tags: [] as string[],
    goal: '',
    time_minutes: 30,
    prior_context: {
      repeat_routine_id: null as string | null,
      known_weak_spots: [] as string[],
      known_assets: [] as string[],
    },
  });

  // Tab data state for fretboard visualization
  const [activeTabNotes, setActiveTabNotes] = useState<
    Array<{ string: number; fret: number }>
  >([]);
  const [showTabNotes, setShowTabNotes] = useState(false);

  // Refs for scroll containers
  const generalScrollRef = useRef<HTMLDivElement>(null);
  const mixScrollRef = useRef<HTMLDivElement>(null);
  const theoryScrollRef = useRef<HTMLDivElement>(null);
  const instrumentScrollRef = useRef<HTMLDivElement>(null);
  const practiceScrollRef = useRef<HTMLDivElement>(null);

  // Ref to track if refresh detection has already run (prevents infinite loops)
  const hasRunRefreshDetection = useRef(false);

  // State to track if user has scrolled up
  const [isUserScrolled, setIsUserScrolled] = useState({
    general: false,
    mix: false,
    theory: false,
    instrument: false,
    practice: false,
  });

  // Helper functions to convert between ChatMessage and Message formats
  const chatMessageToMessage = useCallback(
    (chatMsg: ChatMessage): Message => ({
      role: chatMsg.type as 'user' | 'assistant',
      content: chatMsg.content,
      timestamp: new Date(chatMsg.timestamp),
      plugins: chatMsg.plugins,
    }),
    []
  );

  const messageToChatMessage = useCallback((msg: Message): ChatMessage => {
    const timestampValue =
      msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp;
    return {
      id: `${msg.role}-${timestampValue}-${Math.random().toString(36).substr(2, 9)}`,
      type: msg.role,
      content: msg.content,
      timestamp: timestampValue,
      plugins: msg.plugins,
    };
  }, []);

  // Session management handlers
  const handleSessionSelect = useCallback(
    (session: ChatSession) => {
      // Load session messages into the appropriate tab
      const chatMessages = session.messages.map(messageToChatMessage);

      switch (session.tabType) {
        case 'general':
          setGeneralMessages(chatMessages);
          break;
        case 'mix':
          setMixMessages(chatMessages);
          break;
        case 'theory':
          setTheoryMessages(chatMessages);
          break;
        case 'instrument':
          setInstrumentMessages(chatMessages);
          break;
        case 'practice':
          setPracticeMessages(chatMessages);
          break;
      }

      // Set current session and close history panel
      setCurrentSession(session.id);
      setCurrentActiveTab(session.tabType);
      setShowChatHistory(false);
    },
    [messageToChatMessage, setCurrentSession, setCurrentActiveTab]
  );

  const handleNewSession = (tabType: ChatSession['tabType']) => {
    // Clear messages for the specific tab
    switch (tabType) {
      case 'general':
        setGeneralMessages([]);
        break;
      case 'mix':
        setMixMessages([]);
        break;
      case 'theory':
        setTheoryMessages([]);
        break;
      case 'instrument':
        setInstrumentMessages([]);
        break;
      case 'practice':
        setPracticeMessages([]);
        break;
    }

    // Set current tab and clear current session
    setCurrentActiveTab(tabType);
    setCurrentSession(null);
    setShowChatHistory(false);
  };

  // Auto-save messages to history
  const saveMessagesToHistory = useCallback(
    (tabType: ChatSession['tabType'], messages: ChatMessage[]) => {
      if (messages.length === 0) return;

      const historyMessages = messages.map(chatMessageToMessage);

      if (currentSessionId) {
        // Update existing session with new messages
        const currentSession = loadSession(currentSessionId);
        if (
          currentSession &&
          messages.length > currentSession.messages.length
        ) {
          // Only add new messages
          const newMessages = historyMessages.slice(
            currentSession.messages.length
          );
          newMessages.forEach(msg => {
            addMessageToSession(currentSessionId, msg);
          });
        }
      } else if (messages.length > 0) {
        // Create new session with first message
        const firstMessage = historyMessages[0];
        const sessionId = createSession(tabType, firstMessage);
        setCurrentSession(sessionId);

        // Add remaining messages if any
        if (historyMessages.length > 1) {
          historyMessages.slice(1).forEach(msg => {
            addMessageToSession(sessionId, msg);
          });
        }
      }
    },
    [
      currentSessionId,
      loadSession,
      createSession,
      setCurrentSession,
      addMessageToSession,
      chatMessageToMessage,
    ]
  );

  // Generate chords based on selected root and mode using proper music theory
  const generateChords = (): ChordInfo[] => {
    const root = selectedChord as NoteName;
    const mode = normalizeModeNames(selectedMode);
    const chords = getModeChords(root, mode);

    // Debug: Check for C minor specifically
    if (root === 'C' && mode === 'aeolian') {
      console.log(
        '🔍 C MINOR DEBUG:',
        chords.map(c => `${c.scaleDegree}:${c.name}(${c.root})`)
      );
    }

    return chords;
  };

  // Generate scale notes for visualization using proper music theory
  const generateScaleNotes = (): string[] => {
    const root = selectedChord as NoteName;
    const mode = normalizeModeNames(selectedMode);
    return getScaleNotes(root, mode);
  };

  // Helper function to describe chord functions
  const getFunctionDescription = (func: string): string => {
    const descriptions: Record<string, string> = {
      tonic: 'Home chord, provides stability and resolution',
      subdominant: 'Departure from home, creates forward motion',
      dominant: 'Strong pull back to tonic, creates tension',
      mediant: 'Bridge between tonic and dominant, gentle movement',
      submediant: 'Relative minor/major, provides contrast',
      'leading-tone': 'Strong pull to tonic, creates tension',
      supertonic: 'Often leads to dominant, creates movement',
    };
    return descriptions[func] || 'Provides harmonic color and movement';
  };

  // Refs for cleanup
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMounted = useRef(true);

  // Cleanup function for timeouts
  const addTimeout = (timeout: NodeJS.Timeout) => {
    timeoutRefs.current.add(timeout);
    return timeout;
  };

  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  };

  // Handle scale change with animation
  const handleScaleChange = (root: string, mode: string) => {
    setScaleChangeAnimation(true);
    setSelectedChord(root);
    setSelectedMode(mode);

    // Reset animation after a short delay
    addTimeout(
      setTimeout(() => {
        if (isMounted.current) {
          setScaleChangeAnimation(false);
        }
      }, 600)
    );
  };

  // Function to handle fretboard flip with animation
  const handleFretboardFlip = () => {
    setFlipAnimation(true);
    setFretboardFlipped(!fretboardFlipped);

    // Reset animation after a short delay
    addTimeout(
      setTimeout(() => {
        if (isMounted.current) {
          setFlipAnimation(false);
        }
      }, 400)
    );
  };

  // Function to go back from voicing view
  const handleBackFromVoicing = () => {
    setVoicingView(false);
    setSelectedVoicing(null);
  };

  // Function to navigate to settings for tuning change
  const handleChangeTuning = () => {
    console.log('🔧 Navigating to settings from tab:', currentActiveTab);
    console.log('🔧 Current session ID before navigation:', currentSessionId);

    // Force save current tab messages before navigation
    const getCurrentTabMessages = () => {
      switch (currentActiveTab) {
        case 'general':
          return generalMessages;
        case 'mix':
          return mixMessages;
        case 'theory':
          return theoryMessages;
        case 'instrument':
          return instrumentMessages;
        case 'practice':
          return practiceMessages;
        default:
          return [];
      }
    };

    const currentMessages = getCurrentTabMessages();
    console.log(
      '💾 Saving',
      currentMessages.length,
      'messages for tab:',
      currentActiveTab
    );

    if (currentMessages.length > 0) {
      saveMessagesToHistory(currentActiveTab, currentMessages);
    }

    // Verify session creation if no current session exists
    if (!currentSessionId && currentMessages.length > 0) {
      console.log('⚠️ No session ID but messages exist - creating session');
      const firstMessage = chatMessageToMessage(currentMessages[0]);
      const newSessionId = createSession(currentActiveTab, firstMessage);
      setCurrentSession(newSessionId);
      console.log('✅ Created new session:', newSessionId);
    }

    // Store current session and tab before navigating to settings
    console.log('🏪 Storing session ID:', currentSessionId);
    console.log('🏪 Storing current tab:', currentActiveTab);

    // Double-verify the session gets stored
    const sessionToStore = currentSessionId;
    setSettingsSession(sessionToStore);
    set({ currentTab: currentActiveTab });

    // Verify storage worked
    setTimeout(() => {
      const stored = useChatHistoryStore.getState().settingsSessionId;
      console.log('✅ Verified stored session ID:', stored);
      console.log(
        '✅ Verified stored tab:',
        useUserStore.getState().currentTab
      );
    }, 100);

    router.push('/settings');
  };

  // Function to clear tab notes
  const clearTabNotes = () => {
    setActiveTabNotes([]);
    setShowTabNotes(false);
  };

  const loadTabMessages = (
    tabType: 'general' | 'mix' | 'theory' | 'instrument' | 'practice'
  ): ChatMessage[] => {
    if (!currentSessionId) return [];

    const session = loadSession(currentSessionId);
    if (!session || session.tabType !== tabType) return [];

    return session.messages.map(msg => ({
      id: `${msg.role}-${msg.timestamp.getTime()}`,
      type: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.getTime(),
      plugins: msg.plugins,
    }));
  };

  // Function to navigate to settings page
  const handleSettingsClick = (e: React.MouseEvent) => {
    console.log('Settings clicked!'); // Debug log
    e.preventDefault();
    e.stopPropagation();
    router.push('/settings');
  };

  // Function to handle chord playback using Web Audio API
  const handlePlayChord = (chord: ChordShape) => {
    console.log('Playing chord:', chord.name, 'with frets:', chord.frets);

    // Simple audio feedback using Web Audio API
    try {
      if (typeof window === 'undefined') return;

      // Check for Web Audio API support
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        console.log('Web Audio API not supported');
        return;
      }

      const audioContext = new AudioContextClass();

      // Handle audio context state
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.log('Could not resume audio context:', err);
          return;
        });
      }

      const now = audioContext.currentTime;

      // Get notes from fret positions (simplified mapping)
      const stringNotes = currentTuning.strings;
      if (!stringNotes || !Array.isArray(stringNotes)) {
        console.log('Invalid tuning data');
        return;
      }

      const playableNotes = chord.frets
        .map((fret, index) => {
          if (fret === null || index >= stringNotes.length) return null; // muted string or invalid index
          const stringNote = stringNotes[index];
          if (!stringNote) return null;

          // Simple note frequency calculation (very basic)
          const noteFreqs: { [key: string]: number } = {
            E: 82.41,
            F: 87.31,
            'F#': 92.5,
            G: 98.0,
            'G#': 103.83,
            A: 110.0,
            'A#': 116.54,
            B: 123.47,
            C: 130.81,
            'C#': 138.59,
            D: 146.83,
            'D#': 155.56,
          };
          const baseFreq = noteFreqs[stringNote] || 110;
          return baseFreq * Math.pow(2, fret / 12); // Each fret is a semitone
        })
        .filter(freq => freq !== null) as number[];

      if (playableNotes.length === 0) {
        console.log('No playable notes found');
        return;
      }

      // Play each note briefly
      playableNotes.forEach((freq, i) => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(freq, now + i * 0.1);
          oscillator.type = 'sawtooth';

          gainNode.gain.setValueAtTime(0, now + i * 0.1);
          gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);

          oscillator.start(now + i * 0.1);
          oscillator.stop(now + i * 0.1 + 0.5);

          // Clean up oscillator after use
          oscillator.addEventListener('ended', () => {
            oscillator.disconnect();
            gainNode.disconnect();
          });
        } catch (noteError) {
          console.log('Error playing note:', noteError);
        }
      });
    } catch (error) {
      console.log('Audio playback not available:', error);
    }
  };

  // Sync main screen lesson mode with user's Settings preference on mount
  useEffect(() => {
    setLessonMode(storeLessonMode);
  }, [storeLessonMode]);

  // Sync guitar settings with user preferences
  useEffect(() => {
    const parsedTuning = parseTuningToKey(preferredTuning);
    setSelectedTuning(parsedTuning);
    setFretboardFlipped(flipFretboardView);
  }, [preferredTuning, flipFretboardView]);

  // Restoration logic for returning from settings
  useEffect(() => {
    console.log('🔄 Restoration logic running...');
    const chatHistory = useChatHistoryStore.getState();
    console.log('📊 Settings session ID:', chatHistory.settingsSessionId);
    console.log('📊 Current tab in store:', storeCurrentTab);
    console.log('📊 Current active tab:', currentActiveTab);

    // Check if we're returning from settings
    if (chatHistory.settingsSessionId) {
      console.log('✅ Returning from settings - restoring session');

      // Restore previous tab (don't re-save to store)
      setCurrentActiveTabState(storeCurrentTab);
      console.log('🎯 Restored tab to:', storeCurrentTab);

      // Restore chat session
      restoreFromSettings();
      console.log('🔄 Called restoreFromSettings()');

      // Load messages for the current tab
      const session = loadSession(chatHistory.settingsSessionId);
      console.log('📝 Loaded session:', session?.title, session?.tabType);

      if (session) {
        const messages = loadTabMessages(session.tabType);
        console.log(
          '💬 Loaded messages count:',
          messages.length,
          'for tab:',
          session.tabType
        );

        // Restore messages to appropriate tab state
        switch (session.tabType) {
          case 'general':
            setGeneralMessages(messages);
            console.log('📋 Restored general messages');
            break;
          case 'mix':
            setMixMessages(messages);
            console.log('🎛️ Restored mix messages');
            break;
          case 'theory':
            setTheoryMessages(messages);
            console.log('🎼 Restored theory messages');
            break;
          case 'instrument':
            setInstrumentMessages(messages);
            console.log('🎸 Restored instrument messages');
            break;
          case 'practice':
            setPracticeMessages(messages);
            console.log('🏃 Restored practice messages');
            break;
        }
      }
    } else {
      console.log('❌ No settings session found');
    }

    // Initialize tab from user preferences on first load
    if (storeCurrentTab !== currentActiveTab) {
      console.log('🆕 First load - setting tab to:', storeCurrentTab);
      setCurrentActiveTabState(storeCurrentTab);
    }
  }, [
    storeCurrentTab,
    restoreFromSettings,
    loadSession,
    setCurrentActiveTabState,
    currentActiveTab,
    loadTabMessages,
  ]); // Proper dependencies

  // Rehydration effect - restore last session and migrate old data
  useEffect(() => {
    const chatHistoryState = useChatHistoryStore.getState();
    if (lastInput && lastOutput && chatHistoryState.sessions.length === 0) {
      // Migrate old session data to new chat history system
      const restoredMessages: ChatMessage[] = [
        {
          id: 'restored-user',
          type: 'user',
          content: lastInput,
          timestamp: Date.now() - 1000,
        },
        {
          id: 'restored-assistant',
          type: 'assistant',
          content: lastOutput,
          timestamp: Date.now(),
        },
      ];
      setGeneralMessages(restoredMessages);

      // Create a session for the migrated data
      const historyMessages = restoredMessages.map(chatMessageToMessage);
      if (historyMessages.length > 0) {
        const sessionId = createSession('general', historyMessages[0]);
        if (historyMessages.length > 1) {
          historyMessages.slice(1).forEach(msg => {
            addMessageToSession(sessionId, msg);
          });
        }
      }
    }
  }, [
    lastInput,
    lastOutput,
    chatMessageToMessage,
    createSession,
    addMessageToSession,
  ]);

  // Restore current session on component mount, but clear on refresh
  useEffect(() => {
    // Only run refresh detection once to prevent infinite loops
    if (hasRunRefreshDetection.current) {
      return;
    }

    // Detect if this is a page refresh vs navigation
    const isPageRefresh = () => {
      // Check Performance API for navigation type
      if (typeof window !== 'undefined' && window.performance) {
        const navEntries = performance.getEntriesByType(
          'navigation'
        ) as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          return navEntries[0].type === 'reload';
        }
        // Fallback for older browsers
        return performance.navigation?.type === 1; // TYPE_RELOAD
      }
      return false;
    };

    if (isPageRefresh()) {
      // Page was refreshed - clear the current session
      console.log('🔄 Page refresh detected - clearing current session');
      setCurrentSession(null);
    } else {
      // Normal navigation - restore session if available (including return from settings)
      if (
        currentSessionId &&
        generalMessages.length === 0 &&
        mixMessages.length === 0 &&
        theoryMessages.length === 0 &&
        instrumentMessages.length === 0
      ) {
        const currentSession = loadSession(currentSessionId);
        if (currentSession) {
          console.log(
            '🔄 Navigation return detected - restoring session:',
            currentSession.title
          );
          handleSessionSelect(currentSession);
        }
      }
    }

    // Mark that refresh detection has run
    hasRunRefreshDetection.current = true;
  }, [
    currentSessionId,
    generalMessages.length,
    mixMessages.length,
    theoryMessages.length,
    instrumentMessages.length,
    handleSessionSelect,
    loadSession,
    setCurrentSession,
  ]);

  // Auto-scroll to bottom function with delay to avoid conflicts
  const scrollToBottom = useCallback(
    (tabName: 'general' | 'mix' | 'theory' | 'instrument' | 'practice') => {
      const scrollRef = {
        general: generalScrollRef,
        mix: mixScrollRef,
        theory: theoryScrollRef,
        instrument: instrumentScrollRef,
        practice: practiceScrollRef,
      }[tabName];

      if (scrollRef.current && !isUserScrolled[tabName]) {
        // Add a small delay to let any user scroll actions complete first
        setTimeout(() => {
          if (scrollRef.current && !isUserScrolled[tabName]) {
            scrollRef.current.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }
        }, 150);
      }
    },
    [isUserScrolled]
  );

  // Debounced scroll handler to prevent conflicts
  const scrollTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleScroll = useCallback(
    (tabName: 'general' | 'mix' | 'theory' | 'instrument' | 'practice') => {
      const scrollRef = {
        general: generalScrollRef,
        mix: mixScrollRef,
        theory: theoryScrollRef,
        instrument: instrumentScrollRef,
        practice: practiceScrollRef,
      }[tabName];

      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom =
          Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

        // Clear existing timeout for this tab
        if (scrollTimeoutRef.current[tabName]) {
          clearTimeout(scrollTimeoutRef.current[tabName]);
        }

        // Set new timeout to update state after scroll settles
        scrollTimeoutRef.current[tabName] = setTimeout(() => {
          setIsUserScrolled(prev => ({
            ...prev,
            [tabName]: !isAtBottom,
          }));
        }, 100);
      }
    },
    []
  );

  // Auto-scroll when new messages are added
  useLayoutEffect(() => {
    scrollToBottom('general');
  }, [generalMessages, scrollToBottom]);

  useLayoutEffect(() => {
    scrollToBottom('mix');
  }, [mixMessages, scrollToBottom]);

  useLayoutEffect(() => {
    scrollToBottom('theory');
  }, [theoryMessages, scrollToBottom]);

  useLayoutEffect(() => {
    scrollToBottom('instrument');
  }, [instrumentMessages, scrollToBottom]);

  // Auto-save messages to history when they change
  useEffect(() => {
    saveMessagesToHistory('general', generalMessages);
  }, [generalMessages, saveMessagesToHistory]);

  useEffect(() => {
    saveMessagesToHistory('mix', mixMessages);
  }, [mixMessages, saveMessagesToHistory]);

  useEffect(() => {
    saveMessagesToHistory('theory', theoryMessages);
  }, [theoryMessages, saveMessagesToHistory]);

  useEffect(() => {
    saveMessagesToHistory('instrument', instrumentMessages);
  }, [instrumentMessages, saveMessagesToHistory]);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearAllTimeouts();
      // Clear scroll timeouts
      Object.values(scrollTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Guitar tuning mappings (high to low string order)
  const tuningMap: { [key: string]: { name: string; strings: string[] } } = {
    // 6-String Standard Tunings
    standard: {
      name: 'Standard (E-A-D-G-B-E)',
      strings: ['E', 'B', 'G', 'D', 'A', 'E'],
    },
    dropd: { name: 'Drop D', strings: ['E', 'B', 'G', 'D', 'A', 'D'] },
    openg: { name: 'Open G', strings: ['D', 'B', 'G', 'D', 'G', 'D'] },
    dadgad: { name: 'DADGAD', strings: ['D', 'A', 'G', 'D', 'A', 'D'] },
    dropc: { name: 'Drop C', strings: ['D', 'A', 'F', 'C', 'G', 'C'] },
    opene: { name: 'Open E', strings: ['E', 'B', 'G#', 'E', 'B', 'E'] },
    halfstep: {
      name: 'Half Step Down',
      strings: ['D#', 'A#', 'F#', 'C#', 'G#', 'D#'],
    },
    wholestep: {
      name: 'Whole Step Down',
      strings: ['D', 'A', 'F', 'C', 'G', 'D'],
    },

    // Additional 6-String Tunings
    dropb: { name: 'Drop B', strings: ['D#', 'A#', 'F#', 'B', 'F#', 'B'] },
    openA: { name: 'Open A', strings: ['E', 'C#', 'A', 'E', 'A', 'E'] },
    openD: { name: 'Open D', strings: ['D', 'A', 'F#', 'D', 'A', 'D'] },
    openc: { name: 'Open C', strings: ['E', 'C', 'G', 'C', 'G', 'C'] },
    celtic: {
      name: 'Celtic (DADGAD)',
      strings: ['D', 'A', 'G', 'D', 'A', 'D'],
    },

    // 7-String Tunings
    standard7: {
      name: '7-String Standard (B-E-A-D-G-B-E)',
      strings: ['E', 'B', 'G', 'D', 'A', 'E', 'B'],
    },
    dropa7: {
      name: '7-String Drop A (A-E-A-D-G-B-E)',
      strings: ['E', 'B', 'G', 'D', 'A', 'E', 'A'],
    },

    // 8-String Tunings
    standard8: {
      name: '8-String Standard (F#-B-E-A-D-G-B-E)',
      strings: ['E', 'B', 'G', 'D', 'A', 'E', 'B', 'F#'],
    },
    drope8: {
      name: '8-String Drop E (E-B-E-A-D-G-B-E)',
      strings: ['E', 'B', 'G', 'D', 'A', 'E', 'B', 'E'],
    },

    // Baritone Tunings
    baritone: {
      name: 'Baritone Standard (B-E-A-D-F#-B)',
      strings: ['B', 'F#', 'D', 'A', 'E', 'B'],
    },
    baritoneA: {
      name: 'Baritone A (A-D-G-C-E-A)',
      strings: ['A', 'E', 'C', 'G', 'D', 'A'],
    },
  };

  // Parse user's preferred tuning text to tuning map key or custom strings
  const parseTuningToKey = useCallback(
    (preferredTuning: string): string => {
      const tuning = preferredTuning.toLowerCase().trim();

      // Direct matches for preset tunings
      if (
        tuning.includes('standard') &&
        !tuning.includes('7') &&
        !tuning.includes('8')
      )
        return 'standard';
      if (tuning.includes('drop d')) return 'dropd';
      if (tuning.includes('open g')) return 'openg';
      if (tuning.includes('dadgad') || tuning.includes('celtic'))
        return 'dadgad';
      if (tuning.includes('drop c')) return 'dropc';
      if (tuning.includes('drop b')) return 'dropb';
      if (tuning.includes('open e')) return 'opene';
      if (tuning.includes('open a')) return 'openA';
      if (tuning.includes('open d')) return 'openD';
      if (tuning.includes('open c')) return 'openc';
      if (tuning.includes('half step')) return 'halfstep';
      if (tuning.includes('whole step')) return 'wholestep';

      // 7-String matches
      if (tuning.includes('7') && tuning.includes('standard'))
        return 'standard7';
      if (tuning.includes('7') && tuning.includes('drop a')) return 'dropa7';

      // 8-String matches
      if (tuning.includes('8') && tuning.includes('standard'))
        return 'standard8';
      if (tuning.includes('8') && tuning.includes('drop e')) return 'drope8';

      // Baritone matches
      if (tuning.includes('baritone') && tuning.includes('a'))
        return 'baritoneA';
      if (tuning.includes('baritone')) return 'baritone';

      // Try to parse custom note sequences
      const customTuning = parseCustomTuning(preferredTuning);
      if (customTuning) {
        // Add custom tuning to map temporarily
        const customKey = 'custom_' + Date.now();
        tuningMap[customKey] = customTuning;
        return customKey;
      }

      // Default fallback
      return 'standard';
    },
    [tuningMap]
  );

  // Parse custom tuning strings like "EADGBE", "E-A-D-G-B-E", "E A D G B E"
  const parseCustomTuning = (
    tuningString: string
  ): { name: string; strings: string[] } | null => {
    // Remove common separators and clean up
    const cleaned = tuningString
      .replace(/[-()\s]/g, '')
      .toUpperCase()
      .replace(/[^A-G#]/g, '');

    // Match note pattern (A-G with optional # or b)
    const notePattern = /[A-G][#b]?/g;
    const matches = cleaned.match(notePattern);

    if (!matches || matches.length < 4 || matches.length > 12) {
      return null; // Invalid tuning
    }

    // Reverse to get high-to-low order for display
    const strings = matches.reverse();

    return {
      name: `Custom (${matches.reverse().join('-')})`,
      strings: strings,
    };
  };

  const currentTuning = tuningMap[selectedTuning] || tuningMap.standard;

  // Dynamic fretboard configuration
  const fretCount = 13; // Could be made configurable later
  const stringCount = currentTuning.strings.length;

  // Generate CSS classes for fretboard layout
  const getFretboardGridClass = (frets: number): string => {
    const gridClasses: { [key: number]: string } = {
      12: 'grid-cols-12',
      13: 'grid-cols-13',
      15: 'grid-cols-15',
      17: 'grid-cols-17',
      24: 'grid-cols-24',
    };
    return gridClasses[frets] || 'grid-cols-13';
  };

  const getFretboardMaxWidth = (strings: number): string => {
    if (strings <= 6) return 'max-w-[600px]';
    if (strings <= 8) return 'max-w-[700px]';
    return 'max-w-[800px]';
  };

  // Generate fretboard notes based on tuning
  const generateFretboardNotes = () => {
    const notes = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const fretboard: string[][] = [];

    currentTuning.strings.forEach(openNote => {
      const openIndex = notes.indexOf(openNote);
      const stringNotes: string[] = [];

      for (let fret = 0; fret <= 12; fret++) {
        const noteIndex = (openIndex + fret) % 12;
        stringNotes.push(notes[noteIndex]);
      }

      fretboard.push(stringNotes);
    });

    return fretboard;
  };

  // Piano keyboard layout (1 octave starting from C)
  const generatePianoKeys = (
    scaleNotes: string[],
    selectedChord: string,
    startOctave = 3,
    numOctaves = 1
  ): PianoKey[] => {
    const notes = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const keys: PianoKey[] = [];

    for (
      let octave = startOctave;
      octave < startOctave + numOctaves;
      octave++
    ) {
      notes.forEach(note => {
        const isBlackKey = note.includes('#');
        keys.push({
          note,
          octave,
          fullName: `${note}${octave}`,
          isBlackKey,
          isInScale: scaleNotes.includes(note),
          isRoot: note === selectedChord,
        });
      });
    }
    return keys;
  };

  // Reset active chord when root or mode changes
  useEffect(() => {
    setActiveChord(null);
  }, [selectedChord, selectedMode]);

  // Memoized values to prevent unnecessary re-renders
  const scaleNotes = React.useMemo(
    () => generateScaleNotes(),
    [selectedChord, selectedMode, generateScaleNotes]
  );
  const fretboard = React.useMemo(
    () => generateFretboardNotes(),
    [currentTuning, generateFretboardNotes]
  );
  const pianoKeys = React.useMemo(
    () => generatePianoKeys(scaleNotes, selectedChord, 3, 1),
    [scaleNotes, selectedChord]
  );

  // Display tuning strings based on flip state
  const displayTuningStrings = fretboardFlipped
    ? [...currentTuning.strings].reverse()
    : currentTuning.strings;
  const displayFretboard = fretboardFlipped
    ? [...fretboard].reverse()
    : fretboard;

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handler();
    }
  };

  // Input validation helper
  const sanitizeInput = (input: string): string => {
    return input.trim().slice(0, 2000); // Limit length and trim whitespace
  };

  // Message list renderer
  const renderMessageList = (
    messages: ChatMessage[],
    scrollRef: React.RefObject<HTMLDivElement | null>,
    tabName: 'general' | 'mix' | 'theory' | 'instrument' | 'practice',
    loading: boolean
  ) => {
    if (messages.length === 0 && !loading) return null;

    return (
      <div
        ref={scrollRef}
        className="h-96 max-h-[60vh] overflow-y-scroll mb-6 p-3 sm:p-4 rounded-xl border space-y-3 sm:space-y-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollBehavior: 'auto', // Allow manual control of smooth scrolling
          background: lessonMode ? '#0e1117' : '#1a1625',
          borderColor: lessonMode
            ? 'rgba(6, 182, 212, 0.3)'
            : 'rgba(168, 85, 247, 0.3)',
          touchAction: 'pan-y', // Only allow vertical scrolling on touch
        }}
        onScroll={() => handleScroll(tabName)}
      >
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-xl p-3 sm:p-4 ${
                message.type === 'user'
                  ? lessonMode
                    ? 'text-black'
                    : 'text-white'
                  : 'border border-slate-600/50 text-slate-200'
              }`}
              style={{
                backgroundColor:
                  message.type === 'user'
                    ? lessonMode
                      ? '#06b6d4'
                      : '#a855f7'
                    : '#1e293b',
              }}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {stripMarkdown(message.content)}
              </div>
              {message.plugins && message.plugins.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h5
                    className={`font-bold text-sm ${lessonMode ? 'text-neon-blue' : 'text-neon-blue'}`}
                  >
                    Suggested Plugin Chain:
                  </h5>
                  {message.plugins.map((plugin, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-slate-600/50"
                      style={{ backgroundColor: '#334155' }}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${lessonMode ? 'bg-neon-cyan' : 'bg-neon-purple'}`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white text-xs sm:text-sm">
                            {plugin.name}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${lessonMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}
                          >
                            {plugin.type}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm mb-1">
                          {plugin.description}
                        </p>
                        {plugin.explanation && (
                          <p className="text-slate-400 text-xs">
                            {plugin.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="border border-slate-600/50 text-slate-200 rounded-xl p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
                <span className="text-slate-400 text-xs sm:text-sm ml-1 sm:ml-2">
                  StudioBrain is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Chat handlers with scale detection
  const handleGeneralQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(generalQuestion);
    if (!sanitizedQuestion) return;

    // Store the input in session
    setSession({ lastInput: sanitizedQuestion });

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now(),
    };
    setGeneralMessages(prev => [...prev, userMessage]);
    setGeneralQuestion(''); // Clear input

    setGeneralLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...generalMessages, userMessage];
      const response = await OpenAIService.askGeneral(
        sanitizedQuestion,
        lessonMode,
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response';

        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now(),
        };
        setGeneralMessages(prev => [...prev, assistantMessage]);

        // Store the output in session
        setSession({ lastOutput: answer });

        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(
            response.scaleRequest.root,
            response.scaleRequest.mode
          );
        }

        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received in General:', response.tabData);
          setActiveTabNotes(
            response.tabData.parsedTab.notes.map((note: TabNote) => ({
              string: note.string,
              fret: note.fret,
            }))
          );
          setShowTabNotes(true);

          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log(
              '🎯 Setting chord to:',
              response.tabData.identifiedChord
            );
            const chordMatch =
              response.tabData.identifiedChord.match(/^([A-G][#b]?)/);
            if (chordMatch) {
              setSelectedChord(chordMatch[1]);
            }
          }
        }
      }
    } catch (error) {
      console.error('General question error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setGeneralMessages(prev => [...prev, errorAssistantMessage]);
        // Store the error in session
        setSession({ lastOutput: errorMessage });
      }
    }
    if (isMounted.current) {
      setGeneralLoading(false);
    }
  };

  const handleMixQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(mixQuestion);
    if (!sanitizedQuestion) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now(),
    };
    setMixMessages(prev => [...prev, userMessage]);
    setMixQuestion(''); // Clear input

    setMixLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...mixMessages, userMessage];
      const response = await OpenAIService.askMix(
        sanitizedQuestion,
        lessonMode,
        [],
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response';
        const plugins = response.pluginSuggestions || [];

        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now(),
          plugins: plugins.length > 0 ? plugins : undefined,
        };
        setMixMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Mix question error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setMixMessages(prev => [...prev, errorAssistantMessage]);
      }
    }
    if (isMounted.current) {
      setMixLoading(false);
    }
  };

  const handleTheoryQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(theoryQuestion);
    if (!sanitizedQuestion) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now(),
    };
    setTheoryMessages(prev => [...prev, userMessage]);
    setTheoryQuestion(''); // Clear input

    setTheoryLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...theoryMessages, userMessage];
      const response = await OpenAIService.askTheory(
        sanitizedQuestion,
        lessonMode,
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response';

        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now(),
        };
        setTheoryMessages(prev => [...prev, assistantMessage]);

        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(
            response.scaleRequest.root,
            response.scaleRequest.mode
          );
        }

        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received:', response.tabData);
          setActiveTabNotes(
            response.tabData.parsedTab.notes.map((note: TabNote) => ({
              string: note.string,
              fret: note.fret,
            }))
          );
          setShowTabNotes(true);

          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log(
              '🎯 Setting chord to:',
              response.tabData.identifiedChord
            );
            // Extract just the root note from the chord name
            const chordMatch =
              response.tabData.identifiedChord.match(/^([A-G][#b]?)/);
            if (chordMatch) {
              setSelectedChord(chordMatch[1]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Theory question error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setTheoryMessages(prev => [...prev, errorAssistantMessage]);
      }
    }
    if (isMounted.current) {
      setTheoryLoading(false);
    }
  };

  const handleInstrumentQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(instrumentQuestion);
    if (!sanitizedQuestion) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now(),
    };
    setInstrumentMessages(prev => [...prev, userMessage]);
    setInstrumentQuestion(''); // Clear input

    setInstrumentLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...instrumentMessages, userMessage];
      const response = await OpenAIService.askInstrument(
        sanitizedQuestion,
        lessonMode,
        selectedInstrument,
        [],
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response';

        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now(),
        };
        setInstrumentMessages(prev => [...prev, assistantMessage]);

        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(
            response.scaleRequest.root,
            response.scaleRequest.mode
          );
        }

        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received in Instrument:', response.tabData);
          setActiveTabNotes(
            response.tabData.parsedTab.notes.map((note: TabNote) => ({
              string: note.string,
              fret: note.fret,
            }))
          );
          setShowTabNotes(true);

          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log(
              '🎯 Setting chord to:',
              response.tabData.identifiedChord
            );
            const chordMatch =
              response.tabData.identifiedChord.match(/^([A-G][#b]?)/);
            if (chordMatch) {
              setSelectedChord(chordMatch[1]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Instrument question error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setInstrumentMessages(prev => [...prev, errorAssistantMessage]);
      }
    }
    if (isMounted.current) {
      setInstrumentLoading(false);
    }
  };

  const handlePracticeQuestion = async () => {
    if (!practiceForm.goal.trim()) return;

    // Create JSON payload from form data
    const practicePayload = {
      focus_tags: practiceForm.focus_tags,
      goal: practiceForm.goal,
      time_minutes: practiceForm.time_minutes,
      skill_level: userLevel,
      tuning: preferredTuning,
      lesson_mode: lessonMode,
      prior_context: practiceForm.prior_context,
    };

    const jsonString = JSON.stringify(practicePayload, null, 2);

    // Add user message to chat (show the goal, not the full JSON)
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: `Practice Goal: ${practiceForm.goal} (${practiceForm.time_minutes} minutes)`,
      timestamp: Date.now(),
    };
    setPracticeMessages(prev => [...prev, userMessage]);

    setPracticeLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...practiceMessages, userMessage];
      const response = await OpenAIService.askPractice(
        jsonString,
        lessonMode,
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const displayContent =
          response.response || response.error || 'No response';

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: displayContent,
          timestamp: Date.now(),
        };
        setPracticeMessages(prev => [...prev, assistantMessage]);

        // Store the output in session
        setSession({ lastOutput: displayContent });

        // Save to history if enabled
        saveMessagesToHistory('practice', [
          ...practiceMessages,
          userMessage,
          assistantMessage,
        ]);
      }
    } catch (error) {
      console.error('Practice question error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setPracticeMessages(prev => [...prev, errorAssistantMessage]);
        // Store the error in session
        setSession({ lastOutput: errorMessage });
      }
    }
    if (isMounted.current) {
      setPracticeLoading(false);
    }
  };

  const handlePracticeFollowUp = async () => {
    if (!practiceFollowUp.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: practiceFollowUp.trim(),
      timestamp: Date.now(),
    };
    setPracticeMessages(prev => [...prev, userMessage]);
    setPracticeFollowUp(''); // Clear input field

    setPracticeLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...practiceMessages, userMessage];
      const response = await OpenAIService.askPractice(
        practiceFollowUp.trim(),
        lessonMode,
        currentHistory.map(chatMessageToMessage)
      );
      if (isMounted.current) {
        const displayContent =
          response.response || response.error || 'No response';

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: displayContent,
          timestamp: Date.now(),
        };
        setPracticeMessages(prev => [...prev, assistantMessage]);

        // Store the output in session
        setSession({ lastOutput: displayContent });

        // Save to history if enabled
        saveMessagesToHistory('practice', [
          ...practiceMessages,
          userMessage,
          assistantMessage,
        ]);
      }
    } catch (error) {
      console.error('Practice follow-up error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setPracticeMessages(prev => [...prev, errorAssistantMessage]);
        // Store the error in session
        setSession({ lastOutput: errorMessage });
      }
    }
    if (isMounted.current) {
      setPracticeLoading(false);
    }
  };

  const handlePracticeChatMessage = async () => {
    if (!practiceChatInput.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: practiceChatInput.trim(),
      timestamp: Date.now(),
    };
    setPracticeChatMessages(prev => [...prev, userMessage]);
    setPracticeChatInput(''); // Clear input field

    setPracticeChatLoading(true);
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...practiceChatMessages, userMessage];
      const response = await OpenAIService.askPractice(
        practiceChatInput.trim(),
        lessonMode,
        currentHistory.map(chatMessageToMessage)
      );

      if (isMounted.current) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.response,
          timestamp: Date.now(),
          plugins: response.pluginSuggestions || [],
        };
        setPracticeChatMessages(prev => [...prev, assistantMessage]);

        // Store the response in session for persistence
        const displayContent = stripMarkdown(response.response);
        setSession({ lastOutput: displayContent });

        // Check if the response suggests practice settings and try to auto-populate
        const responseText = response.response.toLowerCase();
        if (
          responseText.includes('goal:') ||
          responseText.includes('practice goal') ||
          responseText.includes('focus on')
        ) {
        }

        // Save to history if enabled
        saveMessagesToHistory('practice', [
          ...practiceChatMessages,
          userMessage,
          assistantMessage,
        ]);
      }
    } catch (error) {
      console.error('Practice chat error:', error);
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.';
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        };
        setPracticeChatMessages(prev => [...prev, errorAssistantMessage]);
        // Store the error in session
        setSession({ lastOutput: errorMessage });
      }
    }
    if (isMounted.current) {
      setPracticeChatLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <HydrationBoundary
        fallback={
          <div className="fixed inset-0 bg-zinc-900 text-white flex items-center justify-center z-50">
            <div className="text-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl text-gray-300 mt-6">
                Loading StudioBrain...
              </p>
            </div>
          </div>
        }
      >
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 backdrop-blur-xl text-white flex" style={{background: 'linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(0,0,0,0.98) 50%, rgba(15,15,15,0.95) 100%)'}}>
          {/* Chat History Sidebar */}
          {showChatHistory && (
            <div className="hidden lg:block">
              <ChatHistoryPanel
                currentTab={currentActiveTab}
                lessonMode={lessonMode}
                onSessionSelect={handleSessionSelect}
                onNewSession={handleNewSession}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Lesson Mode Toggle & Settings - Responsive Position */}
              <div className="flex items-center gap-2 sm:gap-4 fixed top-4 right-4 z-50 sm:top-6 sm:right-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChatHistory(!showChatHistory)}
                  className={`p-3 backdrop-blur-xl rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-neon ${showChatHistory ? (lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-neon-cyan/20' : 'bg-neon-purple/10 border-neon-purple/30 shadow-neon-purple/20') : 'bg-glass-bg border-glass-border'}`}
                  title="Chat History"
                >
                  <History
                    className={`w-5 h-5 transition-colors ${showChatHistory ? (lessonMode ? 'text-neon-cyan' : 'text-neon-purple') : 'text-slate-400'}`}
                  />
                </Button>
                <SettingsButton />
                <div
                  className={`flex items-center gap-3 p-3 backdrop-blur-xl rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-neon ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-neon-cyan/20' : 'bg-neon-purple/15 border-neon-purple/40 shadow-neon-purple/30'}`}
                >
                  <Lightbulb
                    className={`w-5 h-5 transition-colors ${lessonMode ? 'text-neon-cyan' : 'text-slate-400'}`}
                  />
                  <Switch
                    id="lesson-mode"
                    checked={lessonMode}
                    onCheckedChange={checked => {
                      setLessonMode(checked);
                      set({ lessonMode: checked });
                    }}
                    className={
                      lessonMode ? 'data-[state=checked]:bg-neon-cyan' : ''
                    }
                  />
                  <span
                    className={`text-sm font-medium min-w-[50px] text-center transition-colors ${lessonMode ? 'text-neon-cyan' : 'text-slate-400'}`}
                  >
                    {lessonMode ? 'Lesson' : 'Quick'}
                  </span>
                </div>
              </div>

              {/* Header */}
              <div className="mb-8 sm:mb-12 text-center mt-16 sm:mt-12">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
                  <div className="relative p-2 sm:p-3 rounded-xl bg-glass-bg backdrop-blur-md border border-glass-border shadow-lg">
                    <Music
                      className={`w-8 h-8 sm:w-10 sm:h-10 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                    />
                  </div>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent px-4 sm:px-0">
                    StudioBrain
                  </h1>
                </div>
                <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
                  A creative assistant for musicians, powered by AI.
                </p>
              </div>

              {/* Mobile Chat History Overlay */}
              {showChatHistory && (
                <div className="fixed inset-0 z-40 lg:hidden">
                  {/* Mobile overlay */}
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowChatHistory(false)}
                  />

                  {/* Mobile Sidebar */}
                  <div className="absolute left-0 top-0 h-full w-full max-w-xs sm:max-w-sm">
                    <div className="relative h-full">
                      <ChatHistoryPanel
                        currentTab={currentActiveTab}
                        lessonMode={lessonMode}
                        onSessionSelect={handleSessionSelect}
                        onNewSession={handleNewSession}
                      />

                      {/* Close button for mobile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowChatHistory(false)}
                        className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Interface */}
              <Tabs
                defaultValue="general"
                className="space-y-8"
                onValueChange={value =>
                  setCurrentActiveTab(
                    value as
                      | 'general'
                      | 'mix'
                      | 'theory'
                      | 'instrument'
                      | 'practice'
                  )
                }
              >
                <TabsList
                  className={`grid w-full grid-cols-5 h-14 bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl ${lessonMode ? '[&>[data-state=active]]:bg-neon-cyan/20 [&>[data-state=active]]:text-neon-cyan [&>[data-state=active]]:shadow-[inset_0_1px_0_rgba(6,182,212,0.3),0_0_6px_rgba(6,182,212,0.15)]' : '[&>[data-state=active]]:bg-neon-purple/20 [&>[data-state=active]]:text-neon-purple [&>[data-state=active]]:shadow-[inset_0_1px_0_rgba(139,92,246,0.3),0_0_6px_rgba(139,92,246,0.15)]'}`}
                >
                  <TabsTrigger
                    value="general"
                    className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}
                  >
                    <Lightbulb className="w-5 h-5 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="mix"
                    className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}
                  >
                    <Volume2 className="w-5 h-5 mr-2" />
                    Mix
                  </TabsTrigger>
                  <TabsTrigger
                    value="theory"
                    className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}
                  >
                    <Music className="w-5 h-5 mr-2" />
                    Theory
                  </TabsTrigger>
                  <TabsTrigger
                    value="instrument"
                    className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}
                  >
                    <Guitar className="w-5 h-5 mr-2" />
                    Instrument
                  </TabsTrigger>
                  <TabsTrigger
                    value="practice"
                    className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Practice
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-8">
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle
                        className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                      >
                        <div
                          className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                        >
                          <Lightbulb
                            className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          />
                        </div>
                        Ask StudioBrain
                      </CardTitle>
                      <CardDescription
                        className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}
                      >
                        Get general music production advice and tips
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-3">
                        <Label
                          htmlFor="general-question"
                          className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                        >
                          Your Question
                        </Label>
                        <Textarea
                          id="general-question"
                          placeholder="Ask about production, workflow, creative direction, or general music help."
                          value={generalQuestion}
                          onChange={e => setGeneralQuestion(e.target.value)}
                          onKeyDown={e =>
                            handleKeyDown(e, handleGeneralQuestion)
                          }
                          className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${
                            lessonMode
                              ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                              : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                          }`}
                        />
                      </div>
                      <Button
                        onClick={handleGeneralQuestion}
                        disabled={generalLoading || !generalQuestion.trim()}
                        className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                          lessonMode
                            ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                            : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                        }`}
                      >
                        {generalLoading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Thinking...
                          </>
                        ) : (
                          'Ask StudioBrain'
                        )}
                      </Button>
                      {renderMessageList(
                        generalMessages,
                        generalScrollRef,
                        'general',
                        generalLoading
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mix" className="mt-8">
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle
                        className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                      >
                        <div
                          className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                        >
                          <Volume2
                            className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          />
                        </div>
                        Ask StudioBrain
                      </CardTitle>
                      <CardDescription
                        className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}
                      >
                        Get mixing and mastering advice
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-3">
                        <Label
                          htmlFor="mix-question"
                          className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                        >
                          Your Question
                        </Label>
                        <Textarea
                          id="mix-question"
                          placeholder="Ask for plugin chains, tone shaping tips, mix fixes, mastering, or DAW help."
                          value={mixQuestion}
                          onChange={e => setMixQuestion(e.target.value)}
                          onKeyDown={e => handleKeyDown(e, handleMixQuestion)}
                          className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${
                            lessonMode
                              ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                              : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                          }`}
                        />
                      </div>
                      <Button
                        onClick={handleMixQuestion}
                        disabled={mixLoading || !mixQuestion.trim()}
                        className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                          lessonMode
                            ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                            : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                        }`}
                      >
                        {mixLoading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Mixing...
                          </>
                        ) : (
                          'Ask StudioBrain'
                        )}
                      </Button>
                      {renderMessageList(
                        mixMessages,
                        mixScrollRef,
                        'mix',
                        mixLoading
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="theory" className="mt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chord & Scale Explorer */}
                    <Card
                      className={`bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl transition-all duration-300 ${scaleChangeAnimation ? (lessonMode ? 'ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20' : 'ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20') : ''}`}
                    >
                      <CardHeader className="pb-6">
                        <CardTitle
                          className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                        >
                          <div
                            className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                          >
                            <Music
                              className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                            />
                          </div>
                          Chord & Scale Explorer
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-base">
                          Explore scales and chord progressions interactively
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 pt-0">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label
                              htmlFor="root-select"
                              className="text-slate-200 font-medium"
                            >
                              Root Note
                            </Label>
                            <Select
                              value={selectedChord}
                              onValueChange={value =>
                                handleScaleChange(value, selectedMode)
                              }
                            >
                              <SelectTrigger
                                id="root-select"
                                className={`bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl h-12 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20 data-[state=open]:border-neon-cyan' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20 data-[state=open]:border-neon-purple'} hover:border-slate-400`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl">
                                {[
                                  'C',
                                  'C#',
                                  'D',
                                  'D#',
                                  'E',
                                  'F',
                                  'F#',
                                  'G',
                                  'G#',
                                  'A',
                                  'A#',
                                  'B',
                                ].map(note => (
                                  <SelectItem
                                    key={note}
                                    value={note}
                                    className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                  >
                                    {note}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-3">
                            <Label
                              htmlFor="mode-select"
                              className="text-slate-200 font-medium"
                            >
                              Mode
                            </Label>
                            <Select
                              value={selectedMode}
                              onValueChange={value =>
                                handleScaleChange(selectedChord, value)
                              }
                            >
                              <SelectTrigger
                                id="mode-select"
                                className={`bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl h-12 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20 data-[state=open]:border-neon-cyan' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20 data-[state=open]:border-neon-purple'} hover:border-slate-400`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl">
                                <SelectItem
                                  value="major"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Major (Ionian)
                                </SelectItem>
                                <SelectItem
                                  value="minor"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Natural Minor (Aeolian)
                                </SelectItem>
                                <SelectItem
                                  value="dorian"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Dorian
                                </SelectItem>
                                <SelectItem
                                  value="phrygian"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Phrygian
                                </SelectItem>
                                <SelectItem
                                  value="lydian"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Lydian
                                </SelectItem>
                                <SelectItem
                                  value="mixolydian"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Mixolydian
                                </SelectItem>
                                <SelectItem
                                  value="locrian"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Locrian
                                </SelectItem>
                                <SelectItem
                                  value="harmonicMinor"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Harmonic Minor
                                </SelectItem>
                                <SelectItem
                                  value="melodicMinor"
                                  className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}
                                >
                                  Melodic Minor
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Generated Chords */}
                        <div>
                          <h4
                            className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          >
                            {selectedChord} {selectedMode} - Scale Chords
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {generateChords().map((chordInfo, chordIndex) => (
                              <div
                                key={chordIndex}
                                className="flex flex-col items-center gap-1"
                              >
                                <Badge
                                  variant="outline"
                                  className={`cursor-pointer transition-all duration-300 px-4 py-2 rounded-xl font-semibold hover:scale-105 ${
                                    lessonMode
                                      ? `border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan hover:shadow-lg hover:shadow-neon-cyan/30 ${activeChord === chordInfo.name ? 'bg-neon-cyan/20 border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-glass-bg backdrop-blur-sm'}`
                                      : `border-neon-purple/40 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple hover:shadow-lg hover:shadow-neon-purple/30 ${activeChord === chordInfo.name ? 'bg-neon-purple/20 border-neon-purple shadow-lg shadow-neon-purple/30' : 'bg-glass-bg backdrop-blur-sm'}`
                                  }`}
                                  onClick={() =>
                                    setActiveChord(
                                      chordInfo.name === activeChord
                                        ? null
                                        : chordInfo.name
                                    )
                                  }
                                >
                                  {chordInfo.name}
                                </Badge>
                                <span
                                  className={`text-xs font-mono ${lessonMode ? 'text-neon-cyan/70' : 'text-neon-purple/70'}`}
                                >
                                  {chordInfo.romanNumeral}
                                </span>
                              </div>
                            ))}
                          </div>
                          {activeChord &&
                            (() => {
                              const selectedChordInfo = generateChords().find(
                                c => c.name === activeChord
                              );
                              return selectedChordInfo ? (
                                <div
                                  className={`mt-6 p-4 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30' : 'bg-neon-purple/10 border-neon-purple/30'}`}
                                >
                                  <div className="flex items-center gap-4 mb-3">
                                    <h4
                                      className={`font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                                    >
                                      {selectedChordInfo.name}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-800 text-gray-300 font-mono"
                                    >
                                      {selectedChordInfo.romanNumeral}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-700 text-gray-200 capitalize"
                                    >
                                      {selectedChordInfo.function}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 text-slate-300">
                                    <p>
                                      <strong>Scale Degree:</strong>{' '}
                                      {selectedChordInfo.scaleDegree}
                                    </p>
                                    <p>
                                      <strong>Quality:</strong>{' '}
                                      {selectedChordInfo.quality.replace(
                                        '-',
                                        ' '
                                      )}
                                    </p>
                                    <p>
                                      <strong>Function:</strong>{' '}
                                      {selectedChordInfo.function} -{' '}
                                      {getFunctionDescription(
                                        selectedChordInfo.function
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Guitar Fretboard/Piano Visualization */}
                    <Card
                      className={`bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl transition-all duration-300 ${scaleChangeAnimation || tuningChangeAnimation || flipAnimation ? (lessonMode ? 'ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20' : 'ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20') : ''}`}
                    >
                      <CardHeader className="pb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle
                              className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                            >
                              <div
                                className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                              >
                                {visualizerView === 'guitar' ? (
                                  <Guitar
                                    className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                                  />
                                ) : (
                                  <Piano
                                    className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                                  />
                                )}
                              </div>
                              {visualizerView === 'guitar'
                                ? 'Guitar Fretboard'
                                : 'Piano Keyboard'}
                            </CardTitle>
                            <CardDescription className="text-slate-300 text-base mt-2">
                              {selectedChord} {selectedMode} scale visualization{' '}
                              {visualizerView === 'guitar'
                                ? `- ${currentTuning.name}`
                                : '- One Octave (C3-B3)'}{' '}
                              - Root notes in{' '}
                              {lessonMode
                                ? 'cyan, scale tones in blue'
                                : 'purple, scale tones in pink'}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                              <Button
                                variant={
                                  visualizerView === 'guitar'
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => setVisualizerView('guitar')}
                                className={`h-10 px-4 rounded-xl font-medium transition-all duration-300 ${
                                  visualizerView === 'guitar'
                                    ? lessonMode
                                      ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50'
                                      : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
                                    : lessonMode
                                      ? 'bg-white/10 backdrop-blur-md border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan'
                                      : 'bg-white/10 backdrop-blur-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple'
                                }`}
                              >
                                <Guitar className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Guitar</span>
                              </Button>
                              <Button
                                variant={
                                  visualizerView === 'piano'
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() => setVisualizerView('piano')}
                                className={`h-10 px-4 rounded-xl font-medium transition-all duration-300 ${
                                  visualizerView === 'piano'
                                    ? lessonMode
                                      ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50'
                                      : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
                                    : lessonMode
                                      ? 'bg-white/10 backdrop-blur-md border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan'
                                      : 'bg-white/10 backdrop-blur-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple'
                                }`}
                              >
                                <Piano className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Piano</span>
                              </Button>
                              {visualizerView === 'guitar' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFretboardFlip}
                                    className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 ${lessonMode ? 'bg-white/10 backdrop-blur-md border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan' : 'bg-white/10 backdrop-blur-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple'}`}
                                    title={`${fretboardFlipped ? 'Flip to standard view (high e top, low E bottom)' : 'Flip to inverted view (low E top, high e bottom)'}`}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                  {showTabNotes && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={clearTabNotes}
                                      className="h-10 w-10 p-0 rounded-xl transition-all duration-300 bg-orange-500/20 backdrop-blur-md border-orange-400/40 text-orange-400 hover:bg-orange-500/30 hover:border-orange-400"
                                      title="Clear tab notes from fretboard"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 overflow-hidden">
                        {visualizerView === 'guitar' ? (
                          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg w-full">
                            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                              <div
                                className={`w-full ${getFretboardMaxWidth(stringCount)} mx-auto transition-transform duration-400 ${flipAnimation ? 'scale-y-95' : ''}`}
                              >
                                <div className="space-y-1 sm:space-y-2">
                                  {displayFretboard.map(
                                    (string, stringIndex) => (
                                      <div
                                        key={stringIndex}
                                        className="grid grid-cols-[auto_1fr] items-center gap-2"
                                      >
                                        <div className="w-6 text-xs font-mono text-slate-300 text-right font-medium">
                                          {displayTuningStrings[stringIndex]}
                                        </div>
                                        <div
                                          className={`grid ${getFretboardGridClass(fretCount)} gap-0.5 sm:gap-1`}
                                        >
                                          {string
                                            .slice(0, fretCount)
                                            .map((note, fretIndex) => {
                                              const isRoot =
                                                note === selectedChord;
                                              const isInScale =
                                                scaleNotes.includes(note) &&
                                                !isRoot;

                                              // Check if this fret is part of the active tab
                                              const actualStringIndex =
                                                fretboardFlipped
                                                  ? displayFretboard.length -
                                                    1 -
                                                    stringIndex
                                                  : stringIndex;
                                              const isTabNote =
                                                showTabNotes &&
                                                activeTabNotes.some(
                                                  tabNote =>
                                                    tabNote.string ===
                                                      actualStringIndex &&
                                                    tabNote.fret === fretIndex
                                                );
                                              return (
                                                <div
                                                  key={fretIndex}
                                                  className={`aspect-square border rounded-md flex items-center justify-center text-[8px] sm:text-xs font-mono font-bold transition-all duration-200 touch-manipulation ${
                                                    isTabNote
                                                      ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/50 ring-2 ring-orange-300/50'
                                                      : isRoot
                                                        ? lessonMode
                                                          ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30'
                                                          : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                                        : isInScale
                                                          ? lessonMode
                                                            ? 'bg-neon-blue/70 text-white border-neon-blue shadow-md shadow-neon-blue/20'
                                                            : 'bg-neon-purple/70 text-white border-neon-purple shadow-md shadow-neon-purple/20'
                                                          : 'bg-slate-800/80 text-slate-400 border-slate-600 hover:bg-slate-700/80 hover:border-slate-500'
                                                  }`}
                                                  title={`${note} ${isTabNote ? '(Tab Note)' : isRoot ? '(Root)' : isInScale ? '(Scale)' : ''}`}
                                                >
                                                  <span>{note}</span>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                                <div className="mt-3 sm:mt-4">
                                  <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                                    <div className="w-6"></div>
                                    <div
                                      className={`grid ${getFretboardGridClass(fretCount)} gap-0.5 sm:gap-1`}
                                    >
                                      {Array.from(
                                        { length: fretCount },
                                        (_, i) => (
                                          <span
                                            key={i}
                                            className={`text-center text-[9px] sm:text-xs font-mono ${[3, 5, 7, 9, 12].includes(i) ? 'font-bold text-slate-300' : 'font-medium text-slate-400'}`}
                                          >
                                            {i}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-center">
                              <button
                                onClick={handleChangeTuning}
                                className={`text-xs font-medium transition-all duration-300 hover:underline ${lessonMode ? 'text-neon-cyan hover:text-neon-cyan/80' : 'text-neon-purple hover:text-neon-purple/80'}`}
                                title="Change guitar tuning in settings"
                              >
                                Change Tuning
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg w-full">
                            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 sm:p-6 overflow-hidden">
                              <div className="w-full max-w-[400px] mx-auto">
                                <div className="relative w-full mx-auto">
                                  {/* White keys */}
                                  <div className="flex">
                                    {pianoKeys
                                      .filter(key => !key.isBlackKey)
                                      .map((key, _keyIndex) => (
                                        <div
                                          key={key.fullName}
                                          className={`flex-1 h-32 border border-gray-600 rounded-b flex items-end justify-center pb-2 text-sm font-mono font-bold transition-colors duration-200 ${
                                            key.isRoot
                                              ? lessonMode
                                                ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30'
                                                : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                              : key.isInScale
                                                ? lessonMode
                                                  ? 'bg-neon-blue/70 text-white border-neon-blue shadow-md shadow-neon-blue/20'
                                                  : 'bg-neon-purple/70 text-white border-neon-purple shadow-md shadow-neon-purple/20'
                                                : 'bg-white text-black hover:bg-gray-100'
                                          }`}
                                          title={`${key.note}${key.octave} ${key.isRoot ? '(Root)' : key.isInScale ? '(Scale)' : ''}`}
                                        >
                                          {key.note}
                                        </div>
                                      ))}
                                  </div>

                                  {/* Black keys */}
                                  <div className="absolute top-0 flex w-full">
                                    {pianoKeys
                                      .filter(key => !key.isBlackKey)
                                      .map((whiteKey, whiteIndex) => {
                                        const blackKeyNote = pianoKeys.find(
                                          key =>
                                            key.isBlackKey &&
                                            key.octave === whiteKey.octave &&
                                            ((whiteKey.note === 'C' &&
                                              key.note === 'C#') ||
                                              (whiteKey.note === 'D' &&
                                                key.note === 'D#') ||
                                              (whiteKey.note === 'F' &&
                                                key.note === 'F#') ||
                                              (whiteKey.note === 'G' &&
                                                key.note === 'G#') ||
                                              (whiteKey.note === 'A' &&
                                                key.note === 'A#'))
                                        );

                                        return blackKeyNote ? (
                                          <div
                                            key={blackKeyNote.fullName}
                                            className="relative flex-1"
                                          >
                                            <div className="h-6"></div>
                                            <div
                                              className={`absolute top-0 left-1/2 transform -translate-x-1/2 translate-x-4 w-5 h-16 sm:w-6 sm:h-24 border rounded-b flex items-end justify-center pb-1 text-[10px] sm:text-xs font-mono font-bold transition-colors duration-200 ${
                                                blackKeyNote.isRoot
                                                  ? lessonMode
                                                    ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30'
                                                    : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                                  : blackKeyNote.isInScale
                                                    ? lessonMode
                                                      ? 'bg-neon-blue/80 text-white border-neon-blue shadow-md shadow-neon-blue/20'
                                                      : 'bg-neon-purple/80 text-white border-neon-purple shadow-md shadow-neon-purple/20'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700'
                                              }`}
                                              title={`${blackKeyNote.note}${blackKeyNote.octave} ${blackKeyNote.isRoot ? '(Root)' : blackKeyNote.isInScale ? '(Scale)' : ''}`}
                                            >
                                              {blackKeyNote.note}
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            key={`spacer-${whiteIndex}`}
                                            className="flex-1 h-6"
                                          ></div>
                                        );
                                      })}
                                  </div>
                                </div>
                                <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400 font-medium">
                                  C3 - B3 (One Octave)
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Theory Chat Section - Full Width */}
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl mt-8">
                    <CardHeader className="pb-6">
                      <CardTitle
                        className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                      >
                        <div
                          className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                        >
                          <Lightbulb
                            className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          />
                        </div>
                        Ask StudioBrain
                      </CardTitle>
                      <CardDescription
                        className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}
                      >
                        Get music theory and composition help
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-3">
                        <Label
                          htmlFor="theory-question"
                          className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                        >
                          Your Question
                        </Label>
                        <Textarea
                          id="theory-question"
                          placeholder="Ask about scales, modes, progressions, or musical theory."
                          value={theoryQuestion}
                          onChange={e => setTheoryQuestion(e.target.value)}
                          onKeyDown={e =>
                            handleKeyDown(e, handleTheoryQuestion)
                          }
                          className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${
                            lessonMode
                              ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                              : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                          }`}
                        />
                      </div>
                      <Button
                        onClick={handleTheoryQuestion}
                        disabled={theoryLoading || !theoryQuestion.trim()}
                        className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                          lessonMode
                            ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                            : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                        }`}
                      >
                        {theoryLoading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Analyzing theory...
                          </>
                        ) : (
                          'Ask StudioBrain'
                        )}
                      </Button>
                      {renderMessageList(
                        theoryMessages,
                        theoryScrollRef,
                        'theory',
                        theoryLoading
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="instrument" className="mt-6">
                  {voicingView && selectedVoicing ? (
                    <VoicingView
                      selectedVoicing={selectedVoicing}
                      instrument={selectedInstrument as 'guitar' | 'piano'}
                      tuning={currentTuning.strings}
                      currentKey={selectedChord}
                      onBack={handleBackFromVoicing}
                      onPlayChord={handlePlayChord}
                    />
                  ) : (
                    <>
                      <div className="mt-8">
                        <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                          <CardHeader className="pb-6">
                            <CardTitle
                              className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                            >
                              <div
                                className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                              >
                                <Lightbulb
                                  className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                                />
                              </div>
                              Ask StudioBrain
                            </CardTitle>
                            <CardDescription
                              className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}
                            >
                              Get instrument-specific advice and techniques
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 pt-0">
                            <div className="space-y-3">
                              <Label
                                htmlFor="instrument-question"
                                className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                              >
                                Your Question
                              </Label>
                              <Textarea
                                id="instrument-question"
                                placeholder="Ask about your gear, tone settings, voicings, or how to practice better."
                                value={instrumentQuestion}
                                onChange={e =>
                                  setInstrumentQuestion(e.target.value)
                                }
                                onKeyDown={e =>
                                  handleKeyDown(e, handleInstrumentQuestion)
                                }
                                className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${
                                  lessonMode
                                    ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                                    : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                                }`}
                              />
                            </div>
                            <Button
                              onClick={handleInstrumentQuestion}
                              disabled={
                                instrumentLoading || !instrumentQuestion.trim()
                              }
                              className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                                lessonMode
                                  ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                                  : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                              }`}
                            >
                              {instrumentLoading ? (
                                <>
                                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                  Getting tips...
                                </>
                              ) : (
                                'Ask StudioBrain'
                              )}
                            </Button>
                            {renderMessageList(
                              instrumentMessages,
                              instrumentScrollRef,
                              'instrument',
                              instrumentLoading
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="practice" className="mt-8">
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle
                        className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                      >
                        <div
                          className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                        >
                          <BookOpen
                            className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          />
                        </div>
                        Practice with StudioBrain
                      </CardTitle>
                      <CardDescription
                        className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}
                      >
                        Get personalized practice guidance and exercises
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      {/* Focus Tags */}
                      <div className="space-y-3">
                        <Label
                          className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                        >
                          Focus Areas
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            'technique',
                            'theory',
                            'rhythm',
                            'improvisation',
                            'repertoire',
                            'ear-training',
                            'sight-reading',
                          ].map(tag => (
                            <div
                              key={tag}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`focus-${tag}`}
                                checked={practiceForm.focus_tags.includes(tag)}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setPracticeForm(prev => ({
                                      ...prev,
                                      focus_tags: [...prev.focus_tags, tag],
                                    }));
                                  } else {
                                    setPracticeForm(prev => ({
                                      ...prev,
                                      focus_tags: prev.focus_tags.filter(
                                        t => t !== tag
                                      ),
                                    }));
                                  }
                                }}
                                className="border-glass-border"
                              />
                              <Label
                                htmlFor={`focus-${tag}`}
                                className={`text-sm capitalize ${lessonMode ? 'text-slate-300' : 'text-slate-300'} cursor-pointer`}
                              >
                                {tag.replace('-', ' ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Goal */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="practice-goal"
                          className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                        >
                          Practice Goal
                        </Label>
                        <Input
                          id="practice-goal"
                          placeholder="e.g., Learn sweep picking technique, Work on jazz chord progressions"
                          value={practiceForm.goal}
                          onChange={e =>
                            setPracticeForm(prev => ({
                              ...prev,
                              goal: e.target.value,
                            }))
                          }
                          onKeyDown={e =>
                            handleKeyDown(e, handlePracticeQuestion)
                          }
                          className={`bg-glass-bg border border-glass-border rounded-xl text-white transition-all duration-300 hover:border-slate-400 ${
                            lessonMode
                              ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                              : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                          }`}
                        />
                      </div>

                      {/* Time and Skill Level Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label
                            htmlFor="practice-time"
                            className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                          >
                            Time (minutes)
                          </Label>
                          <Input
                            id="practice-time"
                            type="number"
                            min="5"
                            max="180"
                            value={practiceForm.time_minutes}
                            onChange={e =>
                              setPracticeForm(prev => ({
                                ...prev,
                                time_minutes: parseInt(e.target.value) || 30,
                              }))
                            }
                            className={`bg-glass-bg border border-glass-border rounded-xl text-white transition-all duration-300 hover:border-slate-400 ${
                              lessonMode
                                ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                                : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                            }`}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label
                            className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                          >
                            Current Settings
                          </Label>
                          <Card
                            onClick={handleSettingsClick}
                            className={`bg-glass-bg backdrop-blur-sm border border-glass-border cursor-pointer transition-all duration-300 hover:border-slate-400 ${
                              lessonMode
                                ? 'hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:shadow-lg hover:shadow-neon-cyan/20'
                                : 'hover:bg-neon-purple/10 hover:border-neon-purple/30 hover:shadow-lg hover:shadow-neon-purple/20'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-2 text-sm text-slate-300">
                                <div>Level: {userLevel}</div>
                                <div>Tuning: {preferredTuning}</div>
                                <div>
                                  Lesson Mode: {lessonMode ? 'On' : 'Off'}
                                </div>
                                <div className="text-xs text-slate-400 mt-3 opacity-60 border-t border-glass-border/50 pt-2">
                                  Click to edit settings
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Pre-planning Chat Interface */}
                      <div
                        className={`space-y-4 p-4 border-2 rounded-xl ${lessonMode ? 'border-neon-cyan/40' : 'border-neon-purple/40'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
                          >
                            <MessageCircle
                              className={`w-4 h-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
                            />
                          </div>
                          <h3 className="font-medium text-slate-200">
                            Chat with StudioBrain
                          </h3>
                        </div>
                        {practiceChatMessages.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-slate-400">
                              Need help with your practice goals? Ask me
                              anything!
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center">
                              {[
                                'What should I practice to improve?',
                                'Help me set a practice goal',
                                "I'm a beginner, where do I start?",
                                'Suggest techniques for my level',
                              ].map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() =>
                                    setPracticeChatInput(suggestion)
                                  }
                                  className={`text-xs px-3 py-1 rounded-full border transition-colors duration-200 ${
                                    lessonMode
                                      ? 'border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10'
                                      : 'border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10'
                                  }`}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {practiceChatMessages.map(message => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.type === 'user'
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[85%] sm:max-w-[80%] rounded-xl p-3 ${
                                    message.type === 'user'
                                      ? lessonMode
                                        ? 'bg-neon-cyan text-black'
                                        : 'bg-neon-purple text-white'
                                      : 'bg-slate-800 border border-slate-600/50 text-slate-200'
                                  }`}
                                >
                                  <div className="whitespace-pre-line leading-relaxed">
                                    {stripMarkdown(message.content)}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {practiceChatLoading && (
                              <div className="flex justify-start">
                                <div className="max-w-[85%] sm:max-w-[80%] rounded-xl p-3 bg-slate-800 border border-slate-600/50 text-slate-200 flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Thinking...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Textarea
                            value={practiceChatInput}
                            onChange={e => setPracticeChatInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handlePracticeChatMessage();
                              }
                            }}
                            placeholder="Ask about practice goals, get suggestions, or request help..."
                            className="bg-glass-bg border-glass-border text-slate-200 placeholder:text-slate-400 resize-none"
                            rows={2}
                            disabled={practiceChatLoading}
                          />
                          <Button
                            onClick={handlePracticeChatMessage}
                            disabled={
                              !practiceChatInput.trim() || practiceChatLoading
                            }
                            className={`px-4 transition-all duration-200 ${
                              lessonMode
                                ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/30'
                                : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'
                            }`}
                          >
                            {practiceChatLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-xs text-slate-500 text-center">
                          Get personalized suggestions, then click
                          &quot;Generate Practice Plan&quot; below
                        </div>
                      </div>

                      <Button
                        onClick={handlePracticeQuestion}
                        disabled={practiceLoading || !practiceForm.goal.trim()}
                        className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                          lessonMode
                            ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                            : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                        }`}
                      >
                        {practiceLoading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Creating Practice Plan...
                          </>
                        ) : (
                          'Generate Practice Plan'
                        )}
                      </Button>
                      {renderMessageList(
                        practiceMessages,
                        practiceScrollRef,
                        'practice',
                        practiceLoading
                      )}

                      {practiceMessages.length > 0 && (
                        <div className="space-y-3 mt-6 pt-4 border-t border-glass-border">
                          <Label
                            htmlFor="practice-followup"
                            className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                          >
                            Follow-up Question or Suggestion
                          </Label>
                          <Textarea
                            id="practice-followup"
                            placeholder="Ask questions, suggest changes, or request adjustments..."
                            value={practiceFollowUp}
                            onChange={e => setPracticeFollowUp(e.target.value)}
                            onKeyDown={e =>
                              handleKeyDown(e, handlePracticeFollowUp)
                            }
                            className={`glass-textarea min-h-[80px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${
                              lessonMode
                                ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20'
                                : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                            }`}
                          />
                          <Button
                            onClick={handlePracticeFollowUp}
                            disabled={
                              practiceLoading || !practiceFollowUp.trim()
                            }
                            className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                              lessonMode
                                ? 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] hover:from-[#22d3ee]/90 hover:to-[#3b82f6]/90 text-black shadow-lg shadow-[#22d3ee]/30 hover:shadow-[#22d3ee]/50'
                                : 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:from-[#a855f7]/90 hover:to-[#ec4899]/90 text-white shadow-lg shadow-[#a855f7]/30 hover:shadow-[#a855f7]/50'
                            }`}
                          >
                            {practiceLoading ? (
                              <>
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Thinking...
                              </>
                            ) : (
                              'Send'
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </HydrationBoundary>
    </ErrorBoundary>
  );
}
