import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { reviewResponse, shouldSkipCritic } from '@/lib/criticService'

// Rate limiting storage - in production, consider using Redis or a database
interface RateLimitEntry {
  count: number
  resetTime: number
}

// Memory store for rate limiting (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limiting configuration
const RATE_LIMITS = {
  DEFAULT_DAILY_LIMIT: 50,
  LESSON_MODE_DAILY_LIMIT: 25,
  RESET_INTERVAL_MS: 24 * 60 * 60 * 1000 // 24 hours
}

function getRateLimitKey(request: NextRequest): string {
  // Try to get IP address from various headers (for different deployment environments)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  // Fallback to session ID if available (you could also use cookies here)
  const sessionId = request.headers.get('x-session-id')
  
  return sessionId || ip
}

function checkRateLimit(userKey: string, lessonMode: boolean): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const limit = lessonMode ? RATE_LIMITS.LESSON_MODE_DAILY_LIMIT : RATE_LIMITS.DEFAULT_DAILY_LIMIT
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(userKey)
  
  // Check if we need to reset the counter (24 hours have passed)
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMITS.RESET_INTERVAL_MS
    }
    rateLimitStore.set(userKey, entry)
  }
  
  // Check if user has exceeded limit
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }
  
  // Increment counter and update store
  entry.count += 1
  rateLimitStore.set(userKey, entry)
  
  return { allowed: true, remaining: limit - entry.count }
}

// Optional: Cleanup function to remove expired entries (call periodically)
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000)

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

interface UserSettings {
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  roles: string[]
  mainInstrument: 'guitar' | 'keyboard' | 'bass'
  preferredTuning: string
  genreInfluence: string[]
  flipFretboardView: boolean
  gear: {
    guitar: string[]
    pedals: string[]
    interface: string
    monitors: string
    plugins: string[]
    daw: string
  }
  hasHydrated: boolean
}

// Toggle to enable/disable prompt reframing
const ENABLE_PROMPT_REFRAMING = true

interface GearSettings {
  guitar: string[]
  pedals: string[]
  interface: string
  monitors: string
  plugins: string[]
  daw: string
}

// Plugin categorization for tab-specific recommendations
function categorizeUserPlugins(plugins: string[], context: string): { valid: string[], invalid: string[] } {
  const mixingPlugins = [
    'uad', '1176', 'la-2a', 'pultec', 'neve', 'ssl', 'fairchild', 'distressor',
    'waves', 'channel eq', 'compressor', 'chromaverb', 'space designer', 'tape',
    'vintage eq', 'deesser', 'multipressor', 'enveloper', 'linear phase eq'
  ]
  
  const tonePlugins = [
    'neural dsp', 'archetype', 'plini', 'nolly', 'gojira', 'petrucci', 'abasi',
    'bias amp', 'amplitube', 'guitar rig', 'logic amp', 'amp designer',
    'helix native', 'axe fx', 'kemper', 'th-u'
  ]
  
  const valid: string[] = []
  const invalid: string[] = []
  
  plugins.forEach(plugin => {
    const lowerPlugin = plugin.toLowerCase()
    
    if (context === 'mix') {
      // Mix tab should get mixing plugins and tone plugins for amp simulation
      const isMixingPlugin = mixingPlugins.some(mix => lowerPlugin.includes(mix))
      const isTonePlugin = tonePlugins.some(tone => lowerPlugin.includes(tone))
      
      if (isMixingPlugin || isTonePlugin) {
        valid.push(plugin)
      } else {
        invalid.push(plugin)
      }
    } else if (context === 'instrument') {
      // Instrument tab should get tone plugins but NOT mixing plugins
      const isTonePlugin = tonePlugins.some(tone => lowerPlugin.includes(tone))
      const isMixingPlugin = mixingPlugins.some(mix => lowerPlugin.includes(mix)) && 
                            !tonePlugins.some(tone => lowerPlugin.includes(tone)) // Exclude Neural DSP which can be both
      
      if (isTonePlugin && !isMixingPlugin) {
        valid.push(plugin)
      } else if (isMixingPlugin) {
        invalid.push(plugin)
      } else {
        // Unknown plugins go to valid for now
        valid.push(plugin)
      }
    } else {
      // Other tabs get all plugins
      valid.push(plugin)
    }
  })
  
  return { valid, invalid }
}

