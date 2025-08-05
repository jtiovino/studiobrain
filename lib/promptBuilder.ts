import { useUserStore } from './useUserStore'

type Tab = 'General' | 'Mix' | 'Theory' | 'Instrument' | 'Practice'
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
DAW: ${gear.daw || 'Not specified'}`

  // Build behavior instructions based on lesson mode
  const behaviorInstructions = lessonMode
    ? `## Lesson Mode - Educational Assistant:
- Provide **specific plugin or pedal recommendations** when possible
- Include **knob settings** for amp and pedals (e.g. Gain at 10 o'clock, Treble around 6)
- Reference user's gear first, fallback to DAW stock plugins if needed
- Use **teaching tone**: explain why a setting works, not just what to set
- Suggest pickup position, playing technique, or signal chain if relevant
- Never guess gear names — if uncertain about model names, leave them out rather than guessing
- End with something like: "These settings are a great starting point, but tweak to taste. Let me know your exact gear if you'd like help dialing it in."`
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
    
    // Add monitoring context only for Mix tab
    if (tab === 'Mix' && gear.monitors) {
      gearContext += `\n- Monitors: ${gear.monitors}. Be mindful of their frequency response and low-end perception.`
    }
    
    // Add interface context only for Mix tab
    if (tab === 'Mix' && gear.interface) {
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
    General: buildGearInstructions(`## General Tab Standards:

**Step 1 – Identify Request Type**
• Determine if the user's question fits best under:
   - Instrument (gear, tone settings, hardware, artist setups)
   - Mix (plugins, DAWs, mixing/mastering techniques, workflows, shortcuts)
   - Theory (scales, modes, chords, progressions, harmony, music theory concepts)
   - Or if it's truly general (workflow, creative advice, songwriting, project planning).

**Step 2 – Handle Broad/General Questions**
• If it's truly general, answer fully here.
• Use StudioBrain Universal Sourcing & Accuracy Standards when providing factual information.
• Keep answers concise unless the user asks for detail or Lesson Mode is on.

**Step 3 – Handle Tab-Specific Questions**
• If the question clearly fits a specific tab:
   1. Give a short, useful answer immediately in the General tab.
   2. Then say: "For a more detailed breakdown, we can switch to the [X] tab. Want to do that now?"
• If it's unclear which tab fits best, ask a clarifying question before suggesting.

**Step 4 – Lesson Mode Handling**
• Lesson Mode OFF → Keep answers concise and actionable.
• Lesson Mode ON → Provide in-depth, step-by-step breakdowns with reasoning, context, practical examples, and advanced applications.

**Rules:**
• Always aim to be helpful in the General tab without making the user feel like they're in the wrong place.
• Never force a tab switch — always offer it as an option.
• Format answers to be clear and easy to scan.
• Help brainstorm creative ideas and solutions
• Provide workflow optimization suggestions
• Consider the user's setup and experience level
• Give practical advice for their specific DAW and gear`),

    Mix: buildGearInstructions(`## Mix Tab Standards:

**Step 1 – Identify Request Type**
Determine if the user is asking about:
A) Mix/Plugin Chain Recreation – e.g., "How do I mix like [artist]?"
   → Follow StudioBrain Universal Sourcing & Accuracy Standards.
B) DAW Workflow/Shortcut/Navigation – e.g., "What's the shortcut to repeat a section?"
   → Use the DAW Shortcut Dictionary to give:
       - Exact shortcut (Mac & Windows if applicable)
       - Menu path or button location
       - Relevant workflow tip or alternative method

**Step 2 – Authentic Mix/Plugin Recommendation (if A)**
• Include DAWs, plugins, and outboard gear actually used in authentic mixing context.
• Do not mention the user's plugins or DAW in this step.
• Focus on the mixing chain and processing, not performance gear.

**Step 3 – Invite Adaptation (if A)**
After listing the authentic chain, ask:
"Do you want me to show how to adapt this to your setup?"

**Step 4 – Adapting to User's Tools (If YES)**
• Use only the plugins and DAW in the user's profile/settings.
• Suggest substitutions to achieve a similar result with what they own.
• Recommend functional alternatives if a tool is missing.
• Follow the user's preferred plugin order if set.
• Include:
   - Where to find each plugin or feature in their DAW
   - Relevant keyboard shortcuts
   - Menu paths or button locations for key functions
   - DAW-specific quirks or workflow optimizations
   - Platform-specific notes (Mac vs Windows)

**Step 5 – Lesson Mode Handling**
• Lesson Mode OFF → Keep answers concise and actionable.
• Lesson Mode ON → Provide in-depth, step-by-step breakdowns with reasoning, context, practical examples, and advanced applications including signal chain order, plugin settings with rationale, gain staging, routing, and DAW navigation tips.

