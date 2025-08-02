"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { HydrationBoundary } from "@/components/HydrationBoundary"
import { getModeChords, getScaleNotes, normalizeModeNames, ChordInfo, NoteName, ModeName } from "@/lib/music-theory"

interface PluginSuggestion {
  name: string
  type: string
  description: string
  explanation?: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  plugins?: PluginSuggestion[]
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Music, Guitar, Piano, Volume2, Lightbulb, Loader2, RotateCcw, History, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { OpenAIService } from "@/lib/openai-service"
import { VoicingView } from "@/components/VoicingView"
import { ChordShape } from "@/lib/voicings"
import SettingsButton from "@/components/SettingsButton"
import { useSessionStore } from "@/lib/useSessionStore"
import { useChatHistoryStore, ChatSession, Message } from "@/lib/useChatHistoryStore"
import ChatHistoryPanel from "@/components/ChatHistoryPanel"
import GearChain from "@/components/GearChain"
import { GearItem } from "@/lib/gearService"

interface PianoKey {
  note: string
  octave: number
  fullName: string
  isBlackKey: boolean
  isInScale: boolean
  isRoot: boolean
}

export default function StudioBrain() {
  const { lastInput, lastOutput, setSession } = useSessionStore()
  const chatHistory = useChatHistoryStore()
  const [selectedInstrument, setSelectedInstrument] = useState("guitar")
  const [selectedChord, setSelectedChord] = useState("C")
  const [selectedMode, setSelectedMode] = useState("major")
  const [lessonMode, setLessonMode] = useState(false)
  const [activeChord, setActiveChord] = useState<string | null>(null)
  const [visualizerView, setVisualizerView] = useState<'guitar' | 'piano'>('guitar')
  const [scaleChangeAnimation, setScaleChangeAnimation] = useState(false)
  const [selectedTuning, setSelectedTuning] = useState("standard")
  const [tuningChangeAnimation, setTuningChangeAnimation] = useState(false)
  const [fretboardFlipped, setFretboardFlipped] = useState(true) // Default to standard view (high E on top)
  const [flipAnimation, setFlipAnimation] = useState(false)
  const [selectedVoicing, setSelectedVoicing] = useState<string | null>(null)
  const [voicingView, setVoicingView] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [currentActiveTab, setCurrentActiveTab] = useState<'general' | 'mix' | 'theory' | 'instrument'>('general')

  // Chat states for different tabs - now using message arrays
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([])
  const [generalQuestion, setGeneralQuestion] = useState("")
  const [generalLoading, setGeneralLoading] = useState(false)

  const [mixMessages, setMixMessages] = useState<ChatMessage[]>([])
  const [mixQuestion, setMixQuestion] = useState("")
  const [mixLoading, setMixLoading] = useState(false)

  const [theoryMessages, setTheoryMessages] = useState<ChatMessage[]>([])
  const [theoryQuestion, setTheoryQuestion] = useState("")
  const [theoryLoading, setTheoryLoading] = useState(false)

  const [instrumentMessages, setInstrumentMessages] = useState<ChatMessage[]>([])
  const [instrumentQuestion, setInstrumentQuestion] = useState("")
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [currentGearChain, setCurrentGearChain] = useState<GearItem[]>([])

  // Tab data state for fretboard visualization
  const [activeTabNotes, setActiveTabNotes] = useState<Array<{string: number, fret: number}>>([])
  const [showTabNotes, setShowTabNotes] = useState(false)

  // Refs for scroll containers
  const generalScrollRef = useRef<HTMLDivElement>(null)
  const mixScrollRef = useRef<HTMLDivElement>(null)
  const theoryScrollRef = useRef<HTMLDivElement>(null)
  const instrumentScrollRef = useRef<HTMLDivElement>(null)

  // State to track if user has scrolled up
  const [isUserScrolled, setIsUserScrolled] = useState({
    general: false,
    mix: false,
    theory: false,
    instrument: false
  })

  // Create a stable callback for gear updates to prevent infinite loops
  const handleGearUpdate = useCallback((newChain: GearItem[]) => {
    setCurrentGearChain(newChain)
  }, [])

  // Helper functions to convert between ChatMessage and Message formats
  const chatMessageToMessage = (chatMsg: ChatMessage): Message => ({
    role: chatMsg.type as 'user' | 'assistant',
    content: chatMsg.content,
    timestamp: chatMsg.timestamp instanceof Date ? chatMsg.timestamp : new Date(chatMsg.timestamp),
    plugins: chatMsg.plugins
  })

  const messageToChatMessage = (msg: Message): ChatMessage => {
    const timestampValue = msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp
    return {
      id: `${msg.role}-${timestampValue}-${Math.random().toString(36).substr(2, 9)}`,
      type: msg.role,
      content: msg.content,
      timestamp: timestampValue,
      plugins: msg.plugins
    }
  }

  // Session management handlers
  const handleSessionSelect = useCallback((session: ChatSession) => {
    // Load session messages into the appropriate tab
    const chatMessages = session.messages.map(messageToChatMessage)
    
    switch (session.tabType) {
      case 'general':
        setGeneralMessages(chatMessages)
        break
      case 'mix':
        setMixMessages(chatMessages)
        break
      case 'theory':
        setTheoryMessages(chatMessages)
        break
      case 'instrument':
        setInstrumentMessages(chatMessages)
        break
    }
    
    // Set current session and close history panel
    chatHistory.setCurrentSession(session.id)
    setCurrentActiveTab(session.tabType)
    setShowChatHistory(false)
  }, [messageToChatMessage, chatHistory])

  const handleNewSession = (tabType: ChatSession['tabType']) => {
    // Clear messages for the specific tab
    switch (tabType) {
      case 'general':
        setGeneralMessages([])
        break
      case 'mix':
        setMixMessages([])
        break
      case 'theory':
        setTheoryMessages([])
        break
      case 'instrument':
        setInstrumentMessages([])
        break
    }
    
    // Set current tab and clear current session
    setCurrentActiveTab(tabType)
    chatHistory.setCurrentSession(null)
    setShowChatHistory(false)
  }

  // Auto-save messages to history
  const saveMessagesToHistory = useCallback((tabType: ChatSession['tabType'], messages: ChatMessage[]) => {
    if (messages.length === 0) return

    const historyMessages = messages.map(chatMessageToMessage)
    
    if (chatHistory.currentSessionId) {
      // Update existing session with new messages
      const currentSession = chatHistory.sessions.find(s => s.id === chatHistory.currentSessionId)
      if (currentSession && messages.length > currentSession.messages.length) {
        // Only add new messages
        const newMessages = historyMessages.slice(currentSession.messages.length)
        newMessages.forEach(msg => {
          chatHistory.addMessageToSession(chatHistory.currentSessionId!, msg)
        })
      }
    } else if (messages.length > 0) {
      // Create new session with first message
      const firstMessage = historyMessages[0]
      const sessionId = chatHistory.createSession(tabType, firstMessage)
      chatHistory.setCurrentSession(sessionId)
      
      // Add remaining messages if any
      if (historyMessages.length > 1) {
        historyMessages.slice(1).forEach(msg => {
          chatHistory.addMessageToSession(sessionId, msg)
        })
      }
    }
  }, [chatHistory])

  // Generate chords based on selected root and mode using proper music theory
  const generateChords = (): ChordInfo[] => {
    const root = selectedChord as NoteName
    const mode = normalizeModeNames(selectedMode)
    const chords = getModeChords(root, mode)
    
    // Debug: Check for C minor specifically
    if (root === 'C' && mode === 'aeolian') {
      console.log('🔍 C MINOR DEBUG:', chords.map(c => `${c.scaleDegree}:${c.name}(${c.root})`))
    }
    
    return chords
  }

  // Legacy function for backward compatibility - returns just chord names
  const generateChordNames = (): string[] => {
    return generateChords().map(chord => chord.name)
  }

  // Generate scale notes for visualization using proper music theory
  const generateScaleNotes = (): string[] => {
    const root = selectedChord as NoteName
    const mode = normalizeModeNames(selectedMode)
    return getScaleNotes(root, mode)
  }

  // Helper function to describe chord functions
  const getFunctionDescription = (func: string): string => {
    const descriptions: Record<string, string> = {
      'tonic': 'Home chord, provides stability and resolution',
      'subdominant': 'Departure from home, creates forward motion',
      'dominant': 'Strong pull back to tonic, creates tension',
      'mediant': 'Bridge between tonic and dominant, gentle movement',
      'submediant': 'Relative minor/major, provides contrast',
      'leading-tone': 'Strong pull to tonic, creates tension',
      'supertonic': 'Often leads to dominant, creates movement'
    }
    return descriptions[func] || 'Provides harmonic color and movement'
  }


  // Refs for cleanup
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())
  const isMounted = useRef(true)