function getValidAmpModels(userGear: GearSettings, context: string): string[] {
  const ampModels: string[] = []
  
  // Check for hardware amp modeling devices
  const allHardware = [...userGear.pedals, userGear.interface].join(' ').toLowerCase()
  
  // Quad Cortex / Nano Cortex amp models
  if (allHardware.includes('quad cortex') || allHardware.includes('cortex')) {
    ampModels.push(
      'Fender Twin Reverb', 'Fender Deluxe Reverb', 'Fender Bassman',
      'Marshall JCM800', 'Marshall JCM2000', 'Marshall Plexi',
      'Vox AC30', 'Vox AC15',
      'Mesa Boogie Dual Rectifier', 'Mesa Boogie Mark V',
      'Orange Rockerverb', 'Orange OR50',
      'Two-Rock Classic Reverb', 'Two-Rock Custom Reverb'
    )
  }
  
  // Line 6 HX devices
  if (allHardware.includes('hx') || allHardware.includes('helix') || allHardware.includes('pod')) {
    ampModels.push(
      'US Double Nrm (Twin Reverb)', 'US Double Vib (Twin Reverb Vibrato)',
      'US Deluxe Nrm (Deluxe Reverb)', 'US Princess (Princeton Reverb)',
      'Brit 2204 (JCM800)', 'Brit Plexi (Marshall Plexi)', 'Brit J45 Nrm (JTM45)',
      'AC-30 Fawn (Vox AC30)', 'AC-15 (Vox AC15)',
      'German Mahadeva (Diezel VH4)', 'German Ubersonic (Bogner Uberschall)',
      'Cali Rectifire (Mesa Dual Rectifier)', 'Cali IV Lead (Mesa Mark IV)'
    )
  }
  
  // Kemper amp models
  if (allHardware.includes('kemper')) {
    ampModels.push(
      'AC30 Top Boost', 'Plexi Lead 100W', 'JCM800 2203',
      'Twin Reverb Normal', 'Deluxe Reverb Vibrato',
      'Dual Rectifier Modern', 'Mark IIC+ Lead',
      'VH4 Channel 3', 'Uberschall Lead'
    )
  }
  
  // Check for plugin-based amp modeling
  userGear.plugins.forEach(plugin => {
    const pluginLower = plugin.toLowerCase()
    
    // Neural DSP plugins
    if (pluginLower.includes('neural dsp') || pluginLower.includes('neuraldsp')) {
      if (pluginLower.includes('nolly') || pluginLower.includes('getgood')) {
        ampModels.push('5150 Block Letter', '5150 III', 'Marshall 2203', 'Marshall Plexi')
      }
      if (pluginLower.includes('plini')) {
        ampModels.push('Friedman BE-100', 'Morgan AC20', 'Two-Rock Studio Pro')
      }
      if (pluginLower.includes('tim henson') || pluginLower.includes('archetype')) {
        ampModels.push('Fender Twin Reverb', 'Marshall JVM410H', 'Orange OR50')
      }
      if (pluginLower.includes('gojira')) {
        ampModels.push('5150 III', 'Peavey 6505', 'Marshall JCM800')
      }
      if (pluginLower.includes('petrucci')) {
        ampModels.push('Mesa Boogie JP-2C', 'Mesa Mark IIC+', 'Mesa Mark V')
      }
      if (pluginLower.includes('abasi')) {
        ampModels.push('PRS MT15', 'Mesa Mark V', 'Friedman BE-100')
      }
      if (pluginLower.includes('wong')) {
        ampModels.push('Fender Bassman', 'Marshall Plexi', 'Vox AC30')
      }
    }
    
    // UAD plugins
    if (pluginLower.includes('uad') || pluginLower.includes('universal audio')) {
      ampModels.push(
        'Marshall Plexi Classic', 'Marshall Silver Jubilee',
        'Fender \'55 Tweed Deluxe', 'Fender Bassman',
        'Ampeg SVT-VR', 'Gallien-Krueger 800RB'
      )
    }
    
    // IK Multimedia AmpliTube
    if (pluginLower.includes('amplitube')) {
      ampModels.push(
        'British Tube Lead 100 (JCM800)', 'British Tube Clean (JTM45)',
        'American Tube Clean 1 (Twin Reverb)', 'American Tube Clean 2 (Deluxe Reverb)',
        'Modern Hi-Gain (5150)', 'Metal Lead (Dual Rectifier)'
      )
    }
    
    // Positive Grid BIAS
    if (pluginLower.includes('bias') && pluginLower.includes('amp')) {
      ampModels.push(
        'Twin Reverb', 'Deluxe Reverb', 'Princeton Reverb',
        'JCM800', 'Plexi', 'JTM45',
        'AC30', 'AC15',
        'Dual Rectifier', 'Mark IV', '5150'
      )
    }
    
    // Logic Pro stock amps
    if (pluginLower.includes('logic') || userGear.daw.toLowerCase().includes('logic')) {
      ampModels.push(
        'British Clean (Vox AC30)', 'British Gain (Marshall JCM800)',
        'American Clean (Fender Twin)', 'American Gain (Fender Bassman)',
        'Vintage Drive (Marshall Plexi)', 'Modern Stack (Mesa Dual Rectifier)'
      )
    }
    
    // Ableton Live stock amps
    if (pluginLower.includes('ableton') || userGear.daw.toLowerCase().includes('ableton')) {
      ampModels.push(
        'Classic Clean (Fender Twin)', 'Lead (Marshall JCM800)',
        'Bass (Ampeg SVT)', 'Modern (Mesa Dual Rectifier)'
      )
    }
  })
  
  // Remove duplicates and return
  return [...new Set(ampModels)]
}

