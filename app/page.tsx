"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { HydrationBoundary } from "@/components/HydrationBoundary"

interface PluginSuggestion {
  name: string
  type: string
  description: string
  explanation?: string
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Music, Guitar, Piano, Volume2, Lightbulb, Loader2, RotateCcw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { OpenAIService } from "@/lib/openai-service"
import { VoicingView } from "@/components/VoicingView"
import { ChordShape } from "@/lib/voicings"
import SettingsButton from "@/components/SettingsButton"
import { useSessionStore } from "@/lib/useSessionStore"

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

  // Chat states for different tabs
  const [generalQuestion, setGeneralQuestion] = useState("")
  const [generalAnswer, setGeneralAnswer] = useState("")
  const [generalLoading, setGeneralLoading] = useState(false)

  const [mixQuestion, setMixQuestion] = useState("")
  const [mixAnswer, setMixAnswer] = useState("")
  const [mixPlugins, setMixPlugins] = useState<PluginSuggestion[]>([])
  const [mixLoading, setMixLoading] = useState(false)

  const [theoryQuestion, setTheoryQuestion] = useState("")
  const [theoryAnswer, setTheoryAnswer] = useState("")
  const [theoryLoading, setTheoryLoading] = useState(false)

  const [instrumentQuestion, setInstrumentQuestion] = useState("")
  const [instrumentAnswer, setInstrumentAnswer] = useState("")
  const [instrumentLoading, setInstrumentLoading] = useState(false)

  // Generate chords based on selected root and mode
  const generateChords = () => {
    const modes = {
      major: [0, 2, 4, 5, 7, 9, 11], // Ionian
      minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10]
    }

    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const rootIndex = notes.indexOf(selectedChord)
    const intervals = modes[selectedMode as keyof typeof modes] || modes.major
    
