import { useUserStore } from './useUserStore'

type Tab = 'General' | 'Mix' | 'Theory' | 'Instrument'
type InputType = 'text' | 'audio' | 'image' | 'click'

interface PromptBuilderOptions {
  tab: Tab
  input: string
  inputType: InputType
}

export function buildPrompt({ tab, input, inputType }: PromptBuilderOptions): string {
  const store = useUserStore.getState()
  const {
    roles,
    gear,
    genreInfluence,
    preferredTuning,
    lessonMode,
    userLevel,
    mainInstrument,
    flipFretboardView,
    hasHydrated
  } = store

  // Debug logging to see what's in the store
  console.log('🔍 buildPrompt() - Has hydrated:', hasHydrated)
  console.log('🔍 buildPrompt() - Current gear from store:', gear)
  console.log('🔍 buildPrompt() - Plugins specifically:', gear.plugins)
  
  // Warn if we're building prompt before hydration
  if (!hasHydrated) {
    console.warn('⚠️ buildPrompt() called before Zustand hydration complete - gear may be empty!')
  }

  // Build user context section with DAW-aware guidance
  let userContext = `## User Profile:
- Roles: ${roles.length > 0 ? roles.join(', ') : 'Not specified'}
- Experience Level: ${userLevel}
- Main Instrument: ${mainInstrument}
- Preferred Tuning: ${preferredTuning}
- Genre Influences: ${genreInfluence.length > 0 ? genreInfluence.join(', ') : 'Not specified'}`

  // Add DAW-specific context if DAW is set
  if (gear.daw && gear.daw !== 'none') {
    userContext += `\n\nYou are assisting a musician who uses ${gear.daw}. When suggesting effects or processing chains, prefer stock plugins from ${gear.daw} when appropriate.`
  }

  const studioContext = `## Studio Setup:
Guitars: ${gear.guitar?.length ? gear.guitar.join(', ') : 'None'}
Pedals: ${gear.pedals?.length ? gear.pedals.join(', ') : 'None'}
Plugins: ${gear.plugins?.length ? gear.plugins.join(', ') : 'None'}
Audio Interface: ${gear.interface || 'Not specified'}
Studio Monitors: ${gear.monitors || 'Not specified'}
DAW: ${gear.daw || 'Not specified'}`

  // Build behavior instructions based on lesson mode
  const behaviorInstructions = lessonMode
    ? `## Teaching Mode - Act as a Music Teacher:
- Provide detailed explanations and educational context
- Break down complex concepts into understandable steps
- Offer learning exercises and practice suggestions
- Include theory explanations when relevant
- Be patient, encouraging, and thorough in your responses
- Suggest next steps for learning and improvement`
    : `## Quick Mode - Be Efficient and Results-Focused:
- Provide direct, actionable answers
- Focus on practical solutions and immediate results
- Keep explanations concise but complete
- Prioritize workflow efficiency
- Give specific recommendations without extensive theory`

  // Build gear-specific instructions for each tab
  const buildGearInstructions = (baseInstructions: string): string => {
    let gearContext = baseInstructions
    
    // Add DAW-specific guidance
    if (gear.daw && gear.daw !== 'none') {
      gearContext += `\n- DAW is ${gear.daw}. Tailor all advice to this environment and its specific workflow.`
    }
    
    // Add DAW-specific stock plugin instructions for Mix tab
    if (tab === 'Mix' && gear.daw && gear.daw !== 'none') {
      const dawLower = gear.daw.toLowerCase()
      if (dawLower.includes('logic')) {
        gearContext += `\n\nUse stock Logic Pro plugins when recommending plugin chains. Include specific plugin names such as 'Channel EQ', 'Compressor (Platinum Digital)', 'Enveloper', 'Space Designer', 'ChromaVerb', 'Tape', 'Vintage EQ', 'DeEsser', 'Multipressor', etc.`
      } else if (dawLower.includes('ableton')) {
        gearContext += `\n\nUse stock Ableton Live plugins when recommending plugin chains. Include specific plugin names such as 'EQ Eight', 'Compressor', 'Auto Filter', 'Reverb', 'Echo', 'Saturator', 'Multiband Dynamics', 'Utility', etc.`
      } else if (dawLower.includes('pro tools')) {
        gearContext += `\n\nUse stock Pro Tools plugins when recommending plugin chains. Include specific plugin names such as 'EQ III', 'Dyn 3 Compressor/Limiter', 'D-Verb', 'Mod Delay III', 'BF-76', 'AIR Vintage Filter', etc.`
      } else if (dawLower.includes('cubase')) {
        gearContext += `\n\nUse stock Cubase plugins when recommending plugin chains. Include specific plugin names such as 'Channel Strip', 'Frequency EQ', 'Compressor', 'REVerence', 'ModMachine', 'DeEsser', 'Vintage Compressor', etc.`
      } else if (dawLower.includes('reaper')) {
        gearContext += `\n\nUse stock REAPER plugins when recommending plugin chains. Include specific plugin names such as 'ReaEQ', 'ReaComp', 'ReaVerb', 'ReaDelay', 'ReaGate', 'ReaFir', 'ReaXcomp', etc.`
      } else if (dawLower.includes('fl studio')) {
        gearContext += `\n\nUse stock FL Studio plugins when recommending plugin chains. Include specific plugin names such as 'Parametric EQ 2', 'Fruity Compressor', 'Fruity Reverb 2', 'Fruity Delay 3', 'Maximus', 'Soundgoodizer', etc.`
      }
    }
    
    // Add plugin constraints
    if (gear.plugins.length > 0) {
      gearContext += `\nIMPORTANT: The user only has access to the following plugins: ${gear.plugins.join(', ')}. Do NOT suggest any plugins outside of this list.`
    }
    
    // Add monitoring context
    if (gear.monitors) {
      gearContext += `\n- Monitors: ${gear.monitors}. Be mindful of their frequency response and low-end perception.`
    }
    
    // Add interface context
    if (gear.interface) {
      gearContext += `\n- Audio Interface: ${gear.interface}. Consider its capabilities and limitations.`
    }
    
    // Add pedal context for relevant tabs
    if (gear.pedals.length > 0) {
      gearContext += `\n- Available pedals: ${gear.pedals.join(', ')}. Reference these when discussing effects.`
    }
    
    // Add guitar context for relevant tabs
    if (gear.guitar.length > 0) {
      gearContext += `\n- User's guitars: ${gear.guitar.join(', ')}. Consider pickup types and guitar characteristics.`
    }
    
    return gearContext
  }

  // Build tab-specific instructions
  const tabInstructions = {
    General: buildGearInstructions(`## General Music Production Focus:
- Help brainstorm creative ideas and solutions
- Provide workflow optimization suggestions
- Offer guidance on music production techniques
- Consider the user's setup and experience level
- Give practical advice for their specific DAW and gear`),

    Mix: buildGearInstructions(`## Mixing and Audio Analysis Focus:
- Analyze audio issues and provide specific fixes
- Suggest EQ, compression, and effects settings
- Consider the user's monitoring setup and plugins
- Provide frequency ranges and technical parameters
- Focus on achieving professional sound quality
- Take into account their studio monitors and interface`),

    Theory: buildGearInstructions(`## Music Theory and Composition Focus:
- Analyze chord progressions, scales, and harmonic content
- Explain theory concepts relevant to their genres
- Consider their instrument and tuning preferences
- Provide scale degrees, chord functions, and relationships
- Suggest chord voicings and progressions
- Connect theory to practical application on their instrument`),

    Instrument: buildGearInstructions(`## Instrument-Specific Focus:
- Show visual representations when possible (fretboard diagrams, chord charts)
- Provide scale patterns and fingerings for ${mainInstrument}
- Consider their tuning: ${preferredTuning}
- Suggest chord voicings and positions
- Include technique tips and exercises
- Adapt to their experience level (${userLevel})
- ${flipFretboardView ? 'Note: User prefers flipped fretboard view (high strings on top)' : 'Note: User prefers standard fretboard view (low strings on top)'}`)
  }

  // Build input context based on type
  const inputContext = {
    text: 'User Question/Request:',
    audio: 'Audio Analysis Request:',
    image: 'Image Analysis Request:',
    click: 'Interface Interaction:'
  }

  const finalPrompt = `${userContext}

${studioContext}

${behaviorInstructions}

${tabInstructions[tab]}

## ${inputContext[inputType]}
${input}`

  console.log('Final prompt string:', finalPrompt)
  
  return finalPrompt
}

// Helper function to get a simplified prompt for lightweight requests
export function buildSimplePrompt(input: string, lessonMode: boolean): string {
  const behaviorNote = lessonMode 
    ? 'Provide a detailed, educational response as a music teacher.'
    : 'Provide a concise, practical response focused on results.'
  
  return `${behaviorNote}

User request: ${input}`
}