function getAmpModelPromptAddendum(validAmps: string[]): string {
  if (validAmps.length === 0) {
    return `\n\nAMP RECOMMENDATION GUIDANCE: No specific amp models were detected in the user's setup. Use conservative, generic descriptions like "clean amp platform", "Fender-style amp", "Marshall-style crunch", or "high-gain amp sim" rather than naming specific models. If more precision is needed, ask the user to specify their available amp models.`
  }
  
  return `\n\nAVAILABLE AMP MODELS: When recommending amp models, prioritize these specific models available in their setup: ${validAmps.join(', ')}. Use these exact model names when possible. If recommending alternatives, use generic but accurate descriptions like "clean amp platform" or "British-style mid-gain amp".`
}

function reframeUserPrompt(originalPrompt: string, userSettings: UserSettings | undefined): string {
  if (!ENABLE_PROMPT_REFRAMING || !userSettings) {
    return originalPrompt
  }

  const { gear, genreInfluence } = userSettings
  const lowerPrompt = originalPrompt.toLowerCase()
  
  // Patterns that indicate tone/artist/gear questions
  const tonePatterns = [
    /sound like/i,
    /tone of/i,
    /how to get.*tone/i,
    /recreate.*sound/i,
    /achieve.*tone/i,
    /\b(amp|pedal|guitar|pickup).*sound/i,
    /sound.*\b(amp|pedal|guitar|pickup)/i
  ]
  
  // Common artist name patterns (expand this list as needed)
  const artistPatterns = [
    // Guitar players
    /\b(john mayer|david gilmour|eric clapton|jimi hendrix|eddie van halen|steve vai|joe satriani|yngwie malmsteen)\b/i,
    /\b(ariel posen|julian lage|mateus asato|ichika nito|plini|intervals|periphery|animals as leaders)\b/i,
    /\b(adam jones|jerry cantrell|dimebag darrell|zakk wylde|slash|angus young|tony iommi)\b/i,
    /\b(mark holcomb|misha mansoor|tosin abasi|tim henson|scott lepage|yvette young)\b/i,
    // Bands known for specific tones
    /\b(pink floyd|led zeppelin|metallica|tool|alice in chains|pantera|black sabbath)\b/i,
    /\b(polyphia|periphery|tesseract|architects|spiritbox|bad omens)\b/i
  ]
  
  // Check if this is a tone/artist/gear question
  const isToneQuestion = tonePatterns.some(pattern => pattern.test(lowerPrompt)) ||
                        artistPatterns.some(pattern => pattern.test(lowerPrompt))
  
  if (!isToneQuestion) {
    return originalPrompt
  }
  
  // Build gear context string
  const gearContext = []
  if (gear?.daw && gear.daw !== 'none') gearContext.push(gear.daw)
  if (gear?.plugins?.length) gearContext.push(`plugins: ${gear.plugins.join(', ')}`)
  if (gear?.guitar?.length) gearContext.push(`guitars: ${gear.guitar.join(', ')}`)
  if (gear?.pedals?.length) gearContext.push(`pedals: ${gear.pedals.join(', ')}`)
  if (gear?.interface) gearContext.push(`interface: ${gear.interface}`)
  
  const genreContext = genreInfluence?.length ? ` Their style is influenced by: ${genreInfluence.join(', ')}.` : ''
  
  // Build detailed gear list for user-specific section
  const buildDetailedGearList = (): string => {
    const gearLines = []
    if (gear?.daw && gear.daw !== 'none') gearLines.push(`- DAW: ${gear.daw}`)
    if (gear?.plugins?.length) gearLines.push(`- Plugins: ${gear.plugins.join(', ')}`)
    
    // Build hardware list
    const hardwareList = []
    if (gear?.guitar?.length) hardwareList.push(`Guitars: ${gear.guitar.join(', ')}`)
    if (gear?.pedals?.length) hardwareList.push(`Pedals: ${gear.pedals.join(', ')}`)
    if (gear?.interface) hardwareList.push(`Interface: ${gear.interface}`)
    if (gear?.monitors) hardwareList.push(`Monitors: ${gear.monitors}`)
    
    if (hardwareList.length) gearLines.push(`- Hardware: ${hardwareList.join(', ')}`)
    
    // Add common modeling gear if not already listed
    const commonModelingGear = ['HX One (single-effect stereo pedal - only one algorithm at a time)', 'Nano Cortex (amp capture unit)']
    commonModelingGear.forEach(item => {
      const deviceName = item.split(' ')[0].toLowerCase()
      const hasDevice = gear?.pedals?.some(pedal => pedal.toLowerCase().includes(deviceName)) ||
                       gear?.interface?.toLowerCase().includes(deviceName)
      if (!hasDevice) {
        gearLines.push(`- ${item}`)
      }
    })
    
    return gearLines.join('\n')
  }

  // Enhanced reframe with clean section separation
  const reframedPrompt = `${originalPrompt.replace(/^(how do i|how to|can you help me|help me)/i, '').trim().replace(/^to\s+/, '')}.${genreContext}

Please answer in two clear sections:

**1. Authentic Tone Breakdown (Gear-Agnostic)**
Explain how to achieve the target tone using typical, accurate gear and signal chains.
Use real-world amps, pedals, mics, and mix techniques — do not reference the user's setup.

**2. Approximate With My Gear**
Based on my gear and plugins (listed below), show how I can get close to that tone.
I'm using:
${buildDetailedGearList()}

Choose the best substitute models and explain tradeoffs if necessary.
Do not recommend unavailable gear. Be specific with plugin names, amp models, and effect types from the listed tools.`

  return reframedPrompt
}