    return intervals.map((interval, index) => {
      const noteIndex = (rootIndex + interval) % 12
      const note = notes[noteIndex]
      const chordType = [0, 2, 4].includes(index) ? '' : (index === 6 && selectedMode === 'major') ? '°' : 'm'
      return `${note}${chordType}`
    }).slice(0, 7) // Return 7 chords for the mode
  }

  // Generate scale notes for visualization
  const generateScaleNotes = () => {
    const modes = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10]
    }

    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const rootIndex = notes.indexOf(selectedChord)
    const intervals = modes[selectedMode as keyof typeof modes] || modes.major
    
    return intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12
      return notes[noteIndex]
    })
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

  // Rehydration effect - restore last session
  useEffect(() => {
    if (lastInput) {
      setGeneralQuestion(lastInput)
    }
    if (lastOutput) {
      setGeneralAnswer(lastOutput)
    }
  }, [lastInput, lastOutput])

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      clearAllTimeouts()
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

  // Piano keyboard layout (2 octaves starting from C)
  const generatePianoKeys = (scaleNotes: string[], selectedChord: string, startOctave = 3, numOctaves = 2): PianoKey[] => {
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
  const pianoKeys = React.useMemo(() => generatePianoKeys(scaleNotes, selectedChord), [scaleNotes, selectedChord])

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

  // Chat handlers with scale detection
  const handleGeneralQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(generalQuestion)
    if (!sanitizedQuestion) return
    
    // Store the input in session
    setSession({ lastInput: sanitizedQuestion })
    
    setGeneralLoading(true)
    try {
      const response = await OpenAIService.askGeneral(sanitizedQuestion, lessonMode)
      if (isMounted.current) {
        const answer = response.response || response.error || 'No response'
        setGeneralAnswer(answer)
        
        // Store the output in session
        setSession({ lastOutput: answer })
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
      }
    } catch (error) {
      console.error('General question error:', error)
      if (isMounted.current) {
        const errorMessage = 'Error: Unable to get response from StudioBrain.'
        setGeneralAnswer(errorMessage)
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
    
    setMixLoading(true)
    try {
      const response = await OpenAIService.askMix(sanitizedQuestion, lessonMode)
      if (isMounted.current) {
        setMixAnswer(response.response || response.error || 'No response')
        setMixPlugins(response.pluginSuggestions || [])
      }
    } catch (error) {
      console.error('Mix question error:', error)
      if (isMounted.current) {
        setMixAnswer('Error: Unable to get response from StudioBrain.')
        setMixPlugins([])
      }
    }
    if (isMounted.current) {
      setMixLoading(false)
    }
  }

  const handleTheoryQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(theoryQuestion)
    if (!sanitizedQuestion) return
    
    setTheoryLoading(true)
    try {
      const response = await OpenAIService.askTheory(sanitizedQuestion, lessonMode)
      if (isMounted.current) {
        setTheoryAnswer(response.response || response.error || 'No response')
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
      }
    } catch (error) {
      console.error('Theory question error:', error)
      if (isMounted.current) {
        setTheoryAnswer('Error: Unable to get response from StudioBrain.')
      }
    }
    if (isMounted.current) {
      setTheoryLoading(false)
    }
  }

  const handleInstrumentQuestion = async () => {
    const sanitizedQuestion = sanitizeInput(instrumentQuestion)
    if (!sanitizedQuestion) return
    
    setInstrumentLoading(true)
    try {
      const response = await OpenAIService.askInstrument(sanitizedQuestion, lessonMode, selectedInstrument)
      if (isMounted.current) {
        setInstrumentAnswer(response.response || response.error || 'No response')
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
      }
    } catch (error) {
      console.error('Instrument question error:', error)
      if (isMounted.current) {
        setInstrumentAnswer('Error: Unable to get response from StudioBrain.')
      }
    }
    if (isMounted.current) {
      setInstrumentLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <HydrationBoundary fallback={
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-white p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading StudioBrain...</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Lesson Mode Toggle & Settings - Responsive Position */}
        <div className="flex items-center gap-4 absolute top-6 right-6 z-50 sm:top-6 sm:right-6 max-sm:top-4 max-sm:right-4">
          <SettingsButton />
          <div className={`flex items-center gap-3 p-3 backdrop-blur-xl rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-neon ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30 shadow-neon-cyan/20' : 'bg-glass-bg border-glass-border'}`}>
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
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative p-3 rounded-xl bg-glass-bg backdrop-blur-md border border-glass-border shadow-lg">
              <Music className={`w-10 h-10 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
            </div>
            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent">
              StudioBrain
            </h1>
          </div>
          <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">A sleek, modern creative assistant for musicians - powered by AI</p>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="general" className="space-y-8">
          <TabsList className={`grid w-full grid-cols-4 p-2 bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl ${lessonMode ? '[&>[data-state=active]]:bg-neon-cyan/20 [&>[data-state=active]]:text-neon-cyan [&>[data-state=active]]:shadow-lg [&>[data-state=active]]:shadow-neon-cyan/30' : '[&>[data-state=active]]:bg-neon-purple/20 [&>[data-state=active]]:text-neon-purple [&>[data-state=active]]:shadow-lg [&>[data-state=active]]:shadow-neon-purple/30'}`}>
            <TabsTrigger value="general" className={`transition-all duration-300 rounded-lg font-medium ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Lightbulb className="w-5 h-5 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="mix" className={`transition-all duration-300 rounded-lg font-medium ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Volume2 className="w-5 h-5 mr-2" />
              Mix
            </TabsTrigger>
            <TabsTrigger value="theory" className={`transition-all duration-300 rounded-lg font-medium ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
              <Music className="w-5 h-5 mr-2" />
              Theory
            </TabsTrigger>
            <TabsTrigger value="instrument" className={`transition-all duration-300 rounded-lg font-medium ${lessonMode ? 'text-slate-300 data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan' : 'text-slate-300 data-[state=active]:bg-neon-purple/20 data-[state=active]:text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple'}`}>
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
                    placeholder="Ask about music production, recording techniques, software, hardware, or general music advice..."
                    value={generalQuestion}
                    onChange={(e) => setGeneralQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleGeneralQuestion)}
                    className={`min-h-[100px] bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl p-4 text-white placeholder:text-slate-400 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'} hover:border-slate-400`}
                  />
                </div>
                <Button 
                  onClick={handleGeneralQuestion} 
                  disabled={generalLoading || !generalQuestion.trim()}
                  className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                    lessonMode 
                      ? 'bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/90 hover:to-neon-blue/90 text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50' 
                      : 'bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
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
                {generalAnswer && (
                  <div className={`mt-6 p-6 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-gradient-to-br from-neon-cyan/10 to-neon-blue/5 border-neon-cyan/30 shadow-lg shadow-neon-cyan/10' : 'bg-gradient-to-br from-neon-purple/10 to-neon-pink/5 border-neon-purple/30 shadow-lg shadow-neon-purple/10'}`}>
                    <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>StudioBrain's Answer:</h4>
                    <div className="text-slate-200 whitespace-pre-line leading-relaxed">{generalAnswer}</div>
                  </div>
                )}
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
                    placeholder="Ask about EQ, compression, reverb, stereo imaging, mixing techniques, or mastering..."
                    value={mixQuestion}
                    onChange={(e) => setMixQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleMixQuestion)}
                    className={`min-h-[100px] bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl p-4 text-white placeholder:text-slate-400 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'} hover:border-slate-400`}
                  />
                </div>
                <Button 
                  onClick={handleMixQuestion} 
                  disabled={mixLoading || !mixQuestion.trim()}
                  className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                    lessonMode 
                      ? 'bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/90 hover:to-neon-blue/90 text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50' 
                      : 'bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
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
                {mixAnswer && (
                  <div className={`mt-6 p-6 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-gradient-to-br from-neon-cyan/10 to-neon-blue/5 border-neon-cyan/30 shadow-lg shadow-neon-cyan/10' : 'bg-gradient-to-br from-neon-purple/10 to-neon-pink/5 border-neon-purple/30 shadow-lg shadow-neon-purple/10'}`}>
                    <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>StudioBrain's Answer:</h4>
                    <div className="text-slate-200 whitespace-pre-line leading-relaxed">{mixAnswer}</div>
                  </div>
                )}

                {mixPlugins.length > 0 && (
                  <div className={`mt-6 p-6 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-gradient-to-br from-neon-blue/10 to-neon-cyan/5 border-neon-blue/30 shadow-lg shadow-neon-blue/10' : 'bg-gradient-to-br from-neon-blue/10 to-neon-purple/5 border-neon-blue/30 shadow-lg shadow-neon-blue/10'}`}>
                    <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-blue' : 'text-neon-blue'} flex items-center gap-3`}>
                      <div className="p-2 rounded-lg bg-neon-blue/20">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      Suggested Plugin Chain
                    </h4>
                    <div className="space-y-4">
                      {mixPlugins.map((plugin, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-glass-bg backdrop-blur-sm rounded-xl border border-glass-border hover:border-neon-blue/40 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-neon-blue/20" 
                             onClick={(e) => {
                               // Simple visual feedback without state
                               const element = e.currentTarget as HTMLElement
                               if (element) {
                                 element.style.transform = 'scale(0.98)'
                                 addTimeout(setTimeout(() => {
                                   if (element && isMounted.current) {
                                     element.style.transform = 'scale(1.02)'
                                   }
                                 }, 150))
                               }
                             }}>
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${lessonMode ? 'bg-neon-cyan' : 'bg-neon-purple'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-white text-lg">{plugin.name}</span>
                              <Badge variant="outline" className={`px-3 py-1 rounded-lg font-medium transition-all duration-300 ${lessonMode ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple hover:bg-neon-purple/30'}`}>
                                {plugin.type}
                              </Badge>
                            </div>
                            <p className="text-slate-300 mb-2 leading-relaxed">{plugin.description}</p>
                            {plugin.explanation && (
                              <p className="text-slate-400 text-sm leading-relaxed">{plugin.explanation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-slate-400 flex items-center gap-2 p-3 bg-glass-bg rounded-lg border border-glass-border">
                      💡 <span>Click on plugins to highlight them in your chain</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="theory" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chord & Mode Explorer */}
              <Card className={`bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl transition-all duration-300 ${scaleChangeAnimation ? lessonMode ? 'ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20' : 'ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20' : ''}`}>
                <CardHeader className="pb-6">
                  <CardTitle className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                    <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                      <Music className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                    </div>
                    Chord & Mode Explorer
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-base">Explore scales, modes, and chord progressions interactively</CardDescription>
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
                          <SelectItem value="minor" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Minor (Aeolian)</SelectItem>
                          <SelectItem value="dorian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Dorian</SelectItem>
                          <SelectItem value="phrygian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Phrygian</SelectItem>
                          <SelectItem value="lydian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Lydian</SelectItem>
                          <SelectItem value="mixolydian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Mixolydian</SelectItem>
                          <SelectItem value="locrian" className={`rounded-lg ${lessonMode ? 'focus:bg-neon-cyan/20 focus:text-neon-cyan data-[highlighted]:bg-neon-cyan/20 data-[highlighted]:text-neon-cyan' : 'focus:bg-neon-purple/20 focus:text-neon-purple data-[highlighted]:bg-neon-purple/20 data-[highlighted]:text-neon-purple'}`}>Locrian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Generated Chords */}
                  <div>
                    <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>{selectedChord} {selectedMode} - Modal Chords</h4>
                    <div className="flex flex-wrap gap-3">
                      {generateChords().map((chord, chordIndex) => (
                        <Badge
                          key={chordIndex}
                          variant="outline"
                          className={`cursor-pointer transition-all duration-300 px-4 py-2 rounded-xl font-semibold hover:scale-105 ${
                            lessonMode 
                              ? `border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan hover:shadow-lg hover:shadow-neon-cyan/30 ${activeChord === chord ? 'bg-neon-cyan/20 border-neon-cyan shadow-lg shadow-neon-cyan/30' : 'bg-glass-bg backdrop-blur-sm'}` 
                              : `border-neon-purple/40 text-neon-purple hover:bg-neon-purple/20 hover:border-neon-purple hover:shadow-lg hover:shadow-neon-purple/30 ${activeChord === chord ? 'bg-neon-purple/20 border-neon-purple shadow-lg shadow-neon-purple/30' : 'bg-glass-bg backdrop-blur-sm'}`
                          }`}
                          onClick={() => setActiveChord(chord === activeChord ? null : chord)}
                        >
                          {chord}
                        </Badge>
                      ))}
                    </div>
                    {activeChord && (
                      <div className={`mt-6 p-4 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-neon-cyan/10 border-neon-cyan/30' : 'bg-neon-purple/10 border-neon-purple/30'}`}>
                        <h4 className={`font-bold mb-2 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Selected: {activeChord}</h4>
                        <p className="text-slate-300 leading-relaxed">
                          {activeChord.includes('m') && !activeChord.includes('dim') 
                            ? 'Minor chord - melancholic, introspective sound'
                            : activeChord.includes('dim')
                            ? 'Diminished chord - tense, unstable sound that wants to resolve'
                            : 'Major chord - bright, happy, stable sound'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Guitar Fretboard/Piano Visualization */}
              <Card className={`bg-neutral-900 border-neutral-800 transition-all duration-300 ${scaleChangeAnimation || tuningChangeAnimation || flipAnimation ? lessonMode ? 'ring-2 ring-sky-400/50 shadow-lg shadow-sky-400/20' : 'ring-2 ring-primary/50 shadow-lg shadow-primary/20' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                        {visualizerView === 'guitar' ? <Guitar className={`w-5 h-5 ${lessonMode ? 'text-sky-400' : ''}`} /> : <Piano className={`w-5 h-5 ${lessonMode ? 'text-sky-400' : ''}`} />}
                        {visualizerView === 'guitar' ? 'Guitar Fretboard' : 'Piano Keyboard'}
                      </CardTitle>
                      <CardDescription className={lessonMode ? 'text-sky-300' : ''}>
                        {selectedChord} {selectedMode} scale visualization {visualizerView === 'guitar' ? `- ${currentTuning.name}` : '- 2 Octaves (C3-B4)'} - Root notes in {lessonMode ? 'cyan, scale tones in blue' : 'pink, scale tones in purple'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={visualizerView === 'guitar' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setVisualizerView('guitar')}
                          className={`h-8 text-xs ${lessonMode ? (visualizerView === 'guitar' ? 'bg-sky-400 hover:bg-sky-500 text-white hover:text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300') : ''}`}
                        >
                          <Guitar className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Guitar</span>
                        </Button>
                        <Button
                          variant={visualizerView === 'piano' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setVisualizerView('piano')}
                          className={`h-8 text-xs ${lessonMode ? (visualizerView === 'piano' ? 'bg-sky-400 hover:bg-sky-500 text-white hover:text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300') : ''}`}
                        >
                          <Piano className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Piano</span>
                        </Button>
                        {visualizerView === 'guitar' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFretboardFlip}
                            className={`h-8 w-8 p-0 ${lessonMode ? 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300' : ''}`}
                            title={`${fretboardFlipped ? 'Standard view (High E top)' : 'Inverted view (Low E top)'}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {visualizerView === 'guitar' ? (
                    <>
                      <div>
                        <div className={`space-y-1 transition-transform duration-400 ${flipAnimation ? 'scale-y-95' : ''}`}>
                          {displayFretboard.map((string, stringIndex) => (
                            <div key={stringIndex} className="flex items-center gap-1">
                              <div className="w-6 text-xs font-mono text-gray-400 text-right flex-shrink-0">
                                {displayTuningStrings[stringIndex]}
                              </div>
                              <div className="flex gap-0.5 sm:gap-1">
                                {string.slice(0, 13).map((note, fretIndex) => {
                                  const isRoot = note === selectedChord
                                  const isInScale = scaleNotes.includes(note) && !isRoot
                                  return (
                                    <div
                                      key={fretIndex}
                                      className={`w-5 h-5 sm:w-8 sm:h-8 border border-gray-600 rounded flex items-center justify-center text-xs font-mono transition-colors duration-200 flex-shrink-0 ${
                                        isRoot 
                                          ? lessonMode ? 'bg-cyan-400 text-white border-cyan-300' : 'bg-pink-500 text-white border-pink-400'
                                          : isInScale 
                                          ? lessonMode ? 'bg-blue-500/70 text-white border-blue-400' : 'bg-purple-500/70 text-white border-purple-400'
                                          : 'bg-neutral-800 text-gray-400 hover:bg-gray-700'
                                      }`}
                                      title={`${note} ${isRoot ? '(Root)' : isInScale ? '(Scale)' : ''}`}
                                    >
                                      <span className="text-xs">{fretIndex === 0 ? note : note}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-start text-xs text-gray-500 ml-6">
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {Array.from({ length: 13 }, (_, i) => (
                              <span key={i} className={`w-5 sm:w-8 text-center flex-shrink-0 ${[3, 5, 7, 9, 12].includes(i) ? 'font-semibold' : ''}`}>
                                {i}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-neutral-800 p-4 rounded-lg">
                      <div className="flex justify-center overflow-x-auto">
                        <div className="relative scale-90 origin-center">
                          {/* White keys */}
                          <div className="flex">
                            {pianoKeys.filter(key => !key.isBlackKey).map((key, index) => (
                              <div
                                key={key.fullName}
                                className={`w-9 h-28 border border-gray-600 rounded-b flex items-end justify-center pb-1 text-xs font-mono transition-colors duration-200 ${
                                  key.isRoot 
                                    ? lessonMode ? 'bg-cyan-400 text-white border-cyan-300' : 'bg-pink-500 text-white border-pink-400'
                                    : key.isInScale 
                                    ? lessonMode ? 'bg-blue-500/70 text-white border-blue-400' : 'bg-purple-500/70 text-white border-purple-400'
                                    : 'bg-white text-black hover:bg-gray-100'
                                }`}
                                title={`${key.note}${key.octave} ${key.isRoot ? '(Root)' : key.isInScale ? '(Scale)' : ''}`}
                              >
                                {key.note}
                              </div>
                            ))}
                          </div>
                          
                          {/* Black keys */}
                          <div className="absolute top-0 flex">
                            {pianoKeys.filter(key => !key.isBlackKey).map((whiteKey, index) => {
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
                                <div key={blackKeyNote.fullName} className="relative">
                                  <div className="w-9 h-6"></div>
                                  <div
                                    className={`absolute top-0 left-7 w-5 h-20 border border-neutral-800 rounded-b flex items-end justify-center pb-1 text-xs font-mono transition-colors duration-200 ${
                                      blackKeyNote.isRoot 
                                        ? lessonMode ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-pink-600 text-white border-pink-500'
                                        : blackKeyNote.isInScale 
                                        ? lessonMode ? 'bg-blue-600/80 text-white border-blue-500' : 'bg-purple-600/80 text-white border-purple-500'
                                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                    }`}
                                    title={`${blackKeyNote.note}${blackKeyNote.octave} ${blackKeyNote.isRoot ? '(Root)' : blackKeyNote.isInScale ? '(Scale)' : ''}`}
                                  >
                                    {blackKeyNote.note}
                                  </div>
                                </div>
                              ) : (
                                <div key={`spacer-${index}`} className="w-9 h-6"></div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-4 text-xs text-gray-500">
                        C3 - B4 (2 Octaves)
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
                      placeholder="Ask about scales, chords, progressions, harmony, composition, songwriting, or analysis..."
                      value={theoryQuestion}
                      onChange={(e) => setTheoryQuestion(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleTheoryQuestion)}
                      className={`min-h-[100px] bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl p-4 text-white placeholder:text-slate-400 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'} hover:border-slate-400`}
                    />
                  </div>
                  <Button 
                    onClick={handleTheoryQuestion} 
                    disabled={theoryLoading || !theoryQuestion.trim()}
                    className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                      lessonMode 
                        ? 'bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/90 hover:to-neon-blue/90 text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50' 
                        : 'bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
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
                  {theoryAnswer && (
                    <div className={`mt-6 p-6 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-gradient-to-br from-neon-cyan/10 to-neon-blue/5 border-neon-cyan/30 shadow-lg shadow-neon-cyan/10' : 'bg-gradient-to-br from-neon-purple/10 to-neon-pink/5 border-neon-purple/30 shadow-lg shadow-neon-purple/10'}`}>
                      <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>StudioBrain's Answer:</h4>
                      <div className="text-slate-200 whitespace-pre-line leading-relaxed">{theoryAnswer}</div>
                    </div>
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
                  
                  <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
                    <CardHeader className="pb-6">
                      <CardTitle className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                        <div className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}>
                          <Guitar className={`w-5 h-5 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`} />
                        </div>
                        Gear
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-base">Guitar equipment and accessories</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-0">
                      <div>
                        <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Amplifiers</h4>
                        <div className="space-y-3">
                          {["Tube Amps", "Solid State", "Modeling Amps", "Practice Amps"].map((amp, index) => (
                            <div key={index} className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 hover:shadow-lg">
                              {amp}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Effects</h4>
                        <div className="space-y-3">
                          {["Distortion", "Reverb", "Delay", "Chorus"].map((effect, index) => (
                            <div key={index} className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 hover:shadow-lg">
                              {effect}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>Hardware</h4>
                        <div className="space-y-3">
                          {["Pickups", "Strings", "Picks", "Capos"].map((hardware, index) => (
                            <div key={index} className="p-4 bg-white/10 backdrop-blur-md rounded-xl text-sm font-medium text-white hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/40 hover:shadow-lg">
                              {hardware}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                          placeholder={`Ask about ${selectedInstrument} techniques, gear recommendations, playing tips, or instrument-specific questions...`}
                          value={instrumentQuestion}
                          onChange={(e) => setInstrumentQuestion(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleInstrumentQuestion)}
                          className={`min-h-[100px] bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl p-4 text-white placeholder:text-slate-400 transition-all duration-300 ${lessonMode ? 'focus:border-neon-cyan focus:shadow-lg focus:shadow-neon-cyan/20' : 'focus:border-neon-purple focus:shadow-lg focus:shadow-neon-purple/20'} hover:border-slate-400`}
                        />
                      </div>
                      <Button 
                        onClick={handleInstrumentQuestion} 
                        disabled={instrumentLoading || !instrumentQuestion.trim()}
                        className={`w-full h-12 font-semibold text-lg rounded-xl transition-all duration-300 disabled:opacity-50 ${
                          lessonMode 
                            ? 'bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/90 hover:to-neon-blue/90 text-black shadow-lg shadow-neon-cyan/30 hover:shadow-neon-cyan/50' 
                            : 'bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50'
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
                      {instrumentAnswer && (
                        <div className={`mt-6 p-6 rounded-xl border backdrop-blur-sm ${lessonMode ? 'bg-gradient-to-br from-neon-cyan/10 to-neon-blue/5 border-neon-cyan/30 shadow-lg shadow-neon-cyan/10' : 'bg-gradient-to-br from-neon-purple/10 to-neon-pink/5 border-neon-purple/30 shadow-lg shadow-neon-purple/10'}`}>
                          <h4 className={`font-bold text-lg mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}>StudioBrain's Answer:</h4>
                          <div className="text-slate-200 whitespace-pre-line leading-relaxed">{instrumentAnswer}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
        </div>
        </div>
      </HydrationBoundary>
    </ErrorBoundary>
  )
}