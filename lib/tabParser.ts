// Guitar tab parser for detecting and parsing tablature notation
import { ChordShape } from './voicings';

export interface ParsedNote {
  string: number; // 0-5 (low E to high E)
  fret: number;
  timing?: number; // Optional timing position within the measure
  technique?: TabTechnique;
}

export interface ParsedTab {
  notes: ParsedNote[];
  isChord: boolean; // true if notes are played simultaneously
  measures: ParsedNote[][]; // organized by timing/measures
  originalText: string;
}

export type TabTechnique =
  | 'hammer-on'
  | 'pull-off'
  | 'bend'
  | 'release'
  | 'vibrato'
  | 'slide-up'
  | 'slide-down'
  | 'palm-mute'
  | 'harmonic';

// Standard guitar string names (low to high)
export const GUITAR_STRINGS = ['E', 'A', 'D', 'G', 'B', 'E'];

// Guitar string tuning in semitones from C (standard tuning)
export const STANDARD_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E

/**
 * Detects if text contains guitar tablature notation
 */
export function detectGuitarTab(text: string): boolean {
  // Common tab patterns
  const tabPatterns = [
    // Standard format: e|--3--2--0--|
    /[eEbBgGdDaA]\s*\|\s*[-\d\s]+\s*\|/,
    // Alternative format: E|--3--2--0--
    /[eEbBgGdDaA]\s*\|\s*[-\d\s]+/,
    // Multiple string patterns (at least 2 lines)
    /(?:[eEbBgGdDaA]\s*[|\-:]\s*[-\d\s]+\s*(?:\||$)\s*){2,}/,
    // Fret numbers with dashes
    /[-\d]{3,}.*[-\d]{3,}/,
    // Tab with techniques
    /\d+[hpb~r\/\\]\d+/,
  ];

  return tabPatterns.some(pattern => pattern.test(text));
}

/**
 * Parses guitar tablature text into structured note data
 */
export function parseGuitarTab(text: string): ParsedTab | null {
  if (!detectGuitarTab(text)) {
    return null;
  }

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const parsedNotes: ParsedNote[] = [];
  const measures: ParsedNote[][] = [];

  // Find tab lines (lines that start with string indicators)
  const tabLines: { string: number; content: string }[] = [];

  for (const line of lines) {
    const stringMatch = line.match(/^([eEbBgGdDaA])\s*[|\-:]\s*(.+)/);
    if (stringMatch) {
      const stringName = stringMatch[1].toUpperCase();
      const content = stringMatch[2];

      // Map string names to indices (0 = low E, 5 = high e)
      const stringIndex = getStringIndex(stringName, tabLines.length);
      if (stringIndex !== -1) {
        tabLines.push({ string: stringIndex, content });
      }
    }
  }

  // Parse fret positions from each string line
  let currentTiming = 0;
  const maxLength = Math.max(...tabLines.map(line => line.content.length));

  for (let pos = 0; pos < maxLength; pos++) {
    const notesAtPosition: ParsedNote[] = [];

    for (const { string, content } of tabLines) {
      if (pos >= content.length) continue;

      const char = content[pos];

      // Parse fret number
      if (/\d/.test(char)) {
        let fretStr = char;
        let nextPos = pos + 1;

        // Handle multi-digit frets
        while (nextPos < content.length && /\d/.test(content[nextPos])) {
          fretStr += content[nextPos];
          nextPos++;
        }

        const fret = parseInt(fretStr);

        // Check for techniques
        const technique = parseTechnique(content, nextPos);

        const note: ParsedNote = {
          string,
          fret,
          timing: currentTiming,
          ...(technique && { technique }),
        };

        notesAtPosition.push(note);
        parsedNotes.push(note);
      }
    }

    // Advance timing for significant positions
    if (
      notesAtPosition.length > 0 ||
      /[-|]/.test(tabLines[0]?.content[pos] || '')
    ) {
      if (pos > 0 && tabLines.some(line => /[-|]/.test(line.content[pos]))) {
        currentTiming++;
      }
    }
  }

  // Group notes by timing for measures
  const notesByTiming = parsedNotes.reduce(
    (acc, note) => {
      const timing = note.timing || 0;
      if (!acc[timing]) acc[timing] = [];
      acc[timing].push(note);
      return acc;
    },
    {} as Record<number, ParsedNote[]>
  );

  Object.values(notesByTiming).forEach(notes => measures.push(notes));

  // Determine if this represents a chord (multiple notes at same timing)
  const isChord = measures.some(measure => measure.length > 1);

  return {
    notes: parsedNotes,
    isChord,
    measures,
    originalText: text,
  };
}

/**
 * Gets the string index based on the string name and current position
 */
function getStringIndex(stringName: string, currentLineIndex: number): number {
  const stringMap: Record<string, number[]> = {
    E: [0, 5], // Low E and high E
    A: [1],
    D: [2],
    G: [3],
    B: [4],
  };

  const possibleIndices = stringMap[stringName];
  if (!possibleIndices) return -1;

  // For E strings, use context to determine which one
  if (stringName === 'E') {
    // If this is one of the first lines, it's likely high E
    // If it's one of the last lines, it's likely low E
    return currentLineIndex < 3 ? 5 : 0;
  }

  return possibleIndices[0];
}

/**
 * Parses tab techniques from the notation
 */
