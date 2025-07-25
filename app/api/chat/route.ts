import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface PluginSuggestion {
  name: string
  type: string
  description: string
  explanation?: string
}

function parsePluginSuggestions(text: string): PluginSuggestion[] {
  const plugins: PluginSuggestion[] = []
  
  // Look for structured plugin data in the response
  const pluginMatches = text.match(/PLUGIN:\s*(.+?)\s*TYPE:\s*(.+?)\s*SETTINGS:\s*(.+?)(?:\s*EXPLANATION:\s*(.+?))?(?=\n|$|PLUGIN:|$)/gi)
  
  if (pluginMatches) {
    pluginMatches.forEach(match => {
      const nameMatch = match.match(/PLUGIN:\s*(.+?)(?=\s*TYPE:)/i)
      const typeMatch = match.match(/TYPE:\s*(.+?)(?=\s*SETTINGS:)/i)
      const settingsMatch = match.match(/SETTINGS:\s*(.+?)(?=\s*(?:EXPLANATION:|$))/i)
      const explanationMatch = match.match(/EXPLANATION:\s*(.+?)$/i)
      
      if (nameMatch && typeMatch && settingsMatch) {
        plugins.push({
          name: nameMatch[1].trim(),
          type: typeMatch[1].trim(),
          description: settingsMatch[1].trim(),
          explanation: explanationMatch ? explanationMatch[1].trim() : undefined
        })
      }
    })
  }
  
  // Fallback: try to extract from numbered list format
  if (plugins.length === 0) {
    const lines = text.split('\n')
    lines.forEach(line => {
      const match = line.match(/^\d+\.?\s*(.+?)\s*[-–]\s*(.+?)\s*[-–]\s*(.+)$/i)
      if (match) {
        plugins.push({
          name: match[1].trim(),
          type: match[2].trim(),
          description: match[3].trim()
        })
      }
    })
  }
  
  return plugins.slice(0, 4) // Limit to 4 suggestions
}

interface ScaleRequest {
  root: string
  mode: string
}

// Advanced chord progression analysis
interface ParsedChord {
  root: string
  quality: string
  extensions: string[]
  bass?: string
}

interface ModalAnalysis {
  bestMode: string
  bestRoot: string
  confidence: number
  reason: string
  borrowedChords: string[]
  allNotesUsed: string[]
}