  // Cleanup function for timeouts
  const addTimeout = (timeout: NodeJS.Timeout) => {
    timeoutRefs.current.add(timeout)
    return timeout
  }

  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
    timeoutRefs.current.clear()
  }

  // Handle scale change with animation
  const handleScaleChange = (root: string, mode: string) => {
    setScaleChangeAnimation(true)
    setSelectedChord(root)
    setSelectedMode(mode)
    
    // Reset animation after a short delay
    addTimeout(setTimeout(() => {
      if (isMounted.current) {
        setScaleChangeAnimation(false)
      }
    }, 600))
  }

  // Function to handle tuning changes with animation
  const handleTuningChange = (tuningKey: string) => {
    setTuningChangeAnimation(true)
    setSelectedTuning(tuningKey)
    
    // Reset animation after a short delay
    addTimeout(setTimeout(() => {
      if (isMounted.current) {
        setTuningChangeAnimation(false)
      }
    }, 600))
  }

  // Function to handle fretboard flip with animation
  const handleFretboardFlip = () => {
    setFlipAnimation(true)
    setFretboardFlipped(!fretboardFlipped)
    
    // Reset animation after a short delay
    addTimeout(setTimeout(() => {
      if (isMounted.current) {
        setFlipAnimation(false)
      }
    }, 400))
  }

  // Function to handle voicing selection
  const handleVoicingSelect = (voicingType: string) => {
    setSelectedVoicing(voicingType)
    setVoicingView(true)
  }

  // Function to go back from voicing view
  const handleBackFromVoicing = () => {
    setVoicingView(false)
    setSelectedVoicing(null)
  }

  // Function to clear tab notes
  const clearTabNotes = () => {
    setActiveTabNotes([])
    setShowTabNotes(false)
  }

  // Function to handle chord playback using Web Audio API
  const handlePlayChord = (chord: ChordShape) => {
    console.log('Playing chord:', chord.name, 'with frets:', chord.frets)
    
    // Simple audio feedback using Web Audio API
    try {
      if (typeof window === 'undefined') return;
      
      // Check for Web Audio API support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        console.log('Web Audio API not supported')
        return
      }
      
      const audioContext = new AudioContextClass()
      
      // Handle audio context state
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.log('Could not resume audio context:', err)
          return
        })
      }
      
      const now = audioContext.currentTime
      
      // Get notes from fret positions (simplified mapping)
      const stringNotes = currentTuning.strings
      if (!stringNotes || !Array.isArray(stringNotes)) {
        console.log('Invalid tuning data')
        return
      }
      
      const playableNotes = chord.frets
        .map((fret, index) => {
          if (fret === null || index >= stringNotes.length) return null // muted string or invalid index
          const stringNote = stringNotes[index]
          if (!stringNote) return null
          
          // Simple note frequency calculation (very basic)
          const noteFreqs: { [key: string]: number } = {
            'E': 82.41, 'F': 87.31, 'F#': 92.50, 'G': 98.00, 'G#': 103.83,
            'A': 110.00, 'A#': 116.54, 'B': 123.47, 'C': 130.81, 'C#': 138.59,
            'D': 146.83, 'D#': 155.56
          }
          const baseFreq = noteFreqs[stringNote] || 110
          return baseFreq * Math.pow(2, fret / 12) // Each fret is a semitone
        })
        .filter(freq => freq !== null) as number[]
      
      if (playableNotes.length === 0) {
        console.log('No playable notes found')
        return
      }
      
      // Play each note briefly
      playableNotes.forEach((freq, i) => {
        try {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(freq, now + i * 0.1)
          oscillator.type = 'sawtooth'
          
          gainNode.gain.setValueAtTime(0, now + i * 0.1)
          gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.01)
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5)
          
          oscillator.start(now + i * 0.1)
          oscillator.stop(now + i * 0.1 + 0.5)
          
          // Clean up oscillator after use
          oscillator.addEventListener('ended', () => {
            oscillator.disconnect()
            gainNode.disconnect()
          })
        } catch (noteError) {
          console.log('Error playing note:', noteError)
        }
      })
    } catch (error) {
      console.log('Audio playback not available:', error)
    }
  }

  // Rehydration effect - restore last session and migrate old data
  useEffect(() => {
    if (lastInput && lastOutput && chatHistory.sessions.length === 0) {
      // Migrate old session data to new chat history system
      const restoredMessages: ChatMessage[] = [
        {
          id: 'restored-user',
          type: 'user',
          content: lastInput,
          timestamp: Date.now() - 1000
        },
        {
          id: 'restored-assistant',
          type: 'assistant',
          content: lastOutput,
          timestamp: Date.now()
        }
      ]
      setGeneralMessages(restoredMessages)
      
      // Create a session for the migrated data
      const historyMessages = restoredMessages.map(chatMessageToMessage)
      if (historyMessages.length > 0) {
        const sessionId = chatHistory.createSession('general', historyMessages[0])
        if (historyMessages.length > 1) {
          historyMessages.slice(1).forEach(msg => {
            chatHistory.addMessageToSession(sessionId, msg)
          })
        }
      }
    }
  }, [lastInput, lastOutput, chatHistory, chatMessageToMessage])

  // Restore current session on component mount, but clear on refresh
  useEffect(() => {
    // Detect if this is a page refresh vs navigation
    const isPageRefresh = () => {
      // Check Performance API for navigation type
      if (typeof window !== 'undefined' && window.performance) {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (navEntries.length > 0) {
          return navEntries[0].type === 'reload'
        }
        // Fallback for older browsers
        return performance.navigation?.type === 1 // TYPE_RELOAD
      }
      return false
    }

    if (isPageRefresh()) {
      // Page was refreshed - clear the current session
      console.log('🔄 Page refresh detected - clearing current session')
      chatHistory.setCurrentSession(null)
    } else {
      // Normal navigation - restore session if available
      if (chatHistory.currentSessionId && 
          generalMessages.length === 0 && 
          mixMessages.length === 0 && 
          theoryMessages.length === 0 && 
          instrumentMessages.length === 0) {
        
        const currentSession = chatHistory.sessions.find(s => s.id === chatHistory.currentSessionId)
        if (currentSession) {
          console.log('🔄 Navigation return detected - restoring session:', currentSession.title)
          handleSessionSelect(currentSession)
        }
      }
    }
  }, [chatHistory.currentSessionId, chatHistory.sessions, generalMessages.length, mixMessages.length, theoryMessages.length, instrumentMessages.length, handleSessionSelect, chatHistory])

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom function with delay to avoid conflicts
  const scrollToBottom = useCallback((tabName: 'general' | 'mix' | 'theory' | 'instrument') => {
    const scrollRef = {
      general: generalScrollRef,
      mix: mixScrollRef,
      theory: theoryScrollRef,
      instrument: instrumentScrollRef
    }[tabName]
    
    if (scrollRef.current && !isUserScrolled[tabName]) {
      // Add a small delay to let any user scroll actions complete first
      setTimeout(() => {
        if (scrollRef.current && !isUserScrolled[tabName]) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 150)
    }
  }, [isUserScrolled])

  // Debounced scroll handler to prevent conflicts
  const scrollTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  const handleScroll = useCallback((tabName: 'general' | 'mix' | 'theory' | 'instrument') => {
    const scrollRef = {
      general: generalScrollRef,
      mix: mixScrollRef,
      theory: theoryScrollRef,
      instrument: instrumentScrollRef
    }[tabName]
    
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10
      
      // Clear existing timeout for this tab
      if (scrollTimeoutRef.current[tabName]) {
        clearTimeout(scrollTimeoutRef.current[tabName])
      }
      
      // Set new timeout to update state after scroll settles
      scrollTimeoutRef.current[tabName] = setTimeout(() => {
        setIsUserScrolled(prev => ({
          ...prev,
          [tabName]: !isAtBottom
        }))
      }, 100)
    }
  }, [])

  // Auto-scroll when new messages are added
  useLayoutEffect(() => {
    scrollToBottom('general')
  }, [generalMessages, scrollToBottom])

  useLayoutEffect(() => {
    scrollToBottom('mix')
  }, [mixMessages, scrollToBottom])

  useLayoutEffect(() => {
    scrollToBottom('theory')
  }, [theoryMessages, scrollToBottom])

  useLayoutEffect(() => {
    scrollToBottom('instrument')
  }, [instrumentMessages, scrollToBottom])

  // Auto-save messages to history when they change
  useEffect(() => {
    saveMessagesToHistory('general', generalMessages)
  }, [generalMessages, saveMessagesToHistory])

  useEffect(() => {
    saveMessagesToHistory('mix', mixMessages)
  }, [mixMessages, saveMessagesToHistory])

  useEffect(() => {
    saveMessagesToHistory('theory', theoryMessages)
  }, [theoryMessages, saveMessagesToHistory])

  useEffect(() => {
    saveMessagesToHistory('instrument', instrumentMessages)
  }, [instrumentMessages, saveMessagesToHistory])

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      clearAllTimeouts()
      // Clear scroll timeouts
      Object.values(scrollTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  // Guitar tuning mappings
  const tuningMap: { [key: string]: { name: string, strings: string[] } } = {
    standard: { name: "Standard (E-A-D-G-B-E)", strings: ["E", "A", "D", "G", "B", "E"] },
    dropd: { name: "Drop D", strings: ["D", "A", "D", "G", "B", "E"] },
    openg: { name: "Open G", strings: ["D", "G", "D", "G", "B", "D"] },
    dadgad: { name: "DADGAD", strings: ["D", "A", "D", "G", "A", "D"] },
    dropc: { name: "Drop C", strings: ["C", "G", "C", "F", "A", "D"] },
    opene: { name: "Open E", strings: ["E", "B", "E", "G#", "B", "E"] },
    halfstep: { name: "Half Step Down", strings: ["D#", "G#", "C#", "F#", "A#", "D#"] },
    wholestep: { name: "Whole Step Down", strings: ["D", "G", "C", "F", "A", "D"] },
  }

  const currentTuning = tuningMap[selectedTuning] || tuningMap.standard

  // Generate fretboard notes based on tuning
  const generateFretboardNotes = () => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const fretboard: string[][] = []

    currentTuning.strings.forEach(openNote => {
      const openIndex = notes.indexOf(openNote)
      const stringNotes: string[] = []
      
      for (let fret = 0; fret <= 12; fret++) {
        const noteIndex = (openIndex + fret) % 12
        stringNotes.push(notes[noteIndex])
      }
      
      fretboard.push(stringNotes)
    })

    return fretboard
  }

  // Piano keyboard layout (1 octave starting from C)
  const generatePianoKeys = (scaleNotes: string[], selectedChord: string, startOctave = 3, numOctaves = 1): PianoKey[] => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const keys: PianoKey[] = []
    
    for (let octave = startOctave; octave < startOctave + numOctaves; octave++) {
      notes.forEach(note => {
        const isBlackKey = note.includes('#')
        keys.push({
          note,
          octave,
          fullName: `${note}${octave}`,
          isBlackKey,
          isInScale: scaleNotes.includes(note),
          isRoot: note === selectedChord
        })
      })
    }
    return keys
  }

  // Reset active chord when root or mode changes
  useEffect(() => {
    setActiveChord(null)
  }, [selectedChord, selectedMode])

  // Memoized values to prevent unnecessary re-renders
  const scaleNotes = React.useMemo(() => generateScaleNotes(), [selectedChord, selectedMode])
  const fretboard = React.useMemo(() => generateFretboardNotes(), [currentTuning])
  const pianoKeys = React.useMemo(() => generatePianoKeys(scaleNotes, selectedChord, 3, 1), [scaleNotes, selectedChord])

  // Display tuning strings based on flip state
  const displayTuningStrings = fretboardFlipped ? [...currentTuning.strings].reverse() : currentTuning.strings
  const displayFretboard = fretboardFlipped ? [...fretboard].reverse() : fretboard


  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handler()
    }
  }

  // Input validation helper
  const sanitizeInput = (input: string): string => {
    return input.trim().slice(0, 2000) // Limit length and trim whitespace
  }

  // Message list renderer
  const renderMessageList = (
    messages: ChatMessage[], 
    scrollRef: React.RefObject<HTMLDivElement>, 
    tabName: 'general' | 'mix' | 'theory' | 'instrument',
    loading: boolean
  ) => {
    if (messages.length === 0 && !loading) return null
    
    return (
      <div 
        ref={scrollRef}
        className="h-96 max-h-[60vh] overflow-y-scroll mb-6 p-3 sm:p-4 rounded-xl border space-y-3 sm:space-y-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollBehavior: 'auto', // Allow manual control of smooth scrolling
          background: lessonMode 
            ? '#0e1117'
            : '#1a1625',
          borderColor: lessonMode 
            ? 'rgba(6, 182, 212, 0.3)' 
            : 'rgba(168, 85, 247, 0.3)',
          touchAction: 'pan-y' // Only allow vertical scrolling on touch
        }}
        onScroll={() => handleScroll(tabName)}
      >
        {messages.map((message) => (
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
                backgroundColor: message.type === 'user'
                  ? lessonMode
                    ? '#06b6d4'
                    : '#a855f7'
                  : '#1e293b'
              }}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {message.content}
              </div>
              {message.plugins && message.plugins.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h5 className={`font-bold text-sm ${lessonMode ? 'text-neon-blue' : 'text-neon-blue'}`}>
                    Suggested Plugin Chain:
                  </h5>
                  {message.plugins.map((plugin, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-slate-600/50" style={{ backgroundColor: '#334155' }}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${lessonMode ? 'bg-neon-cyan' : 'bg-neon-purple'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white text-xs sm:text-sm">{plugin.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${lessonMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}>
                            {plugin.type}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm mb-1">{plugin.description}</p>
                        {plugin.explanation && (
                          <p className="text-slate-400 text-xs">{plugin.explanation}</p>
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
            <div className="border border-slate-600/50 text-slate-200 rounded-xl p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]" style={{ backgroundColor: '#1e293b' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-slate-400 text-xs sm:text-sm ml-1 sm:ml-2">StudioBrain is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Chat handlers with scale detection
  const handleGeneralQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(generalQuestion)
    if (!sanitizedQuestion) return
    
    // Store the input in session
    setSession({ lastInput: sanitizedQuestion })
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now()
    }
    setGeneralMessages(prev => [...prev, userMessage])
    setGeneralQuestion('') // Clear input
    
    setGeneralLoading(true)
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...generalMessages, userMessage]
      const response = await OpenAIService.askGeneral(sanitizedQuestion, lessonMode, currentHistory)
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response'
        
        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now()
        }
        setGeneralMessages(prev => [...prev, assistantMessage])
        
        // Store the output in session
        setSession({ lastOutput: answer })
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
        
        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received in General:', response.tabData)
          setActiveTabNotes(response.tabData.parsedTab.notes.map((note: any) => ({
            string: note.string,
            fret: note.fret
          })))
          setShowTabNotes(true)
          
          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log('🎯 Setting chord to:', response.tabData.identifiedChord)
            const chordMatch = response.tabData.identifiedChord.match(/^([A-G][#b]?)/)
            if (chordMatch) {
              setSelectedChord(chordMatch[1])
            }
          }
        }
      }
    } catch (error) {
      console.error('General question error:', error)
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.'
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now()
        }
        setGeneralMessages(prev => [...prev, errorAssistantMessage])
        // Store the error in session
        setSession({ lastOutput: errorMessage })
      }
    }
    if (isMounted.current) {
      setGeneralLoading(false)
    }
  }

  const handleMixQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(mixQuestion)
    if (!sanitizedQuestion) return
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now()
    }
    setMixMessages(prev => [...prev, userMessage])
    setMixQuestion('') // Clear input
    
    setMixLoading(true)
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...mixMessages, userMessage]
      const response = await OpenAIService.askMix(sanitizedQuestion, lessonMode, currentGearChain, currentHistory)
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response'
        const plugins = response.pluginSuggestions || []
        
        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now(),
          plugins: plugins.length > 0 ? plugins : undefined
        }
        setMixMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Mix question error:', error)
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.'
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now()
        }
        setMixMessages(prev => [...prev, errorAssistantMessage])
      }
    }
    if (isMounted.current) {
      setMixLoading(false)
    }
  }

  const handleTheoryQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(theoryQuestion)
    if (!sanitizedQuestion) return
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now()
    }
    setTheoryMessages(prev => [...prev, userMessage])
    setTheoryQuestion('') // Clear input
    
    setTheoryLoading(true)
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...theoryMessages, userMessage]
      const response = await OpenAIService.askTheory(sanitizedQuestion, lessonMode, currentHistory)
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response'
        
        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now()
        }
        setTheoryMessages(prev => [...prev, assistantMessage])
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
        
        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received:', response.tabData)
          setActiveTabNotes(response.tabData.parsedTab.notes.map((note: any) => ({
            string: note.string,
            fret: note.fret
          })))
          setShowTabNotes(true)
          
          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log('🎯 Setting chord to:', response.tabData.identifiedChord)
            // Extract just the root note from the chord name
            const chordMatch = response.tabData.identifiedChord.match(/^([A-G][#b]?)/)
            if (chordMatch) {
              setSelectedChord(chordMatch[1])
            }
          }
        }
      }
    } catch (error) {
      console.error('Theory question error:', error)
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.'
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now()
        }
        setTheoryMessages(prev => [...prev, errorAssistantMessage])
      }
    }
    if (isMounted.current) {
      setTheoryLoading(false)
    }
  }

  const handleInstrumentQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(instrumentQuestion)
    if (!sanitizedQuestion) return
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: sanitizedQuestion,
      timestamp: Date.now()
    }
    setInstrumentMessages(prev => [...prev, userMessage])
    setInstrumentQuestion('') // Clear input    
    
    setInstrumentLoading(true)
    try {
      // Include current messages plus the new user message for context
      const currentHistory = [...instrumentMessages, userMessage]
      const response = await OpenAIService.askInstrument(sanitizedQuestion, lessonMode, selectedInstrument, currentGearChain, currentHistory)
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response'
        
        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: Date.now()
        }
        setInstrumentMessages(prev => [...prev, assistantMessage])
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
        
        // Check for tab data and update fretboard
        if (response.tabData && response.tabData.parsedTab) {
          console.log('🎸 Tab data received in Instrument:', response.tabData)
          setActiveTabNotes(response.tabData.parsedTab.notes.map((note: any) => ({
            string: note.string,
            fret: note.fret
          })))
          setShowTabNotes(true)
          
          // If a chord was identified, also update the chord display
          if (response.tabData.identifiedChord) {
            console.log('🎯 Setting chord to:', response.tabData.identifiedChord)
            const chordMatch = response.tabData.identifiedChord.match(/^([A-G][#b]?)/)
            if (chordMatch) {
              setSelectedChord(chordMatch[1])
            }
          }
        }
      }
    } catch (error) {
      console.error('Instrument question error:', error)
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.'
        const errorAssistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          type: 'assistant',
          content: errorMessage,
          timestamp: Date.now()
        }
        setInstrumentMessages(prev => [...prev, errorAssistantMessage])
      }
    }
    if (isMounted.current) {
      setInstrumentLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <HydrationBoundary fallback={
        <div className="fixed inset-0 bg-zinc-900 text-white flex items-center justify-center z-50">
          <div className="text-center animate-fade-in">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-gray-300 mt-6">Loading StudioBrain...</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-[#2a2632] text-white flex">
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
        <div className="flex items-center gap-4 fixed top-6 right-6 z-50 sm:top-6 sm:right-6 max-sm:top-4 max-sm:right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChatHistory(!showChatHistory)}
            className={`p-3 backdrop-blur-xl rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-neon ${showChatHistory ? (lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-neon-cyan/20' : 'bg-neon-purple/10 border-neon-purple/30 shadow-neon-purple/20') : 'bg-glass-bg border-glass-border'}`}
            title="Chat History"
          >
            <History className={`w-5 h-5 transition-colors ${showChatHistory ? (lessonMode ? 'text-neon-cyan' : 'text-neon-purple') : 'text-slate-400'}`} />
          </Button>
          <SettingsButton />
          <div className={`flex items-center gap-3 p-3 backdrop-blur-xl rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-neon ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-neon-cyan/20' : 'bg-neon-purple/15 border-neon-purple/40 shadow-neon-purple/30'}`}>
            <Lightbulb className={`w-5 h-5 transition-colors ${lessonMode ? 'text-neon-cyan' : 'text-slate-400'}`} />
            <Switch
              id="lesson-mode"
              checked={lessonMode}
              onCheckedChange={setLessonMode}
              className={lessonMode ? 'data-[state=checked]:bg-neon-cyan' : ''}
            />
            <span className={`text-sm font-medium min-w-[50px] text-center transition-colors ${lessonMode ? 'text-neon-cyan' : 'text-slate-400'}`}>
              {lessonMode ? 'Lesson' : 'Quick'}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-12 text-center mt-20 sm:mt-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
            <div className="relative p-2 sm:p-3 rounded-xl bg-glass-bg backdrop-blur-md border border-glass-border shadow-lg">
              <Music className={`w-8 h-8 sm:w-10 sm:h-10 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
            </div>
            <h1 className="text-5xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent max-w-xs sm:max-w-none truncate sm:whitespace-normal">
              StudioBrain
            </h1>
          </div>
          <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">A creative assistant for musicians, powered by AI.</p>
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
            <div className="absolute left-0 top-0 h-full w-80">
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
          onValueChange={(value) => setCurrentActiveTab(value as 'general' | 'mix' | 'theory' | 'instrument')}
        >
          <TabsList className={`grid w-full grid-cols-4 h-14 bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl ${lessonMode ? '[&>[data-state=active]]:bg-neon-cyan/20 [&>[data-state=active]]:text-neon-cyan [&>[data-state=active]]:shadow-[inset_0_1px_0_rgba(6,182,212,0.3),0_0_6px_rgba(6,182,212,0.15)]' : '[&>[data-state=active]]:bg-neon-purple/20 [&>[data-state=active]]:text-neon-purple [&>[data-state=active]]:shadow-[inset_0_1px_0_rgba(139,92,246,0.3),0_0_6px_rgba(139,92,246,0.15)]'}`}>
            <TabsTrigger value="general" className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Lightbulb className="w-5 h-5 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="mix" className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Volume2 className="w-5 h-5 mr-2" />
              Mix
            </TabsTrigger>
            <TabsTrigger value="theory" className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Music className="w-5 h-5 mr-2" />
              Theory
            </TabsTrigger>
            <TabsTrigger value="instrument" className={`transition-all duration-300 rounded-lg font-medium h-full flex items-center justify-center ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Guitar className="w-5 h-5 mr-2" />
              Instrument
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-8">
            <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
              <CardHeader className="pb-6">
                <CardTitle className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                  <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                    <Lightbulb className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                  </div>
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}>Get general music production advice and tips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  <Label htmlFor="general-question" className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}>Your Question</Label>
                  <Textarea
                    id="general-question"
                    placeholder="Ask about production, workflow, creative direction, or general music help."
                    value={generalQuestion}
                    onChange={(e) => setGeneralQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleGeneralQuestion)}
                    className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${lessonMode 
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
                {renderMessageList(generalMessages, generalScrollRef, 'general', generalLoading)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mix" className="mt-8">
            <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
              <CardHeader className="pb-6">
                <CardTitle className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                  <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                    <Volume2 className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                  </div>
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}>Get mixing and mastering advice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  <Label htmlFor="mix-question" className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}>Your Question</Label>
                  <Textarea
                    id="mix-question"
                    placeholder="Ask for plugin chains, tone shaping tips, mix fixes, mastering, or DAW help."
                    value={mixQuestion}
                    onChange={(e) => setMixQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleMixQuestion)}
                    className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${lessonMode 
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
                {renderMessageList(mixMessages, mixScrollRef, 'mix', mixLoading)}
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="theory" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chord & Scale Explorer */}
              <Card className={`bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl transition-all duration-300 ${scaleChangeAnimation ? lessonMode ? 'ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20' : 'ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20' : ''}`}>
                <CardHeader className="pb-6">
                  <CardTitle className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                    <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                      <Music className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                    </div>
                    Chord & Scale Explorer
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-base">Explore scales and chord progressions interactively</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="root-select" className="text-slate-200 font-medium">Root Note</Label>
                      <Select value={selectedChord} onValueChange={(value) => handleScaleChange(value, selectedMode)}>
                        <SelectTrigger id="root-select" className={`bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl h-12 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20 data-[state=open]:border-neon-cyan' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20 data-[state=open]:border-neon-purple'} hover:border-slate-400`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl">
                          {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(note => (
                            <SelectItem key={note} value={note} className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>{note}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="mode-select" className="text-slate-200 font-medium">Mode</Label>
                      <Select value={selectedMode} onValueChange={(value) => handleScaleChange(selectedChord, value)}>
                        <SelectTrigger id="mode-select" className={`bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl h-12 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20 data-[state=open]:border-neon-cyan' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20 data-[state=open]:border-neon-purple'} hover:border-slate-400`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl">
                          <SelectItem value="major" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Major (Ionian)</SelectItem>
                          <SelectItem value="minor" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Natural Minor (Aeolian)</SelectItem>
                          <SelectItem value="dorian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Dorian</SelectItem>
                          <SelectItem value="phrygian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Phrygian</SelectItem>
                          <SelectItem value="lydian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Lydian</SelectItem>
                          <SelectItem value="mixolydian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Mixolydian</SelectItem>
                          <SelectItem value="locrian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Locrian</SelectItem>
                          <SelectItem value="harmonicMinor" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Harmonic Minor</SelectItem>
                          <SelectItem value="melodicMinor" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Melodic Minor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Generated Chords */}
                  <div>
                    <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>{selectedChord} {selectedMode} - Scale Chords</h4>
                    <div className="flex flex-wrap gap-3">
                      {generateChords().map((chordInfo, chordIndex) => (
                        <div key={chordIndex} className="flex flex-col items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`cursor-pointer transition-all duration-300 px-4 py-2 rounded-xl font-semibold hover:scale-105 ${
                              lessonMode 
                                ? `border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan hover:shadow-lg hover:shadow-neon-cyan/30 ${activeChord === chordInfo.name ? 'bg-neon-cyan/20 border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-glass-bg backdrop-blur-sm'}` 
                                : `border-neon-purple/40 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple hover:shadow-lg hover:shadow-neon-purple/30 ${activeChord === chordInfo.name ? 'bg-neon-purple/20 border-neon-purple shadow-lg shadow-neon-purple/30' : 'bg-glass-bg backdrop-blur-sm'}`
                            }`}
                            onClick={() => setActiveChord(chordInfo.name === activeChord ? null : chordInfo.name)}
                          >
                            {chordInfo.name}
                          </Badge>
                          <span className={`text-xs font-mono ${lessonMode ? 'text-neon-cyan/70' : 'text-neon-purple/70'}`}>
                            {chordInfo.romanNumeral}
                          </span>
                        </div>
                      ))}
                    </div>
                    {activeChord && (() => {
                      const selectedChordInfo = generateChords().find(c => c.name === activeChord)
                      return selectedChordInfo ? (
                        <div className={`mt-6 p-4 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30' : 'bg-neon-purple/10 border-neon-purple/30'}`}>
                          <div className="flex items-center gap-4 mb-3">
                            <h4 className={`font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>{selectedChordInfo.name}</h4>
                            <Badge variant="outline" className="bg-gray-800 text-gray-300 font-mono">
                              {selectedChordInfo.romanNumeral}
                            </Badge>
                            <Badge variant="outline" className="bg-gray-700 text-gray-200 capitalize">
                              {selectedChordInfo.function}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-slate-300">
                            <p><strong>Scale Degree:</strong> {selectedChordInfo.scaleDegree}</p>
                            <p><strong>Quality:</strong> {selectedChordInfo.quality.replace('-', ' ')}</p>
                            <p><strong>Function:</strong> {selectedChordInfo.function} - {getFunctionDescription(selectedChordInfo.function)}</p>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Guitar Fretboard/Piano Visualization */}
              <Card className={`bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl transition-all duration-300 ${scaleChangeAnimation || tuningChangeAnimation || flipAnimation ? lessonMode ? 'ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20' : 'ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20' : ''}`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                        <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                          {visualizerView === 'guitar' ? <Guitar className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} /> : <Piano className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />}
                        </div>
                        {visualizerView === 'guitar' ? 'Guitar Fretboard' : 'Piano Keyboard'}
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-base mt-2">
                        {selectedChord} {selectedMode} scale visualization {visualizerView === 'guitar' ? `- ${currentTuning.name}` : '- One Octave (C3-B3)'} - Root notes in {lessonMode ? 'cyan, scale tones in blue' : 'purple, scale tones in pink'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant={visualizerView === 'guitar' ? 'default' : 'outline'}
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
                          variant={visualizerView === 'piano' ? 'default' : 'outline'}
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
                              title={`${fretboardFlipped ? 'Standard view (High E top)' : 'Inverted view (Low E top)'}`}
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
                        <div className={`w-full max-w-[600px] mx-auto transition-transform duration-400 ${flipAnimation ? 'scale-y-95' : ''}`}>
                          <div className="space-y-1 sm:space-y-2">
                            {displayFretboard.map((string, stringIndex) => (
                              <div key={stringIndex} className="grid grid-cols-[auto_1fr] items-center gap-2">
                                <div className="w-6 text-xs font-mono text-slate-300 text-right font-medium">
                                  {displayTuningStrings[stringIndex]}
                                </div>
                                <div className="grid grid-cols-13 gap-0.5 sm:gap-1">
                                  {string.slice(0, 13).map((note, fretIndex) => {
                                    const isRoot = note === selectedChord
                                    const isInScale = scaleNotes.includes(note) && !isRoot
                                    
                                    // Check if this fret is part of the active tab
                                    const actualStringIndex = fretboardFlipped ? (displayFretboard.length - 1 - stringIndex) : stringIndex
                                    const isTabNote = showTabNotes && activeTabNotes.some(tabNote => 
                                      tabNote.string === actualStringIndex && tabNote.fret === fretIndex
                                    )
                                    return (
                                      <div
                                        key={fretIndex}
                                        className={`aspect-square border rounded-md flex items-center justify-center text-[9px] sm:text-xs font-mono font-bold transition-all duration-200 ${
                                          isTabNote
                                            ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/50 ring-2 ring-orange-300/50'
                                            : isRoot 
                                            ? lessonMode ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                            : isInScale 
                                            ? lessonMode ? 'bg-neon-blue/70 text-white border-neon-blue shadow-md shadow-neon-blue/20' : 'bg-neon-purple/70 text-white border-neon-purple shadow-md shadow-neon-purple/20'
                                            : 'bg-slate-800/80 text-slate-400 border-slate-600 hover:bg-slate-700/80 hover:border-slate-500'
                                        }`}
                                        title={`${note} ${isTabNote ? '(Tab Note)' : isRoot ? '(Root)' : isInScale ? '(Scale)' : ''}`}
                                      >
                                        <span>{note}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 sm:mt-4">
                            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                              <div className="w-6"></div>
                              <div className="grid grid-cols-13 gap-0.5 sm:gap-1">
                                {Array.from({ length: 13 }, (_, i) => (
                                  <span key={i} className={`text-center text-[9px] sm:text-xs font-mono ${[3, 5, 7, 9, 12].includes(i) ? 'font-bold text-slate-300' : 'font-medium text-slate-400'}`}>
                                    {i}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg w-full">
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 sm:p-6 overflow-hidden">
                        <div className="w-full max-w-[400px] mx-auto">
                          <div className="relative w-full mx-auto">
                          {/* White keys */}
                          <div className="flex">
                            {pianoKeys.filter(key => !key.isBlackKey).map((key, keyIndex) => (
                              <div
                                key={key.fullName}
                                className={`flex-1 h-32 border border-gray-600 rounded-b flex items-end justify-center pb-2 text-sm font-mono font-bold transition-colors duration-200 ${
                                  key.isRoot 
                                    ? lessonMode ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                    : key.isInScale 
                                    ? lessonMode ? 'bg-neon-blue/70 text-white border-neon-blue shadow-md shadow-neon-blue/20' : 'bg-neon-purple/70 text-white border-neon-purple shadow-md shadow-neon-purple/20'
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
                            {pianoKeys.filter(key => !key.isBlackKey).map((whiteKey, whiteIndex) => {
                              const blackKeyNote = pianoKeys.find(key => 
                                key.isBlackKey && 
                                key.octave === whiteKey.octave && 
                                (
                                  (whiteKey.note === 'C' && key.note === 'C#') ||
                                  (whiteKey.note === 'D' && key.note === 'D#') ||
                                  (whiteKey.note === 'F' && key.note === 'F#') ||
                                  (whiteKey.note === 'G' && key.note === 'G#') ||
                                  (whiteKey.note === 'A' && key.note === 'A#')
                                )
                              )
                              
                              return blackKeyNote ? (
                                <div key={blackKeyNote.fullName} className="relative flex-1">
                                  <div className="h-6"></div>
                                  <div
                                    className={`absolute top-0 left-1/2 transform -translate-x-1/2 translate-x-4 w-6 h-24 border rounded-b flex items-end justify-center pb-1 text-xs font-mono font-bold transition-colors duration-200 ${
                                      blackKeyNote.isRoot 
                                        ? lessonMode ? 'bg-neon-cyan text-black border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-neon-pink text-white border-neon-pink shadow-lg shadow-neon-pink/30'
                                        : blackKeyNote.isInScale 
                                        ? lessonMode ? 'bg-neon-blue/80 text-white border-neon-blue shadow-md shadow-neon-blue/20' : 'bg-neon-purple/80 text-white border-neon-purple shadow-md shadow-neon-purple/20'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700'
                                    }`}
                                    title={`${blackKeyNote.note}${blackKeyNote.octave} ${blackKeyNote.isRoot ? '(Root)' : blackKeyNote.isInScale ? '(Scale)' : ''}`}
                                  >
                                    {blackKeyNote.note}
                                  </div>
                                </div>
                              ) : (
                                <div key={`spacer-${whiteIndex}`} className="flex-1 h-6"></div>
                              )
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
                <CardTitle className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                  <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                    <Lightbulb className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                  </div>
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}>Get music theory and composition help</CardDescription>
              </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  <div className="space-y-3">
                    <Label htmlFor="theory-question" className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}>Your Question</Label>
                    <Textarea
                      id="theory-question"
                      placeholder="Ask about scales, modes, progressions, or musical theory."
                      value={theoryQuestion}
                      onChange={(e) => setTheoryQuestion(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleTheoryQuestion)}
                      className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${lessonMode 
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
                  {renderMessageList(theoryMessages, theoryScrollRef, 'theory', theoryLoading)}
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
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                        <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                          {selectedInstrument === "guitar" ? <Guitar className={`w-5 h-5 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} /> : <Piano className={`w-5 h-5 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />}
                        </div>
                        Instrument Settings
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-base">Customize settings for your selected instrument</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-0">
                      <div className="space-y-3">
                        <Label className="text-slate-200 font-medium text-base">Select Instrument</Label>
                        <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                          <SelectTrigger className={`bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl h-12 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20 data-[state=open]:border-neon-cyan' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20 data-[state=open]:border-neon-purple'} hover:border-slate-400`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl">
                            <SelectItem value="guitar" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Guitar</SelectItem>
                            <SelectItem value="piano" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Piano</SelectItem>
                            <SelectItem value="bass" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Bass</SelectItem>
                            <SelectItem value="drums" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Drums</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedInstrument === "guitar" && (
                        <div className="grid gap-8 md:grid-cols-2">
                          <div>
                            <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Tunings</h4>
                            <p className="text-sm text-slate-400 mb-4">Click to update fretboard visualization</p>
                            <div className="space-y-3">
                              {Object.entries(tuningMap).slice(0, 4).map(([key, tuning]) => (
                                <button 
                                  key={key} 
                                  type="button"
                                  className={`w-full text-left p-4 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 ${
                                    selectedTuning === key 
                                      ? lessonMode ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-lg shadow-neon-cyan/20' : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/40 shadow-lg shadow-neon-purple/20'
                                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/40 backdrop-blur-md'
                                  }`}
                                  onClick={() => handleTuningChange(key)}
                                  disabled={tuningChangeAnimation}
                                >
                                  {tuning.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Voicings</h4>
                            <div className="space-y-3">
                              {["Open Chords", "Barre Chords", "Jazz Voicings", "Power Chords"].map((voicing) => (
                                <button 
                                  key={voicing} 
                                  type="button"
                                  className={`w-full text-left p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 ${lessonMode ? 'hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:text-neon-cyan' : 'hover:bg-neon-purple/10 hover:border-neon-purple/30 hover:text-neon-purple'} hover:shadow-lg`}
                                  onClick={() => handleVoicingSelect(voicing)}
                                >
                                  {voicing}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedInstrument === "piano" && (
                        <div className="grid gap-8 md:grid-cols-2">
                          <div>
                            <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Scales & Modes</h4>
                            <div className="space-y-3">
                              {["Major Scales", "Minor Scales", "Modal Scales", "Jazz Scales"].map((scale, index) => (
                                <div key={index} className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 hover:shadow-lg">
                                  {scale}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Voicings</h4>
                            <div className="space-y-3">
                              {["Triads", "7th Chords", "Extended Chords", "Inversions"].map((voicing) => (
                                <button 
                                  key={voicing} 
                                  type="button"
                                  className={`w-full text-left p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 ${lessonMode ? 'hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:text-neon-cyan' : 'hover:bg-neon-purple/10 hover:border-neon-purple/30 hover:text-neon-purple'} hover:shadow-lg`}
                                  onClick={() => handleVoicingSelect(voicing)}
                                >
                                  {voicing}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <GearChain 
                    lessonMode={lessonMode}
                    studioBrainResponse={instrumentMessages.length > 0 ? instrumentMessages[instrumentMessages.length - 1]?.content || '' : ''}
                    onGearUpdate={handleGearUpdate}
                  />
                </div>
                
                <div className="mt-8">
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle className={`flex items-center gap-3 text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                        <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                          <Lightbulb className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                        </div>
                        Ask StudioBrain
                      </CardTitle>
                      <CardDescription className={`text-lg ${lessonMode ? 'text-slate-300' : 'text-slate-300'}`}>Get instrument-specific advice and techniques</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-3">
                        <Label htmlFor="instrument-question" className={`text-base font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}>Your Question</Label>
                        <Textarea
                          id="instrument-question"
                          placeholder="Ask about your gear, tone settings, voicings, or how to practice better."
                          value={instrumentQuestion}
                          onChange={(e) => setInstrumentQuestion(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleInstrumentQuestion)}
                          className={`glass-textarea min-h-[100px] bg-glass-bg border border-glass-border rounded-xl p-4 text-white transition-all duration-300 hover:border-slate-400 ${lessonMode 
                            ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20' 
                            : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'
                          }`}
                        />
                      </div>
                      <Button 
                        onClick={handleInstrumentQuestion} 
                        disabled={instrumentLoading || !instrumentQuestion.trim()}
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
                      {renderMessageList(instrumentMessages, instrumentScrollRef, 'instrument', instrumentLoading)}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
            </div>
          </div>
        </div>
      </HydrationBoundary>
    </ErrorBoundary>
  )
}