function parseTechnique(
  content: string,
  position: number
): TabTechnique | undefined {
  if (position >= content.length) return undefined;

  const char = content[position];
  const techniques: Record<string, TabTechnique> = {
    h: 'hammer-on',
    p: 'pull-off',
    b: 'bend',
    r: 'release',
    '~': 'vibrato',
    '/': 'slide-up',
    '\\': 'slide-down',
  };

  return techniques[char];
}

/**
 * Attempts to identify chord shapes from parsed tab data
 */
export function identifyChordFromTab(parsedTab: ParsedTab): string | null {
  if (!parsedTab.isChord || parsedTab.measures.length === 0) {
    return null;
  }

  // Get the first chord shape from the tab
  const chordNotes = parsedTab.measures[0];
  if (chordNotes.length < 2) return null;

  // Convert to fret array format (matching ChordShape interface)
  const frets: (number | null)[] = [null, null, null, null, null, null];

  chordNotes.forEach(note => {
    if (note.string >= 0 && note.string <= 5) {
      frets[note.string] = note.fret;
    }
  });

  // Simple chord recognition based on common patterns
  const chordPatterns: Record<string, (number | null)[]> = {
    'E Major': [0, 2, 2, 1, 0, 0],
    'A Major': [null, 0, 2, 2, 2, 0],
    'D Major': [null, null, 0, 2, 3, 2],
    'G Major': [3, 2, 0, 0, 3, 3],
    'C Major': [null, 3, 2, 0, 1, 0],
    'E Minor': [0, 2, 2, 0, 0, 0],
    'A Minor': [null, 0, 2, 2, 1, 0],
    'D Minor': [null, null, 0, 2, 3, 1],
  };

  // Find matching chord pattern
  for (const [chordName, pattern] of Object.entries(chordPatterns)) {
    if (arraysMatch(frets, pattern)) {
      return chordName;
    }
  }

  // Try to identify by intervals if no exact match
  return identifyChordByIntervals(chordNotes);
}

/**
 * Helper function to compare fret arrays
 */
function arraysMatch(
  arr1: (number | null)[],
  arr2: (number | null)[]
): boolean {
  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }

  return true;
}

/**
 * Attempts to identify chord by analyzing intervals between notes
 */
function identifyChordByIntervals(notes: ParsedNote[]): string | null {
  if (notes.length < 3) return null;

  // Convert fret positions to actual note values
  const pitches = notes
    .map(note => {
      const stringPitch = STANDARD_TUNING[note.string];
      return (stringPitch + note.fret) % 12;
    })
    .sort((a, b) => a - b);

  // Remove duplicates
  const uniquePitches = [...new Set(pitches)];

  if (uniquePitches.length < 3) return null;

  // Calculate intervals from root
  const root = uniquePitches[0];
  const intervals = uniquePitches.map(pitch => (pitch - root + 12) % 12);

  // Common chord interval patterns
  const chordTypes: Record<string, number[]> = {
    Major: [0, 4, 7],
    Minor: [0, 3, 7],
    'Dominant 7': [0, 4, 7, 10],
    'Major 7': [0, 4, 7, 11],
    'Minor 7': [0, 3, 7, 10],
    Diminished: [0, 3, 6],
    Augmented: [0, 4, 8],
    Sus2: [0, 2, 7],
    Sus4: [0, 5, 7],
  };

  // Find best matching chord type
  for (const [chordType, pattern] of Object.entries(chordTypes)) {
    if (pattern.every(interval => intervals.includes(interval))) {
      const noteNames = [
        'C',
        'C#',
        'D',
        'D#',
        'E',
        'F',
        'F#',
        'G',
        'G#',
        'A',
        'A#',
        'B',
      ];
      const rootNote = noteNames[root];
      return `${rootNote} ${chordType}`;
    }
  }

  return null;
}

/**
 * Converts parsed tab to ChordShape format for display
 */
export function tabToChordShape(
  parsedTab: ParsedTab,
  chordName?: string
): ChordShape | null {
  if (!parsedTab.isChord || parsedTab.measures.length === 0) {
    return null;
  }

  const chordNotes = parsedTab.measures[0];
  const frets: (number | null)[] = [null, null, null, null, null, null];
  const fingers: (number | null)[] = [null, null, null, null, null, null];

  chordNotes.forEach(note => {
    if (note.string >= 0 && note.string <= 5) {
      frets[note.string] = note.fret;
      // Simple finger assignment (could be improved with proper fingering logic)
      fingers[note.string] = note.fret === 0 ? 0 : note.fret;
    }
  });

  const detectedChord =
    chordName || identifyChordFromTab(parsedTab) || 'Unknown Chord';
  const [root, quality] = detectedChord.split(' ');

  return {
    name: detectedChord,
    root: root || 'Unknown',
    quality: quality?.toLowerCase() || 'unknown',
    frets,
    fingers,
    difficulty: determineDifficulty(frets),
  };
}

/**
 * Determines chord difficulty based on fret positions and patterns
 */
function determineDifficulty(
  frets: (number | null)[]
): 'beginner' | 'intermediate' | 'advanced' {
  const usedFrets = frets.filter(f => f !== null && f > 0) as number[];

  if (usedFrets.length === 0) return 'beginner';

  const maxFret = Math.max(...usedFrets);
  const minFret = Math.min(...usedFrets);
  const fretSpread = maxFret - minFret;

  // Beginner: open chords or simple patterns
  if (maxFret <= 3 && fretSpread <= 2) return 'beginner';

  // Advanced: high frets, wide spread, or complex patterns
  if (maxFret > 7 || fretSpread > 4) return 'advanced';

  // Intermediate: everything else
  return 'intermediate';
}
