import { buildPrompt } from './promptBuilder'

export type TabContext = 'general' | 'mix' | 'theory' | 'instrument'

export interface ChatRequest {
  fullPrompt: string
  originalMessage: string
  context: TabContext
  lessonMode: boolean
  instrumentType?: string
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
  error?: string
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

  static async askGeneral(message: string, lessonMode: boolean): Promise<ChatResponse> {
    const fullPrompt = buildPrompt({
      tab: 'General',
      input: message,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for General:', fullPrompt)
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: message,
      context: 'general',
      lessonMode,
    })
  }

  static async askMix(message: string, lessonMode: boolean): Promise<ChatResponse> {
    const fullPrompt = buildPrompt({
      tab: 'Mix',
      input: message,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Mix:', fullPrompt)
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: message,
      context: 'mix',
      lessonMode,
    })
  }

  static async askTheory(message: string, lessonMode: boolean): Promise<ChatResponse> {
    const fullPrompt = buildPrompt({
      tab: 'Theory',
      input: message,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Theory:', fullPrompt)
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: message,
      context: 'theory',
      lessonMode,
    })
  }

  static async askInstrument(
    message: string,
    lessonMode: boolean,
    instrumentType: string
  ): Promise<ChatResponse> {
    const contextualMessage = `For ${instrumentType}: ${message}`
    const fullPrompt = buildPrompt({
      tab: 'Instrument',
      input: contextualMessage,
      inputType: 'text'
    })
    
    console.log('🎯 Client-side buildPrompt for Instrument:', fullPrompt)
    
    return this.makeRequest({
      fullPrompt,
      originalMessage: contextualMessage,
      context: 'instrument',
      lessonMode,
      instrumentType,
    })
  }
}