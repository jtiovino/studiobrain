export interface GearItem {
  id: string
  name: string
  type: 'amp' | 'distortion' | 'overdrive' | 'fuzz' | 'delay' | 'reverb' | 'chorus' | 'phaser' | 'compressor' | 'eq' | 'other'
  category: 'amplifier' | 'effect' | 'hardware'
  order?: number
}

export interface GearChain {
  id: string
  name: string
  items: GearItem[]
  createdAt: Date
  isStudioBrainGenerated: boolean
}

export interface GearSuggestion {
  name: string
  type: string
  description: string
  explanation?: string
  category?: 'amplifier' | 'effect' | 'hardware'
  order?: number
}

export class GearService {
  
  // Extract gear suggestions from StudioBrain responses
  static extractGearFromResponse(response: string): GearSuggestion[] {
    const suggestions: GearSuggestion[] = []
    
    // Common amp types to look for
    const ampTypes = [
      'tube amp', 'valve amp', 'marshall', 'fender', 'vox', 'orange', 'mesa boogie', 
      'solid state', 'modeling amp', 'combo amp', 'head', 'stack', 'ac30', 'twin reverb',
      'jcm800', 'plexi', 'blues junior', 'hot rod', 'princeton', 'deluxe'
    ]
    const effectTypes = {
      'fuzz': ['fuzz', 'big muff', 'tone bender', 'fuzz face', 'silicon fuzz', 'germanium fuzz'],
      'distortion': ['distortion', 'ds-1', 'rat', 'metal zone', 'boss ds', 'proco rat', 'turbo rat'],
      'overdrive': ['overdrive', 'tube screamer', 'blues breaker', 'od-1', 'ts9', 'ts808', 'morning glory'],
      'delay': ['delay', 'echo', 'digital delay', 'analog delay', 'tape delay', 'carbon copy', 'memory man'],
      'reverb': ['reverb', 'spring reverb', 'hall reverb', 'plate reverb', 'shimmer', 'flint', 'holy grail'],
      'chorus': ['chorus', 'ce-1', 'small clone', 'julia', 'warped vinyl', 'ce-2'],
      'phaser': ['phaser', 'phase 90', 'small stone', 'phase 95', 'grand orbiter'],
      'compressor': ['compressor', 'sustainer', 'limiter', 'dyna comp', 'wampler ego', 'keeley compressor'],
      'eq': ['eq', 'equalizer', 'graphic eq', 'parametric eq', 'ge-7', 'empress para eq']
    }
    
    const lowerResponse = response.toLowerCase()
    
    // Look for amp suggestions
    ampTypes.forEach(amp => {
      if (lowerResponse.includes(amp)) {
        suggestions.push({
          name: this.capitalizeWords(amp),
          type: 'amp',
          category: 'amplifier',
          description: `${this.capitalizeWords(amp)} amplifier`,
          order: 999 // Amps typically go last in signal chain
        })
      }
    })
    
    // Look for effect suggestions
    Object.entries(effectTypes).forEach(([effectType, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerResponse.includes(keyword)) {
          const order = this.getEffectOrder(effectType)
          suggestions.push({
            name: this.capitalizeWords(keyword),
            type: effectType,
            category: 'effect',
            description: `${this.capitalizeWords(keyword)} effect pedal`,
            order
          })
        }
      })
    })
    
    // Remove duplicates and sort by signal chain order
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.name === suggestion.name)
    ).sort((a, b) => (a.order || 0) - (b.order || 0))
    
    return uniqueSuggestions
  }
  
  // Define typical signal chain order for effects
  private static getEffectOrder(effectType: string): number {
    const orderMap: { [key: string]: number } = {
      'compressor': 1,
      'overdrive': 2,
      'distortion': 3,
      'fuzz': 4,
      'eq': 5,
      'phaser': 6,
      'chorus': 7,
      'delay': 8,
      'reverb': 9
    }
    return orderMap[effectType] || 5
  }
  
  private static capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
  
  // Convert gear suggestions to gear items
  static suggestionsToGearItems(suggestions: GearSuggestion[]): GearItem[] {
    return suggestions.map((suggestion, index) => ({
      id: `suggestion-${index}-${Date.now()}`,
      name: suggestion.name,
      type: this.mapSuggestionTypeToGearType(suggestion.type),
      category: suggestion.category || 'effect',
      order: suggestion.order || index
    }))
  }
  
  private static mapSuggestionTypeToGearType(type: string): GearItem['type'] {
    const typeMap: { [key: string]: GearItem['type'] } = {
      'amp': 'amp',
      'distortion': 'distortion',
      'overdrive': 'overdrive',
      'fuzz': 'fuzz',
      'delay': 'delay',
      'reverb': 'reverb',
      'chorus': 'chorus',
      'phaser': 'phaser',
      'compressor': 'compressor',
      'eq': 'eq'
    }
    return typeMap[type] || 'other'
  }
  
  // Create a gear chain from user's saved equipment
  static createCustomChainFromUserGear(guitars: string[], pedals: string[]): GearItem[] {
    const chain: GearItem[] = []
    
    // Add guitar (if any) - typically first in chain
    if (guitars.length > 0) {
      chain.push({
        id: `guitar-${Date.now()}`,
        name: guitars[0], // Use first guitar
        type: 'other',
        category: 'hardware',
        order: 0
      })
    }
    
    // Add pedals as effects
    pedals.forEach((pedal, index) => {
      chain.push({
        id: `pedal-${index}-${Date.now()}`,
        name: pedal,
        type: this.inferPedalType(pedal),
        category: 'effect',
        order: index + 1
      })
    })
    
    return chain.sort((a, b) => (a.order || 0) - (b.order || 0))
  }
  
  private static inferPedalType(pedalName: string): GearItem['type'] {
    const name = pedalName.toLowerCase()
    
    if (name.includes('fuzz') || name.includes('big muff')) return 'fuzz'
    if (name.includes('distortion') || name.includes('ds-') || name.includes('rat')) return 'distortion'
    if (name.includes('overdrive') || name.includes('tube screamer') || name.includes('od-')) return 'overdrive'
    if (name.includes('delay') || name.includes('echo')) return 'delay'
    if (name.includes('reverb')) return 'reverb'
    if (name.includes('chorus')) return 'chorus'
    if (name.includes('phaser') || name.includes('phase')) return 'phaser'
    if (name.includes('compressor') || name.includes('comp')) return 'compressor'
    if (name.includes('eq') || name.includes('equalizer')) return 'eq'
    
    return 'other'
  }
}