export type TabContext = 'general' | 'mix' | 'theory' | 'instrument'

export interface ChatRequest {
  message: string
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
    return this.makeRequest({
      message,
      context: 'general',
      lessonMode,
    })
  }

  static async askMix(message: string, lessonMode: boolean): Promise<ChatResponse> {
    return this.makeRequest({
      message,
      context: 'mix',
      lessonMode,
    })
  }

  static async askTheory(message: string, lessonMode: boolean): Promise<ChatResponse> {
    return this.makeRequest({
      message,
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
    return this.makeRequest({
      message: contextualMessage,
      context: 'instrument',
      lessonMode,
      instrumentType,
    })
  }
}