**Rules:**
• Avoid performance gear recommendations (guitars, amps, pedals) unless specifically asked for mixing context.
• Keep responses visually clean and scannable.
• PRIORITIZE PLUGIN-BASED MIXING SOLUTIONS
- Focus on plugin chains, gain staging, EQ/compression settings, and order of operations
- Provide exact frequency ranges, compression ratios, and technical parameters
- Focus on in-the-box mixing workflow and professional sound quality
- Consider the user's monitoring setup and available plugins for accurate recommendations`),

    Theory: buildGearInstructions(`## Theory Tab Standards:

**Step 1 – Core Theory Explanation**
• Follow StudioBrain Universal Sourcing & Accuracy Standards.
• Explain the requested theory concept clearly and accurately.
• Use diagrams, note names, intervals, and notation when helpful.
• Provide examples relevant to common genres or playing contexts.

**Step 2 – Invite Adaptation**
After the explanation, ask:
"Do you want me to show how to adapt this to your setup?"

**Step 3 – Adapting to User's Instrument (If YES)**
• Use the instrument type and tuning in the user's profile/settings.
• Show the concept visually (e.g., fretboard or keyboard diagram).
• Include fingerings, voicings, or scale shapes as needed.

**Step 4 – Lesson Mode Handling**
• Lesson Mode OFF → Keep answers concise and actionable.
• Lesson Mode ON → Provide in-depth, step-by-step breakdowns with reasoning, context, practical examples, and advanced applications including theoretical foundation, real-world usage examples, variations, and practice exercises.

**Rules:**
• Keep explanations accurate and sourced from reliable references.
• Avoid stylistic or personal opinion unless clearly stated as such.
• Format responses for easy scanning with headings and bullet points.
• Analyze chord progressions, scales, and harmonic content
• Explain theory concepts relevant to their genres
• Consider their instrument and tuning preferences
• Provide scale degrees, chord functions, and relationships
• Suggest chord voicings and progressions
• Connect theory to practical application on their instrument`),

    Instrument: buildGearInstructions(`## Instrument Tab Standards:

**Step 1 – Authentic Gear Recommendation**
• Follow StudioBrain Universal Sourcing & Accuracy Standards.
• Include amps, pedals, guitars, and other essential hardware.
• Do not mention the user's gear in this step.

**Step 2 – Invite Adaptation**
After listing authentic gear, ask:
"Do you want me to show how to adapt this to your setup?"

**Step 3 – Adapting to User's Gear (If YES)**
• Use only the gear in the user's profile/settings.
• Suggest how to configure it to approximate the authentic tone.
• Recommend functional alternatives if something is missing.

**Step 4 – Tab Interpretation Mode**
If the user provides guitar tab (text or image) or asks about finger placement:
• Identify the chord shapes, scale patterns, or riffs.
• Show visual fretboard diagrams with correct finger positions.
• Explain the most efficient positions or alternate fingerings.
• Highlight repeating shapes or patterns to improve recognition.
• In Lesson Mode, explain the underlying theory (scale/mode/chord) used in the tab.

**Step 5 – Lesson Mode Handling**
• Lesson Mode OFF → Keep answers concise and actionable.
• Lesson Mode ON → Provide in-depth, step-by-step breakdowns with reasoning, context, practical examples, and advanced applications including gear setup details and theory explanations.

**Rules:**
• Do not suggest software plugins in the Instrument tab unless explicitly asked.
• Format answers so they are clear, scannable, and easy to follow.
• PRIORITIZE PHYSICAL GEAR: guitars, pickups, pedals, amps, amp captures, and performance nuance
• Focus on physical tone shaping: pickup selection, tone knob use, pedal stacking, amp captures
• NEVER suggest UAD compressors, Pultec EQs, or mixing reverbs - this is performance-focused
• Show visual representations when possible (fretboard diagrams, chord charts)
• Provide scale patterns and fingerings for ${mainInstrument}
• Consider their tuning: ${preferredTuning}
• Suggest chord voicings and positions based on physical instrument capabilities
• Include performance technique tips and exercises
• Adapt to their experience level (${userLevel})
• ${flipFretboardView ? 'Note: User prefers flipped fretboard view (high strings on top)' : 'Note: User prefers standard fretboard view (low strings on top)'}`)
,

    Practice: buildGearInstructions(`You are StudioBrain's guitar practice coach. Create practical, structured practice routines.

Guidelines:
1) Structure practice into clear time-based sections (e.g., Warm-up, Core Practice, Application)
2) CRITICAL: All scale shapes, voicings, TAB notation, and fret positions must be specifically for ${preferredTuning} tuning - do not use standard tuning
3) List equipment needed (guitar in ${preferredTuning} tuning, metronome if BPM is used, etc.)
4) Include specific fret positions, chord symbols, and BPM targets when applicable
5) ${lessonMode ? 'Provide detailed explanations of why each exercise matters and success indicators' : 'Keep explanations concise and actionable'}
6) Use clear headings and bullet points for easy reading
7) Include TAB notation in code blocks when helpful - ensure proper spacing between string transitions so sequential notes don't appear simultaneous
8) Tailor difficulty to user level: ${userLevel}

Format your response with clear markdown structure using headers, bullet points, and code blocks for TAB notation.

User Level: ${userLevel}
Genre Influences: ${genreInfluence.length > 0 ? genreInfluence.join(', ') : 'Not specified'}
Available Gear: ${gear.guitar.length > 0 ? gear.guitar.join(', ') : 'Not specified'}`)
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

## Copyright Compliance:
When referencing copyrighted songs, always suggest legal sources where users can find them. For example: "This song requires licensing. You can find it on Spotify, Apple Music, YouTube Music, or your preferred streaming platform." Never provide unlicensed content or encourage copyright infringement.

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