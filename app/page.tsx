"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"

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

interface PianoKey {
  note: string
  octave: number
  fullName: string
  isBlackKey: boolean
  isInScale: boolean
  isRoot: boolean
}

export default function StudioBrain() {
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
    
    setGeneralLoading(true)
    try {
      const response = await OpenAIService.askGeneral(sanitizedQuestion, lessonMode)
      if (isMounted.current) {
        setGeneralAnswer(response.response || response.error || 'No response')
        
        // Check for scale request and update visualizer
        if (response.scaleRequest) {
          handleScaleChange(response.scaleRequest.root, response.scaleRequest.mode)
        }
      }
    } catch (error) {
      console.error('General question error:', error)
      if (isMounted.current) {
        setGeneralAnswer('Error: Unable to get response from StudioBrain.')
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Lesson Mode Toggle - Fixed Position */}
        <div className="fixed top-6 right-6 z-50">
          <div className={`flex items-center gap-2 p-2 backdrop-blur-sm rounded-lg border shadow-lg ${lessonMode ? 'bg-sky-900/90 border-sky-600/50' : 'bg-neutral-900/90 border-neutral-700'}`}>
            <Lightbulb className={`w-4 h-4 ${lessonMode ? 'text-sky-400' : 'text-gray-500'}`} />
            <Switch
              id="lesson-mode"
              checked={lessonMode}
              onCheckedChange={setLessonMode}
              className={lessonMode ? 'data-[state=checked]:bg-sky-500' : ''}
            />
            <span className={`text-xs min-w-[40px] text-center ${lessonMode ? 'text-sky-200' : 'text-gray-400'}`}>
              {lessonMode ? 'Lesson' : 'Quick'}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Music className={`w-8 h-8 ${lessonMode ? 'text-sky-400' : 'text-primary'}`} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
              StudioBrain
            </h1>
          </div>
          <p className="text-gray-400 text-lg">Your AI-powered music production assistant</p>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-4 bg-neutral-900 border-neutral-800 ${lessonMode ? '[&>[data-state=active]]:bg-sky-900 [&>[data-state=active]]:text-sky-200' : ''}`}>
            <TabsTrigger value="general" className={lessonMode ? 'text-sky-400 data-[state=active]:bg-sky-900 data-[state=active]:text-sky-200 hover:bg-sky-800/50 hover:text-sky-300' : 'data-[state=active]:bg-neutral-800'}>
              <Lightbulb className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="mix" className={lessonMode ? 'text-sky-400 data-[state=active]:bg-sky-900 data-[state=active]:text-sky-200 hover:bg-sky-800/50 hover:text-sky-300' : 'data-[state=active]:bg-neutral-800'}>
              <Volume2 className="w-4 h-4 mr-2" />
              Mix
            </TabsTrigger>
            <TabsTrigger value="theory" className={lessonMode ? 'text-sky-400 data-[state=active]:bg-sky-900 data-[state=active]:text-sky-200 hover:bg-sky-800/50 hover:text-sky-300' : 'data-[state=active]:bg-neutral-800'}>
              <Music className="w-4 h-4 mr-2" />
              Theory
            </TabsTrigger>
            <TabsTrigger value="instrument" className={lessonMode ? 'text-sky-400 data-[state=active]:bg-sky-900 data-[state=active]:text-sky-200 hover:bg-sky-800/50 hover:text-sky-300' : 'data-[state=active]:bg-neutral-800'}>
              <Guitar className="w-4 h-4 mr-2" />
              Instrument
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                  <Lightbulb className={`w-4 h-4 ${lessonMode ? 'text-sky-400' : ''}`} />
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Get general music production advice and tips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="general-question" className={lessonMode ? 'text-sky-300' : ''}>Your Question</Label>
                  <Textarea
                    id="general-question"
                    placeholder="Ask about music production, recording techniques, software, hardware, or general music advice..."
                    value={generalQuestion}
                    onChange={(e) => setGeneralQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleGeneralQuestion)}
                    className={`min-h-[80px] bg-neutral-800 border-neutral-700 ${lessonMode ? 'text-sky-300 focus:border-sky-400 placeholder:text-sky-400/70' : 'focus:border-primary'}`}
                  />
                </div>
                <Button 
                  onClick={handleGeneralQuestion} 
                  disabled={generalLoading || !generalQuestion.trim()}
                  className={`w-full disabled:opacity-50 ${
                    lessonMode 
                      ? 'bg-sky-400 hover:bg-sky-500 border-sky-300' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {generalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    'Ask StudioBrain'
                  )}
                </Button>
                {generalAnswer && (
                  <div className={`mt-4 p-4 rounded-lg border ${lessonMode ? 'bg-gradient-to-r from-sky-900/20 to-blue-900/20 border-sky-400/30' : 'bg-gradient-to-r from-pink-900/20 to-rose-900/20 border-primary/30'}`}>
                    <h4 className={`font-semibold mb-2 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>StudioBrain's Answer:</h4>
                    <div className="text-gray-300 whitespace-pre-line">{generalAnswer}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mix" className="mt-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                  <Volume2 className={`w-4 h-4 ${lessonMode ? 'text-sky-400' : ''}`} />
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Get mixing and mastering advice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mix-question" className={lessonMode ? 'text-sky-300' : ''}>Your Question</Label>
                  <Textarea
                    id="mix-question"
                    placeholder="Ask about EQ, compression, reverb, stereo imaging, mixing techniques, or mastering..."
                    value={mixQuestion}
                    onChange={(e) => setMixQuestion(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleMixQuestion)}
                    className={`min-h-[80px] bg-neutral-800 border-neutral-700 ${lessonMode ? 'text-sky-300 focus:border-sky-400 placeholder:text-sky-400/70' : 'focus:border-primary'}`}
                  />
                </div>
                <Button 
                  onClick={handleMixQuestion} 
                  disabled={mixLoading || !mixQuestion.trim()}
                  className={`w-full disabled:opacity-50 ${
                    lessonMode 
                      ? 'bg-sky-400 hover:bg-sky-500 border-sky-300' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {mixLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mixing...
                    </>
                  ) : (
                    'Ask StudioBrain'
                  )}
                </Button>
                {mixAnswer && (
                  <div className={`mt-4 p-4 rounded-lg border ${lessonMode ? 'bg-gradient-to-r from-sky-900/20 to-blue-900/20 border-sky-400/30' : 'bg-gradient-to-r from-pink-900/20 to-rose-900/20 border-primary/30'}`}>
                    <h4 className={`font-semibold mb-2 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>StudioBrain's Answer:</h4>
                    <div className="text-gray-300 whitespace-pre-line">{mixAnswer}</div>
                  </div>
                )}

                {mixPlugins.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
                    <h4 className="font-semibold mb-3 text-blue-400 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Suggested Plugin Chain
                    </h4>
                    <div className="space-y-3">
                      {mixPlugins.map((plugin, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-neutral-800/50 rounded border border-neutral-700 hover:border-gray-600 transition-colors cursor-pointer" 
                             onClick={(e) => {
                               // Simple visual feedback without state
                               const element = e.currentTarget as HTMLElement
                               if (element) {
                                 element.style.transform = 'scale(0.98)'
                                 addTimeout(setTimeout(() => {
                                   if (element && isMounted.current) {
                                     element.style.transform = 'scale(1)'
                                   }
                                 }, 150))
                               }
                             }}>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm animate-pulse ${lessonMode ? 'bg-sky-400' : 'bg-primary'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{plugin.name}</span>
                              <Badge variant="outline" className={`text-xs bg-gray-700 text-gray-300 transition-colors ${lessonMode ? 'hover:bg-sky-400 hover:text-white' : 'hover:bg-primary hover:text-white'}`}>
                                {plugin.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">{plugin.description}</p>
                            {plugin.explanation && (
                              <p className="text-xs text-gray-500">{plugin.explanation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                      💡 <span>Click on plugins to highlight them in your chain</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="theory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chord & Mode Explorer */}
              <Card className={`bg-neutral-900 border-neutral-800 transition-all duration-300 ${scaleChangeAnimation ? lessonMode ? 'ring-2 ring-sky-400/50 shadow-lg shadow-sky-400/20' : 'ring-2 ring-primary/50 shadow-lg shadow-primary/20' : ''}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                    <Music className={`w-5 h-5 ${lessonMode ? 'text-sky-400' : ''}`} />
                    Chord & Mode Explorer
                  </CardTitle>
                  <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Explore scales, modes, and chord progressions interactively</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="root-select" className={lessonMode ? 'text-sky-300' : ''}>Root Note</Label>
                      <Select value={selectedChord} onValueChange={(value) => handleScaleChange(value, selectedMode)}>
                        <SelectTrigger id="root-select" className={`bg-neutral-800 border-neutral-700 ${lessonMode ? 'focus:border-sky-400 data-[state=open]:border-sky-400' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(note => (
                            <SelectItem key={note} value={note} className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>{note}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mode-select" className={lessonMode ? 'text-sky-300' : ''}>Mode</Label>
                      <Select value={selectedMode} onValueChange={(value) => handleScaleChange(selectedChord, value)}>
                        <SelectTrigger id="mode-select" className={`bg-neutral-800 border-neutral-700 ${lessonMode ? 'focus:border-sky-400 data-[state=open]:border-sky-400' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          <SelectItem value="major" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Major (Ionian)</SelectItem>
                          <SelectItem value="minor" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Minor (Aeolian)</SelectItem>
                          <SelectItem value="dorian" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Dorian</SelectItem>
                          <SelectItem value="phrygian" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Phrygian</SelectItem>
                          <SelectItem value="lydian" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Lydian</SelectItem>
                          <SelectItem value="mixolydian" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Mixolydian</SelectItem>
                          <SelectItem value="locrian" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Locrian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Generated Chords */}
                  <div>
                    <h4 className={`font-medium mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>{selectedChord} {selectedMode} - Modal Chords</h4>
                    <div className="flex flex-wrap gap-2">
                      {generateChords().map((chord, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`cursor-pointer transition-colors ${
                            lessonMode 
                              ? `border-sky-400 text-sky-400 hover:bg-sky-400 hover:text-white ${activeChord === chord ? 'bg-sky-400 text-white' : ''}` 
                              : `border-primary text-primary hover:bg-primary hover:text-primary-foreground ${activeChord === chord ? 'bg-primary text-primary-foreground' : ''}`
                          }`}
                          onClick={() => setActiveChord(chord === activeChord ? null : chord)}
                        >
                          {chord}
                        </Badge>
                      ))}
                    </div>
                    {activeChord && (
                      <div className="mt-3 p-3 bg-neutral-800 rounded-lg">
                        <h4 className={`font-medium mb-1 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Selected: {activeChord}</h4>
                        <p className="text-sm text-gray-400">
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant={visualizerView === 'guitar' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVisualizerView('guitar')}
                        className={`h-8 text-xs ${lessonMode ? (visualizerView === 'guitar' ? 'bg-sky-400 hover:bg-sky-500 text-white hover:text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300') : ''}`}
                      >
                        <Guitar className="w-3 h-3 mr-1" />
                        Guitar
                      </Button>
                      <Button
                        variant={visualizerView === 'piano' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVisualizerView('piano')}
                        className={`h-8 text-xs ${lessonMode ? (visualizerView === 'piano' ? 'bg-sky-400 hover:bg-sky-500 text-white hover:text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300') : ''}`}
                      >
                        <Piano className="w-3 h-3 mr-1" />
                        Piano
                      </Button>
                      <div className="w-12 flex justify-center">
                        {visualizerView === 'guitar' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFretboardFlip}
                            className={`h-6 w-6 p-0 ${lessonMode ? 'border-sky-400 text-sky-400 hover:bg-sky-400/20 hover:text-sky-300' : ''}`}
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
                      <div className={`space-y-1 transition-transform duration-400 ${flipAnimation ? 'scale-y-95' : ''}`}>
                        {displayFretboard.map((string, stringIndex) => (
                          <div key={stringIndex} className="flex items-center gap-1">
                            <div className="w-6 text-xs font-mono text-gray-400 text-right">
                              {displayTuningStrings[stringIndex]}
                            </div>
                            <div className="flex gap-1 flex-1">
                              {string.slice(0, 13).map((note, fretIndex) => {
                                const isRoot = note === selectedChord
                                const isInScale = scaleNotes.includes(note) && !isRoot
                                return (
                                  <div
                                    key={fretIndex}
                                    className={`w-8 h-8 border border-gray-600 rounded flex items-center justify-center text-xs font-mono transition-colors duration-200 ${
                                      isRoot 
                                        ? lessonMode ? 'bg-cyan-400 text-white border-cyan-300' : 'bg-pink-500 text-white border-pink-400'
                                        : isInScale 
                                        ? lessonMode ? 'bg-blue-500/70 text-white border-blue-400' : 'bg-purple-500/70 text-white border-purple-400'
                                        : 'bg-neutral-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                    title={`${note} ${isRoot ? '(Root)' : isInScale ? '(Scale)' : ''}`}
                                  >
                                    {fretIndex === 0 ? note : note}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center mt-4 text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>0</span><span>3</span><span>5</span><span>7</span><span>9</span><span>12</span>
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
            <Card className="bg-neutral-900 border-neutral-800 mt-6">
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                  <Lightbulb className={`w-4 h-4 ${lessonMode ? 'text-sky-400' : ''}`} />
                  Ask StudioBrain
                </CardTitle>
                <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Get music theory and composition help</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theory-question" className={lessonMode ? 'text-sky-300' : ''}>Your Question</Label>
                    <Textarea
                      id="theory-question"
                      placeholder="Ask about scales, chords, progressions, harmony, composition, songwriting, or analysis..."
                      value={theoryQuestion}
                      onChange={(e) => setTheoryQuestion(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleTheoryQuestion)}
                      className={`min-h-[80px] bg-neutral-800 border-neutral-700 ${lessonMode ? 'text-sky-300 focus:border-sky-400 placeholder:text-sky-400/70' : 'focus:border-primary'}`}
                    />
                  </div>
                  <Button 
                    onClick={handleTheoryQuestion} 
                    disabled={theoryLoading || !theoryQuestion.trim()}
                    className={`w-full disabled:opacity-50 ${
                      lessonMode 
                        ? 'bg-sky-400 hover:bg-sky-500 border-sky-300' 
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {theoryLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing theory...
                      </>
                    ) : (
                      'Ask StudioBrain'
                    )}
                  </Button>
                  {theoryAnswer && (
                    <div className={`mt-4 p-4 rounded-lg border ${lessonMode ? 'bg-gradient-to-r from-sky-900/20 to-blue-900/20 border-sky-400/30' : 'bg-gradient-to-r from-pink-900/20 to-rose-900/20 border-primary/30'}`}>
                      <h4 className={`font-semibold mb-2 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>StudioBrain's Answer:</h4>
                      <div className="text-gray-300 whitespace-pre-line">{theoryAnswer}</div>
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
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                      {selectedInstrument === "guitar" ? <Guitar className={`w-5 h-5 ${lessonMode ? 'text-sky-400' : ''}`} /> : <Piano className={`w-5 h-5 ${lessonMode ? 'text-sky-400' : ''}`} />}
                      Instrument Settings
                    </CardTitle>
                    <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Customize settings for your selected instrument</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className={lessonMode ? 'text-sky-300' : ''}>Select Instrument</Label>
                      <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                        <SelectTrigger className={`bg-neutral-800 border-neutral-700 ${lessonMode ? 'focus:border-sky-400 data-[state=open]:border-sky-400' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          <SelectItem value="guitar" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Guitar</SelectItem>
                          <SelectItem value="piano" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Piano</SelectItem>
                          <SelectItem value="bass" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Bass</SelectItem>
                          <SelectItem value="drums" className={lessonMode ? 'focus:bg-sky-400 focus:text-white data-[highlighted]:bg-sky-400 data-[highlighted]:text-white' : ''}>Drums</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedInstrument === "guitar" && (
                      <div className="grid gap-6 md:grid-cols-3">
                        <div>
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Tunings</h4>
                          <p className="text-xs text-gray-400 mb-3">Click to update fretboard visualization</p>
                          <div className="space-y-2">
                            {Object.entries(tuningMap).map(([key, tuning]) => (
                              <button 
                                key={key} 
                                type="button"
                                className={`w-full text-left p-2 rounded text-sm cursor-pointer transition-all duration-200 ${
                                  selectedTuning === key 
                                    ? lessonMode ? 'bg-sky-400 text-white border border-sky-300 shadow-md' : 'bg-primary text-primary-foreground border border-primary shadow-md'
                                    : 'bg-neutral-800 hover:bg-gray-700 border border-transparent'
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
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Voicings</h4>
                          <div className="space-y-2">
                            {["Open Chords", "Barre Chords", "Jazz Voicings", "Power Chords"].map((voicing) => (
                              <button 
                                key={voicing} 
                                type="button"
                                className={`w-full text-left p-2 bg-neutral-800 rounded text-sm hover:bg-gray-700 cursor-pointer transition-colors ${lessonMode ? 'hover:bg-sky-400/20' : 'hover:bg-primary/20'}`}
                                onClick={() => handleVoicingSelect(voicing)}
                              >
                                {voicing}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Gear</h4>
                          <div className="space-y-2">
                            {["Amplifiers", "Effects Pedals", "Pickups", "Strings"].map((gear, index) => (
                              <div key={index} className="p-2 bg-neutral-800 rounded text-sm hover:bg-gray-700 cursor-pointer">
                                {gear}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedInstrument === "piano" && (
                      <div className="grid gap-6 md:grid-cols-3">
                        <div>
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Scales & Modes</h4>
                          <div className="space-y-2">
                            {["Major Scales", "Minor Scales", "Modal Scales", "Jazz Scales"].map((scale, index) => (
                              <div key={index} className="p-2 bg-neutral-800 rounded text-sm hover:bg-gray-700 cursor-pointer">
                                {scale}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Voicings</h4>
                          <div className="space-y-2">
                            {["Triads", "7th Chords", "Extended Chords", "Inversions"].map((voicing) => (
                              <button 
                                key={voicing} 
                                type="button"
                                className={`w-full text-left p-2 bg-neutral-800 rounded text-sm hover:bg-gray-700 cursor-pointer transition-colors ${lessonMode ? 'hover:bg-sky-400/20' : 'hover:bg-primary/20'}`}
                                onClick={() => handleVoicingSelect(voicing)}
                              >
                                {voicing}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className={`font-semibold mb-3 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>Techniques</h4>
                          <div className="space-y-2">
                            {["Arpeggios", "Scales", "Chord Progressions", "Improvisation"].map((technique, index) => (
                              <div key={index} className="p-2 bg-neutral-800 rounded text-sm hover:bg-gray-700 cursor-pointer">
                                {technique}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="mt-6">
                  <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${lessonMode ? 'text-sky-400' : ''}`}>
                        <Lightbulb className={`w-4 h-4 ${lessonMode ? 'text-sky-400' : ''}`} />
                        Ask StudioBrain
                      </CardTitle>
                      <CardDescription className={lessonMode ? 'text-sky-300' : ''}>Get instrument-specific advice and techniques</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="instrument-question" className={lessonMode ? 'text-sky-300' : ''}>Your Question</Label>
                        <Textarea
                          id="instrument-question"
                          placeholder={`Ask about ${selectedInstrument} techniques, gear recommendations, playing tips, or instrument-specific questions...`}
                          value={instrumentQuestion}
                          onChange={(e) => setInstrumentQuestion(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, handleInstrumentQuestion)}
                          className={`min-h-[80px] bg-neutral-800 border-neutral-700 ${lessonMode ? 'text-sky-300 focus:border-sky-400 placeholder:text-sky-400/70' : 'focus:border-primary'}`}
                        />
                      </div>
                      <Button 
                        onClick={handleInstrumentQuestion} 
                        disabled={instrumentLoading || !instrumentQuestion.trim()}
                        className={`w-full disabled:opacity-50 ${
                          lessonMode 
                            ? 'bg-sky-400 hover:bg-sky-500 border-sky-300' 
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                      >
                        {instrumentLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting tips...
                          </>
                        ) : (
                          'Ask StudioBrain'
                        )}
                      </Button>
                      {instrumentAnswer && (
                        <div className={`mt-4 p-4 rounded-lg border ${lessonMode ? 'bg-gradient-to-r from-sky-900/20 to-blue-900/20 border-sky-400/30' : 'bg-gradient-to-r from-pink-900/20 to-rose-900/20 border-primary/30'}`}>
                          <h4 className={`font-semibold mb-2 ${lessonMode ? 'text-sky-400' : 'text-primary'}`}>StudioBrain's Answer:</h4>
                          <div className="text-gray-300 whitespace-pre-line">{instrumentAnswer}</div>
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
    </ErrorBoundary>
  )
}