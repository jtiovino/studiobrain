import { buildPrompt } from './promptBuilder'
import { useUserStore } from './useUserStore'

export type TabContext = 'general' | 'mix' | 'theory' | 'instrument'

export interface UserSettings {
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

export interface ChatRequest {
  fullPrompt: string
  originalMessage: string
  context: TabContext
  lessonMode: boolean
  instrumentType?: string
  userSettings?: UserSettings
  messageHistory?: Array<{
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
}

export interface PluginSuggestion {
  name: string
  type: string
  description: string
  explanation?: string
}

export interface ScaleRequest {
  root: string
  mode: string
}

export interface ModalAnalysis {
  bestMode: string
  bestRoot: string
  confidence: number
  reason: string
  borrowedChords: string[]
  allNotesUsed: string[]
}

export interface ChatResponse {
  response: string
  pluginSuggestions?: PluginSuggestion[]
  scaleRequest?: ScaleRequest | null
  modalAnalysis?: ModalAnalysis | null
  wasCriticAdjusted?: boolean
  error?: string
}

// Helper function to extract user settings for API requests
export function getUserSettingsForAPI(): UserSettings {
  const store = useUserStore.getState()
  return {
    userLevel: store.userLevel,
    roles: store.roles,
    mainInstrument: store.mainInstrument,
    preferredTuning: store.preferredTuning,
    genreInfluence: store.genreInfluence,
    flipFretboardView: store.flipFretboardView,
    gear: store.gear,
    hasHydrated: store.hasHydrated
  }
}

export class OpenAIService {
  private static async makeRequest(data: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('API request failed:', error)
      return {
        response: '',
        error: 'Failed to connect to StudioBrain. Please try again.',
      }
    }
  }

  static async askGeneral(message: string, lessonMode: boolean, messageHistory?: Array<any>): Promise<ChatResponse> {
    const fullPrompt = buildPrompt({
      tab: 'General',
      input: message,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for General:', fullPrompt)
    
    const userSettings = getUserSettingsForAPI()
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: message,
      context: 'general',
      lessonMode,
      userSettings,
      messageHistory,
    })
  }

  static async askMix(message: string, lessonMode: boolean, gearChain?: any[], messageHistory?: Array<any>): Promise<ChatResponse> {
    const contextualMessage = gearChain && gearChain.length > 0 
      ? `${message}\n\nCurrent gear chain: ${gearChain.map(item => item.name).join(' → ')}`
      : message

    const fullPrompt = buildPrompt({
      tab: 'Mix',
      input: contextualMessage,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Mix:', fullPrompt)
    
    const userSettings = getUserSettingsForAPI()
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: contextualMessage,
      context: 'mix',
      lessonMode,
      userSettings,
      messageHistory,
    })
  }

  static async askTheory(message: string, lessonMode: boolean, messageHistory?: Array<any>): Promise<ChatResponse> {
    const fullPrompt = buildPrompt({
      tab: 'Theory',
      input: message,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Theory:', fullPrompt)
    
    const userSettings = getUserSettingsForAPI()
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: message,
      context: 'theory',
      lessonMode,
      userSettings,
      messageHistory,
    })
  }

  static async askInstrument(
    message: string,
    lessonMode: boolean,
    instrumentType: string,
    gearChain?: any[],
    messageHistory?: Array<any>
  ): Promise<ChatResponse> {
    let contextualMessage = `For ${instrumentType}: ${message}`
    
    if (gearChain && gearChain.length > 0) {
      contextualMessage += `\n\nCurrent gear chain: ${gearChain.map(item => item.name).join(' → ')}`
    }
    
    const fullPrompt = buildPrompt({
      tab: 'Instrument',
      input: contextualMessage,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Instrument:', fullPrompt)
    
    const userSettings = getUserSettingsForAPI()
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: contextualMessage,
      context: 'instrument',
      lessonMode,
      instrumentType,
      userSettings,
      messageHistory,
    })
  }
}