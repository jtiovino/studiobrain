// Voicing Explorer type definitions and interfaces

export type Instrument = 'guitar' | 'piano' | 'bass';

export interface Constraints {
  useUserTuning?: boolean; // default true for guitar/bass
  fretMin?: number;
  fretMax?: number;
  tuning?: string[]; // overrides user tuning
  register?: 'low' | 'mid' | 'high'; // piano
  maxFretSpan?: number; // default 4 frets
  stringRange?: { from: number; to: number }; // e.g., { from: 1, to: 3 } for top 3 strings
  chordType?: 'triad' | 'seventh' | 'extended' | 'any';
  requireOpenStrings?: string[]; // e.g., ['G'] to force inclusion of open G string
  keyCenter?: string; // e.g., 'C' for filtering to chords in key of C
  openPreference?: 'prefer' | 'avoid'; // optional preference for open strings
}

export interface ChordInput {
  // Structured input
  root?: string;
  quality?: string;
  extension?: string;
  bass?: string;
  // OR literal input
  literal?: string; // e.g., "Cmaj9#11/G"
}

export interface VoicingRequest {
  instrument: Instrument;
  chordInput: ChordInput;
  constraints?: Constraints;
  count?: number; // 3-4, defaults to 4
  lessonMode?: boolean;
}

export interface VoicingShape {
  id: string;
  name: string;
  root: string;
  quality: string;
  extension?: string;
  bass?: string;
  instrument: Instrument;
  // Guitar/Bass specific
  frets?: (number | null)[]; // null = don't play string, number = fret position
  fingers?: (number | null)[]; // finger positions (1-4, null = open/muted)
  barres?: { fret: number; fromString: number; toString: number }[];
  tuning?: string[]; // tuning used for this voicing
  // Piano specific
  notes?: { note: string; octave: number }[]; // piano notes with octaves
  hand?: 'left' | 'right' | 'both';
  // Common
  position?: string; // e.g., "5th fret", "Mid register"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  playabilityScore: number; // 0-1, higher is more playable
  musicalScore: number; // 0-1, higher is more musical
  totalScore: number; // combined score for ranking
}

export interface VoicingResponse {
  voicings: VoicingShape[];
  request: VoicingRequest;
  metadata: {
    candidatesGenerated: number;
    candidatesFiltered: number;
    processingTimeMs: number;
    warnings?: string[];
    suggestions?: string[];
  };
  lessonTips?: { [voicingId: string]: string }; // only in lesson mode
}

// Chord parsing utilities
export interface ParsedChord {
  root: string;
  quality: string;
  extension?: string;
  bass?: string;
  pitchClasses: number[]; // semitones from root
  chordTones: string[]; // note names
}

// Tuning definitions
export const STANDARD_TUNINGS: Record<Instrument, string[]> = {
  guitar: ['E', 'A', 'D', 'G', 'B', 'E'], // low to high
  bass: ['E', 'A', 'D', 'G'], // low to high
  piano: [], // not applicable
};

export const COMMON_TUNINGS = {
  guitar: {
    standard: ['E', 'A', 'D', 'G', 'B', 'E'],
    dropD: ['D', 'A', 'D', 'G', 'B', 'E'],
    halfStepDown: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'],
    openG: ['D', 'G', 'D', 'G', 'B', 'D'],
  },
  bass: {
    standard: ['E', 'A', 'D', 'G'],
    dropD: ['D', 'A', 'D', 'G'],
    fiveString: ['B', 'E', 'A', 'D', 'G'],
  },
};

// Default constraints
export const DEFAULT_CONSTRAINTS: Constraints = {
  useUserTuning: true,
  fretMin: 1,
  fretMax: 12,
  register: 'mid',
  maxFretSpan: 4,
  chordType: 'any',
  requireOpenStrings: [],
};

// Piano register ranges (MIDI note numbers)
export const PIANO_REGISTERS = {
  low: { min: 36, max: 60 }, // C2 to C4
  mid: { min: 48, max: 72 }, // C3 to C5
  high: { min: 60, max: 84 }, // C4 to C6
};

// Error types
export class VoicingGenerationError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_CHORD'
      | 'NO_VOICINGS_FOUND'
      | 'CONSTRAINT_CONFLICT'
      | 'INVALID_TUNING',
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'VoicingGenerationError';
  }
}