function buildConversationMessages(messageHistory: any[], userSettings: UserSettings | undefined, context: string, lessonMode: boolean, currentMessage: string) {
  const systemMessage = buildSystemMessage(userSettings, context, lessonMode)
  
  // Get last 5 messages for context (or all if fewer than 5)
  const recentMessages = messageHistory.slice(-5)
  
  const messages = [{ role: 'system', content: systemMessage }]
  
  // Add conversation history
  recentMessages.forEach(msg => {
    messages.push({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })
  })
  
  // Add the current message
  const processedMessage = reframeUserPrompt(currentMessage, userSettings)
  messages.push({ role: 'user', content: processedMessage })
  
  return messages
}

function buildSystemMessage(userSettings: UserSettings | undefined, context: string, lessonMode: boolean): string {
  const { gear, genreInfluence } = userSettings || {}
  
  // Get valid amp models for user's gear
  const validAmpModels = gear ? getValidAmpModels(gear, context) : []
  const ampModelAddendum = getAmpModelPromptAddendum(validAmpModels)
  
  // Categorize plugins based on context
  const pluginCategories = gear?.plugins ? categorizeUserPlugins(gear.plugins, context) : { valid: [], invalid: [] }
  
  // Build gear description
  const gearList = []
  if (gear?.guitar?.length) gearList.push(`Guitars: ${gear.guitar.join(', ')}`)
  if (gear?.pedals?.length) gearList.push(`Pedals: ${gear.pedals.join(', ')}`)
  if (gear?.interface) gearList.push(`Interface: ${gear.interface}`)
  if (gear?.monitors) gearList.push(`Monitors: ${gear.monitors}`)
  const gearDescription = gearList.length ? gearList.join(', ') : 'basic setup'
  
  // Lesson mode instructions with follow-up question behavior
  const lessonModeInstructions = lessonMode 
    ? `You are in Teaching Mode. Provide detailed explanations with reasoning, break down complex concepts into steps, include theory background when relevant, suggest practice exercises, and explain the "why" behind recommendations. Be patient, thorough, and encouraging.

FOLLOW-UP QUESTION BEHAVIOR (Teaching Mode):
- ACTIVELY ask follow-up questions to deepen learning and exploration
- Ask questions that help the user understand concepts better: "What style are you going for?", "Have you tried this technique before?", "What's your current skill level with this?"
- Suggest related topics to explore: "Since you're learning about modes, would you like to explore how they're used in different genres?"
- Ask about their setup to give more personalized advice: "What amp/plugin are you using?", "Are you playing live or recording?"
- Encourage experimentation: "Try this and let me know how it sounds - we can adjust from there"
- End responses with engaging questions that invite further discussion`
    : `You are in Efficiency Mode. Provide direct, actionable solutions with concise but complete explanations. Focus on immediate practical results and workflow efficiency with specific settings and parameters.

FOLLOW-UP QUESTION BEHAVIOR (Quick Mode):
- Only ask clarifying questions when the request is genuinely ambiguous or missing critical information
- Keep questions focused and specific: "Which pickup position?", "What genre?", "Recording or live?"
- Provide the most likely solution first, then offer alternatives: "For rock, try this... For jazz, you'd want..."
- Avoid open-ended exploratory questions - prioritize getting the user their answer quickly`
  
  // Section capitalization
  const sectionName = context.charAt(0).toUpperCase() + context.slice(1)
  
  // Add tab-specific technical language requirements and behavior
  const getTechnicalLanguageModifier = (context: string): string => {
    switch (context) {
      case 'mix':
        return `\n\nMIX TAB BEHAVIOR - PLUGIN-BASED MIXING FOCUS:
You are now in Mix mode. Prioritize PLUGIN-BASED mixing suggestions for Logic Pro X workflow.

PLUGIN RECOMMENDATIONS:
- UAD plugins: 1176, LA-2A, Pultec, Neve, SSL, Fairchild, etc.
- Neural DSP: Archetype Plini, Archetype Nolly (for guitar amp simulation only)
- Logic stock plugins: Channel EQ, Compressor, ChromaVerb, Space Designer, Tape, Vintage EQ, DeEsser

TECHNICAL LANGUAGE REQUIREMENT: Use precise audio engineering terminology. Always specify:
- EQ: exact frequencies (e.g., "high-pass at 80Hz, boost 3dB at 2.5kHz with Q of 1.2")
- Compression: ratios, attack/release times, threshold values (e.g., "4:1 ratio, 10ms attack, 100ms release, -12dB threshold")
- Delay: specific times in milliseconds and mix percentages (e.g., "slapback delay at 80ms with 25% mix")
- Reverb: decay times, pre-delay, specific reverb types (e.g., "plate reverb, 1.8s decay, 15ms pre-delay")
- Plugin chains: exact order of operations and gain staging
- Signal routing: specify exact processing order and parallel/serial configurations

AVOID: Physical gear recommendations unless specifically asked. Focus on in-the-box mixing workflow.`
        
      case 'instrument':
        return `\n\nINSTRUMENT TAB BEHAVIOR - PHYSICAL GEAR FOCUS:
You are now in Instrument mode. Prioritize PHYSICAL GEAR and performance-based tone suggestions.

GEAR RECOMMENDATIONS:
- Physical guitars: HH Strat, Tele, 7-string characteristics and pickup selection
- Physical pedals: Nano Cortex, HX One, Klon-style overdrive, ambient reverb
- Amps: amp captures, physical amp settings, amp modeling devices
- Performance: pickup selection, tone knob use, pedal stacking, playing technique

WHEN TO MENTION PLUGINS:
- Amp sims: Neural DSP Archetype Plini/Nolly, Logic amp sims (for tone shaping)
- Guitar effects: only when user specifically asks to work "in-the-box"
- NEVER suggest mixing plugins: No UAD compressors, Pultec EQs, or mixing reverbs

TECHNICAL LANGUAGE REQUIREMENT: Use specific gear and performance terminology:
- Amp settings: exact knob positions (e.g., "Gain at 6, Bass at 4, Mid at 7, Treble at 5")
- Pedal settings: specific values and signal chain order (e.g., "Klon: Drive at 9 o'clock, placed before Nano Cortex")
- Guitar specifics: pickup selection, pickup heights, string gauges (e.g., "bridge humbucker, tone knob at 7")
- Playing technique: exact fret positions, fingering patterns, pick attack descriptions
- Performance nuance: pickup selection impact, physical tone shaping through playing

FOCUS: Physical performance, gear interaction, and tone shaping through hardware manipulation.`
        
      default:
        return ''
    }
  }

  const technicalModifier = getTechnicalLanguageModifier(context)

  // Build plugin context string
  const pluginContext = pluginCategories.valid.length > 0 
    ? `Available plugins for this context: ${pluginCategories.valid.join(', ')}.` 
    : 'Using stock DAW plugins.'
  
  const invalidPluginWarning = pluginCategories.invalid.length > 0 && context === 'instrument'
    ? ` IMPORTANT: Do not recommend these mixing plugins in Instrument tab: ${pluginCategories.invalid.join(', ')}.`
    : ''

  const systemMessage = `You are StudioBrain — an AI-powered creative assistant for musicians.

The user is working in a ${gear?.daw || 'unspecified DAW'} environment. ${pluginContext}${invalidPluginWarning} Their gear includes: ${gearDescription}. Their musical style is influenced by: ${genreInfluence?.length ? genreInfluence.join(', ') : 'various genres'}.

You are currently responding in the "${sectionName}" section of the app.

You are a world-class session musician, producer, and tone expert. You've studied thousands of artist rigs and mixing sessions. You give incredibly accurate gear recommendations, plugin chains, and music theory explanations — always grounded in the user's tools, style, and context.

When asked about a specific artist or sound, draw on detailed knowledge of amps, pedals, guitars, production choices, and genre conventions. If multiple gear options could achieve a tone, list them. Use specific brand and model names when known.

Use fluent modern music language: talk like someone who watches Rig Rundowns, knows plugin quirks, and has played hundreds of live and studio gigs.

Be concise but packed with knowledge. Only use vague terms like "vibe" or "feel" when no concrete option exists.

GLOBAL ACCURACY MANDATE:
If you are not certain about any part of your answer, do not guess. StudioBrain must never be confidently wrong. Instead:
- Use accurate general language (e.g., "a clean amp sim" instead of guessing specific models)
- Ask the user for clarification when needed
- Offer multiple possibilities with clear uncertainty ("This might refer to either X or Y, depending on context")
- Explain your uncertainty rather than making confident incorrect statements

CRITICAL GEAR ACCURACY REQUIREMENTS:
- Never recommend gear the user doesn't own or have access to
- Never suggest using incorrect gear types (e.g., don't use a Pultec as an amp sim, don't use a compressor as a drive pedal)
- Respect hardware limitations:
  • HX One: Single-effect stereo pedal - only runs ONE algorithm at a time (don't suggest "stacking" multiple HX One effects)
  • Nano Cortex: Amp capture unit with specific routing
  • Other multi-FX units: Check actual capabilities before recommendations
- When making substitutions, explain why the alternative works and what sonic differences to expect
- Be historically accurate about what gear artists actually used

CATEGORY-SPECIFIC ACCURACY GUIDELINES:

AMPS & GUITAR TONE:
- Only recommend actual amp models you're certain about
- If unsure, use descriptive language: "clean amp platform", "Fender-style tone", "British-style crunch"
- Never recommend EQs, compressors, or reverbs as amp simulators
- Never suggest plugins/devices for roles they're not designed for

PEDALS & EFFECTS:
- If unsure about specific pedal models, describe the effect type: "transparent overdrive", "analog-style delay", "modulated reverb"
- Don't guess brand names or model numbers unless certain
- Prioritize describing the sonic characteristic over naming specific gear
- HX One specific guidance: Treat as a flexible single-slot pedal. Recommend which SINGLE effect model to load based on tone goal, not multiple stacked effects

MUSIC THEORY:
- If scale, chord function, or mode isn't clearly implied, ask for context
- Use phrases like "this could be interpreted as..." or "depending on context, this might be..."
- Offer multiple valid interpretations when ambiguous
- Don't force theory onto ambiguous musical examples

PLUGIN CHAINS & MIXING:
- Prioritize the user's available plugins
- If none specified, use generic terms: "any EQ plugin", "any compressor with sidechain capability"
- Never claim a plugin does something it doesn't
- Avoid made-up terminology or unverified processing chains
- When suggesting alternatives, explain why they work similarly

PRODUCTION TECHNIQUES:
- Stick to established, verified techniques
- If multiple approaches exist, mention alternatives
- Don't present experimental ideas as established practice
- Clarify when something is subjective vs. technical fact${technicalModifier}${ampModelAddendum}

${lessonModeInstructions}`

  return systemMessage
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
    const { fullPrompt, originalMessage, context, lessonMode, userSettings, messageHistory } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: '',
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.',
      })
    }

    // Rate limiting check - prevent abuse of OpenAI API
    const userKey = getRateLimitKey(request)
    const rateLimitResult = checkRateLimit(userKey, lessonMode)
    
    if (!rateLimitResult.allowed) {
      console.log(`🚫 Rate limit exceeded for user: ${userKey}`)
      return NextResponse.json({
        response: '',
        error: "You've reached your StudioBrain usage limit for today. Try again tomorrow!",
      })
    }
    
    console.log(`✅ Rate limit check passed for user: ${userKey}, remaining: ${rateLimitResult.remaining}`)

    console.log('🚀 API: Received pre-built prompt from client')
    console.log('ORIGINAL MESSAGE:', originalMessage)
    console.log('FULL PROMPT RECEIVED:', fullPrompt)
    console.log('USER SETTINGS:', userSettings)
    console.log("OPENAI PROMPT SENT:", fullPrompt)

    // Build conversation messages with history context
    const conversationMessages = buildConversationMessages(
      messageHistory || [], 
      userSettings, 
      context, 
      lessonMode, 
      originalMessage
    )
    
    console.log('🎸 Original message:', originalMessage)
    console.log('💬 Conversation messages:', conversationMessages.length, 'messages')
    console.log('📜 Message history length:', messageHistory?.length || 0)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationMessages,
      max_tokens: lessonMode ? 750 : 500,
      temperature: lessonMode ? 0.4 : 0.3,
      top_p: 1.0,
      frequency_penalty: 0.2,
      presence_penalty: 0.0,
    })

    const response = completion.choices[0]?.message?.content || ''
    
    // If we have a strong modal analysis, include it in the response
    let enhancedResponse = response
    const modalAnalysis = analyzeChordProgression(originalMessage) // Advanced chord analysis
    if (modalAnalysis && modalAnalysis.confidence > 0.7 && context === 'theory') {
      enhancedResponse += `\n\n**Modal Analysis:**\n• **Best scale:** ${modalAnalysis.bestRoot} ${modalAnalysis.bestMode}\n• **Reason:** ${modalAnalysis.reason}`
      
      if (modalAnalysis.borrowedChords.length > 0) {
        enhancedResponse += `\n• **Borrowed chords:** ${modalAnalysis.borrowedChords.join(', ')}`
      }
      
      enhancedResponse += `\n• **All notes used:** ${modalAnalysis.allNotesUsed.join(', ')}`
    }

    // Internal critic review - always-on pipeline
    let finalResponse = enhancedResponse
    const skipCritic = await shouldSkipCritic(originalMessage, enhancedResponse)
    
    if (!skipCritic) {
      console.log('🔍 Running internal critic review...')
      const criticResult = await reviewResponse({
        originalPrompt: originalMessage,
        assistantResponse: enhancedResponse,
        userSettings,
        context,
        lessonMode
      })
      
      finalResponse = criticResult.finalResponse
      
      if (criticResult.wasCriticAdjusted) {
        console.log('✏️ Response was adjusted by critic for accuracy/safety')
      } else {
        console.log('✅ Response passed critic review unchanged')
      }
    } else {
      console.log('⏭️ Skipping critic review (response type doesn\'t require it)')
    }
    
    // Parse plugin suggestions from the final response (after critic review)
    const pluginSuggestions = context === 'mix' ? parsePluginSuggestions(finalResponse) : []
    const scaleRequest = parseScaleRequest(originalMessage) // Parse from original user message

    return NextResponse.json({
      response: finalResponse,
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