function parseChord(chordSymbol: string): ParsedChord | null {
  // Normalize input
  const normalized = chordSymbol.trim().replace(/[♭b]/g, 'b').replace(/[♯#]/g, '#')
  
  // Parse chord components: Root + Quality + Extensions + Bass
  const chordPattern = /^([A-G][#b]?)([^\/]*?)(?:\/([A-G][#b]?))?$/
  const match = normalized.match(chordPattern)
  
  if (!match) return null
  
  const [, root, qualityAndExtensions, bass] = match
  
  // Parse quality and extensions
  let quality = 'major' // default
  const extensions: string[] = []
  
  const qualityPart = qualityAndExtensions.toLowerCase()
  
  if (qualityPart.includes('m') && !qualityPart.includes('maj')) {
    quality = 'minor'
  } else if (qualityPart.includes('dim')) {
    quality = 'diminished'
  } else if (qualityPart.includes('aug') || qualityPart.includes('+')) {
    quality = 'augmented'
  }
  
  // Extract extensions
  const extensionMatches = qualityPart.match(/(\d+)/g)
  if (extensionMatches) {
    extensions.push(...extensionMatches)
  }
  
  return { root, quality, extensions, bass }
}

function getChordTones(chord: ParsedChord): string[] {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const rootIndex = notes.indexOf(chord.root)
  const tones: string[] = []
  
  if (rootIndex === -1) return tones
  
  // Add root
  tones.push(chord.root)
  
  // Add third
  const thirdInterval = chord.quality === 'minor' ? 3 : chord.quality === 'diminished' ? 3 : 4
  tones.push(notes[(rootIndex + thirdInterval) % 12])
  
  // Add fifth
  const fifthInterval = chord.quality === 'diminished' ? 6 : chord.quality === 'augmented' ? 8 : 7
  tones.push(notes[(rootIndex + fifthInterval) % 12])
  
  // Add extensions
  for (const ext of chord.extensions) {
    const extNum = parseInt(ext)
    if (extNum === 7) {
      const seventhInterval = chord.quality === 'minor' && !ext.includes('maj') ? 10 : 11
      tones.push(notes[(rootIndex + seventhInterval) % 12])
    } else if (extNum === 9) {
      tones.push(notes[(rootIndex + 2) % 12])
    } else if (extNum === 11) {
      tones.push(notes[(rootIndex + 5) % 12])
    } else if (extNum === 13) {
      tones.push(notes[(rootIndex + 9) % 12])
    }
  }
  
  // Add bass note if different
  if (chord.bass && chord.bass !== chord.root) {
    tones.push(chord.bass)
  }
  
  return [...new Set(tones)] // Remove duplicates
}

function getModeNotes(root: string, mode: string): string[] {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const rootIndex = notes.indexOf(root)
  
  if (rootIndex === -1) return []
  
  const modeIntervals: { [key: string]: number[] } = {
    major: [0, 2, 4, 5, 7, 9, 11], // Ionian
    minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
  }
  
  const intervals = modeIntervals[mode] || modeIntervals.major
  return intervals.map(interval => notes[(rootIndex + interval) % 12])
}

function analyzeChordProgression(chordString: string): ModalAnalysis | null {
  // Parse chord symbols from text
  const chordMatches = chordString.match(/[A-G][#b]?(?:maj|min|m|dim|aug|\+|sus|add|\d)*(?:\/[A-G][#b]?)?/gi)
  
  if (!chordMatches || chordMatches.length === 0) return null
  
  const parsedChords = chordMatches.map(parseChord).filter(Boolean) as ParsedChord[]
  if (parsedChords.length === 0) return null
  
  // Get all unique notes used in progression
  const allNotesUsed = [...new Set(parsedChords.flatMap(getChordTones))].sort()
  
  // Assume first chord is tonic for analysis
  const tonicChord = parsedChords[0]
  const possibleRoots = [tonicChord.root]
  
  // Test all modes for each possible root
  const modes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']
  let bestFit: ModalAnalysis = {
    bestMode: 'major',
    bestRoot: tonicChord.root,
    confidence: 0,
    reason: '',
    borrowedChords: [],
    allNotesUsed
  }
  
  for (const root of possibleRoots) {
    for (const mode of modes) {
      const modeNotes = getModeNotes(root, mode)
      const notesInMode = allNotesUsed.filter(note => modeNotes.includes(note))
      const notesOutOfMode = allNotesUsed.filter(note => !modeNotes.includes(note))
      
      // Calculate fitness score
      const coverage = notesInMode.length / allNotesUsed.length
      const penalty = notesOutOfMode.length * 0.2
      const confidence = Math.max(0, coverage - penalty)
      
      // Bonus for characteristic modal notes
      let modalBonus = 0
      if (mode === 'lydian') {
        const lydianFourth = getModeNotes(root, 'lydian')[3] // The #4
        if (allNotesUsed.includes(lydianFourth)) modalBonus += 0.3
      }
      if (mode === 'mixolydian') {
        const mixolydianSeventh = getModeNotes(root, 'mixolydian')[6] // The b7
        if (allNotesUsed.includes(mixolydianSeventh)) modalBonus += 0.2
      }
      if (mode === 'dorian') {
        const dorianSixth = getModeNotes(root, 'dorian')[5] // The natural 6
        if (allNotesUsed.includes(dorianSixth)) modalBonus += 0.2
      }
      
      const finalScore = confidence + modalBonus
      
      if (finalScore > bestFit.confidence) {
        // Find borrowed chords
        const borrowedChords = parsedChords
          .filter(chord => {
            const chordTones = getChordTones(chord)
            return chordTones.some(tone => notesOutOfMode.includes(tone))
          })
          .map(chord => `${chord.root}${chord.quality === 'minor' ? 'm' : ''}${chord.extensions.join('')}`)
        
        // Generate reason
        let reason = ''
        if (notesOutOfMode.length > 0) {
          const outOfKeyNotes = notesOutOfMode.join(', ')
          reason = `Contains ${outOfKeyNotes}, which ${notesOutOfMode.length === 1 ? 'is' : 'are'} not in ${root} major. ${root} ${mode} includes ${notesOutOfMode.length === 1 ? 'this note' : 'these notes'}, making it a better modal fit.`
        } else {
          reason = `All notes fit within ${root} ${mode}.`
        }
        
        if (modalBonus > 0) {
          reason += ` The presence of characteristic ${mode} tones strengthens this analysis.`
        }
        
        bestFit = {
          bestMode: mode,
          bestRoot: root,
          confidence: finalScore,
          reason,
          borrowedChords,
          allNotesUsed
        }
      }
    }
  }
  
  return bestFit
}

function parseScaleRequest(text: string): ScaleRequest | null {
  const normalizedText = text.toLowerCase()
  
  // First try chord progression analysis
  const chordAnalysis = analyzeChordProgression(text)
  if (chordAnalysis && chordAnalysis.confidence > 0.6) {
    return {
      root: chordAnalysis.bestRoot,
      mode: chordAnalysis.bestMode
    }
  }
  
  // Fallback to simple scale request patterns
  const scalePatterns = [
    /(?:show|play|display|give|teach).*?([a-g]#?b?)\s+(major|minor|dorian|phrygian|lydian|mixolydian|locrian|ionian|aeolian)/i,
    /([a-g]#?b?)\s+(major|minor|dorian|phrygian|lydian|mixolydian|locrian|ionian|aeolian)\s*(?:scale|mode)?/i,
    /(major|minor|dorian|phrygian|lydian|mixolydian|locrian|ionian|aeolian).*?(?:in|of|on)\s+([a-g]#?b?)/i
  ]
  
  for (const pattern of scalePatterns) {
    const match = normalizedText.match(pattern)
    if (match) {
      let root = match[1] || match[2]
      let mode = match[2] || match[1]
      
      root = root.charAt(0).toUpperCase() + root.slice(1).toLowerCase()
      root = root.replace('b', '♭').replace('#', '#')
      
      const noteMap: { [key: string]: string } = {
        'A♭': 'G#', 'B♭': 'A#', 'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#',
        'Ab': 'G#', 'Bb': 'A#', 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#'
      }
      root = noteMap[root] || root
      
      const modeMap: { [key: string]: string } = {
        'ionian': 'major',
        'aeolian': 'minor'
      }
      mode = modeMap[mode.toLowerCase()] || mode.toLowerCase()
      
      return { root, mode }
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { fullPrompt, originalMessage, context, lessonMode, instrumentType } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: '',
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.',
      })
    }

    console.log('🚀 API: Received pre-built prompt from client')
    console.log('ORIGINAL MESSAGE:', originalMessage)
    console.log('FULL PROMPT RECEIVED:', fullPrompt)
    console.log("OPENAI PROMPT SENT:", fullPrompt)

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: fullPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || ''
    const pluginSuggestions = context === 'mix' ? parsePluginSuggestions(response) : []
    const scaleRequest = parseScaleRequest(originalMessage) // Parse from original user message
    const modalAnalysis = analyzeChordProgression(originalMessage) // Advanced chord analysis

    // If we have a strong modal analysis, include it in the response
    let enhancedResponse = response
    if (modalAnalysis && modalAnalysis.confidence > 0.7 && context === 'theory') {
      enhancedResponse += `\n\n**Modal Analysis:**\n• **Best scale:** ${modalAnalysis.bestRoot} ${modalAnalysis.bestMode}\n• **Reason:** ${modalAnalysis.reason}`
      
      if (modalAnalysis.borrowedChords.length > 0) {
        enhancedResponse += `\n• **Borrowed chords:** ${modalAnalysis.borrowedChords.join(', ')}`
      }
      
      enhancedResponse += `\n• **All notes used:** ${modalAnalysis.allNotesUsed.join(', ')}`
    }

    return NextResponse.json({
      response: enhancedResponse,
      pluginSuggestions,
      scaleRequest,
      modalAnalysis,
      error: null,
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json({
      response: '',
      error: `API Error: ${errorMessage}. Please check your OpenAI API key and try again.`,
    })
  }
}