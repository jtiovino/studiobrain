// Voicing data structures and chord shape definitions

export interface ChordShape {
  name: string;
  root: string;
  quality: string;
  frets: (number | null)[]; // null = don't play string, number = fret position
  fingers: (number | null)[]; // finger positions (1-4, null = open/muted)
  barres?: { fret: number; fromString: number; toString: number }[]; // barre chords
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface VoicingSet {
  type: string;
  description: string;
  chords: ChordShape[];
  instrument: 'guitar' | 'piano' | 'bass';
}

// Standard guitar tuning chord shapes
export const guitarVoicings: { [key: string]: VoicingSet } = {
  'Open Chords': {
    type: 'Open Chords',
    description: 'Basic open chord shapes using open strings',
    instrument: 'guitar',
    chords: [
      {
        name: 'C Major',
        root: 'C',
        quality: 'major',
        frets: [null, 3, 2, 0, 1, 0],
        fingers: [null, 3, 2, 0, 1, 0],
        difficulty: 'beginner',
      },
      {
        name: 'D Major',
        root: 'D',
        quality: 'major',
        frets: [null, null, 0, 2, 3, 2],
        fingers: [null, null, 0, 1, 3, 2],
        difficulty: 'beginner',
      },
      {
        name: 'E Major',
        root: 'E',
        quality: 'major',
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [0, 2, 3, 1, 0, 0],
        difficulty: 'beginner',
      },
      {
        name: 'F Major',
        root: 'F',
        quality: 'major',
        frets: [1, 3, 3, 2, 1, 1],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 1, fromString: 0, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'G Major',
        root: 'G',
        quality: 'major',
        frets: [3, 2, 0, 0, 0, 3],
        fingers: [2, 1, 0, 0, 0, 3],
        difficulty: 'beginner',
      },
      {
        name: 'A Major',
        root: 'A',
        quality: 'major',
        frets: [null, 0, 2, 2, 2, 0],
        fingers: [null, 0, 1, 2, 3, 0],
        difficulty: 'beginner',
      },
      {
        name: 'A Minor',
        root: 'A',
        quality: 'minor',
        frets: [null, 0, 2, 2, 1, 0],
        fingers: [null, 0, 2, 3, 1, 0],
        difficulty: 'beginner',
      },
      {
        name: 'D Minor',
        root: 'D',
        quality: 'minor',
        frets: [null, null, 0, 2, 3, 1],
        fingers: [null, null, 0, 2, 3, 1],
        difficulty: 'beginner',
      },
      {
        name: 'E Minor',
        root: 'E',
        quality: 'minor',
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [0, 2, 3, 0, 0, 0],
        difficulty: 'beginner',
      },
    ],
  },
  'Barre Chords': {
    type: 'Barre Chords',
    description: 'Moveable barre chord shapes',
    instrument: 'guitar',
    chords: [
      {
        name: 'E Shape Major',
        root: 'F', // Example at 1st fret
        quality: 'major',
        frets: [1, 3, 3, 2, 1, 1],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 1, fromString: 0, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'E Shape Minor',
        root: 'F', // Example at 1st fret
        quality: 'minor',
        frets: [1, 3, 3, 1, 1, 1],
        fingers: [1, 3, 4, 1, 1, 1],
        barres: [{ fret: 1, fromString: 0, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'A Shape Major',
        root: 'B', // Example at 2nd fret
        quality: 'major',
        frets: [null, 2, 4, 4, 4, 2],
        fingers: [null, 1, 2, 3, 4, 1],
        barres: [{ fret: 2, fromString: 1, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'A Shape Minor',
        root: 'B', // Example at 2nd fret
        quality: 'minor',
        frets: [null, 2, 4, 4, 3, 2],
        fingers: [null, 1, 3, 4, 2, 1],
        barres: [{ fret: 2, fromString: 1, toString: 5 }],
        difficulty: 'intermediate',
      },
    ],
  },
  'Jazz Voicings': {
    type: 'Jazz Voicings',
    description: 'Jazz chord voicings with extensions',
    instrument: 'guitar',
    chords: [
      {
        name: 'Cmaj7',
        root: 'C',
        quality: 'major7',
        frets: [null, 3, 2, 0, 0, 0],
        fingers: [null, 3, 2, 0, 0, 0],
        difficulty: 'intermediate',
      },
      {
        name: 'Dm7',
        root: 'D',
        quality: 'minor7',
        frets: [null, null, 0, 2, 1, 1],
        fingers: [null, null, 0, 2, 1, 1],
        difficulty: 'intermediate',
      },
      {
        name: 'G7',
        root: 'G',
        quality: 'dominant7',
        frets: [3, 2, 0, 0, 0, 1],
        fingers: [3, 2, 0, 0, 0, 1],
        difficulty: 'intermediate',
      },
      {
        name: 'Am7',
        root: 'A',
        quality: 'minor7',
        frets: [null, 0, 2, 0, 1, 0],
        fingers: [null, 0, 2, 0, 1, 0],
        difficulty: 'intermediate',
      },
      {
        name: 'Fmaj7',
        root: 'F',
        quality: 'major7',
        frets: [1, 3, 3, 2, 1, 0],
        fingers: [1, 3, 4, 2, 1, 0],
        barres: [{ fret: 1, fromString: 0, toString: 4 }],
        difficulty: 'advanced',
      },
    ],
  },
  'Power Chords': {
    type: 'Power Chords',
    description: 'Two-note power chord shapes',
    instrument: 'guitar',
    chords: [
      {
        name: 'E5',
        root: 'E',
        quality: 'power',
        frets: [0, 2, 2, null, null, null],
        fingers: [0, 1, 2, null, null, null],
        difficulty: 'beginner',
      },
      {
        name: 'A5',
        root: 'A',
        quality: 'power',
        frets: [null, 0, 2, 2, null, null],
        fingers: [null, 0, 1, 2, null, null],
        difficulty: 'beginner',
      },
      {
        name: 'D5',
        root: 'D',
        quality: 'power',
        frets: [null, null, 0, 2, 3, null],
        fingers: [null, null, 0, 1, 2, null],
        difficulty: 'beginner',
      },
      {
        name: 'G5',
        root: 'G',
        quality: 'power',
        frets: [3, 5, 5, null, null, null],
        fingers: [1, 3, 4, null, null, null],
        difficulty: 'beginner',
      },
    ],
  },
  'Suspended Chords': {
    type: 'Suspended Chords',
    description: 'Suspended 2nd and 4th chords - create tension and movement',
    instrument: 'guitar',
    chords: [
      {
        name: 'Asus2',
        root: 'A',
        quality: 'sus2',
        frets: [null, 0, 2, 2, 0, 0],
        fingers: [null, 0, 1, 2, 0, 0],
        difficulty: 'beginner',
      },
      {
        name: 'Asus4',
        root: 'A',
        quality: 'sus4',
        frets: [null, 0, 2, 2, 3, 0],
        fingers: [null, 0, 1, 2, 3, 0],
        difficulty: 'beginner',
      },
      {
        name: 'Dsus2',
        root: 'D',
        quality: 'sus2',
        frets: [null, null, 0, 2, 3, 0],
        fingers: [null, null, 0, 1, 2, 0],
        difficulty: 'beginner',
      },
      {
        name: 'Dsus4',
        root: 'D',
        quality: 'sus4',
        frets: [null, null, 0, 2, 3, 3],
        fingers: [null, null, 0, 1, 2, 3],
        difficulty: 'beginner',
      },
      {
        name: 'Esus4',
        root: 'E',
        quality: 'sus4',
        frets: [0, 2, 2, 2, 0, 0],
        fingers: [0, 1, 2, 3, 0, 0],
        difficulty: 'beginner',
      },
    ],
  },
  'Diminished Chords': {
    type: 'Diminished Chords',
    description: 'Diminished and half-diminished chords for tension and color',
    instrument: 'guitar',
    chords: [
      {
        name: 'A°',
        root: 'A',
        quality: 'diminished',
        frets: [null, 0, 1, 2, 1, 2],
        fingers: [null, 0, 1, 3, 2, 4],
        difficulty: 'intermediate',
      },
      {
        name: 'B°',
        root: 'B',
        quality: 'diminished',
        frets: [null, 2, 3, 4, 3, 4],
        fingers: [null, 1, 2, 4, 3, 4],
        difficulty: 'intermediate',
      },
      {
        name: 'C°',
        root: 'C',
        quality: 'diminished',
        frets: [null, 3, 4, 5, 4, 5],
        fingers: [null, 1, 2, 4, 3, 4],
        difficulty: 'intermediate',
      },
      {
        name: 'Gø7',
        root: 'G',
        quality: 'half-diminished7',
        frets: [3, null, 3, 4, 3, null],
        fingers: [1, null, 2, 4, 3, null],
        difficulty: 'advanced',
      },
    ],
  },
  'Extended Chords': {
    type: 'Extended Chords',
    description: '9th, 11th, and 13th chords for sophisticated harmony',
    instrument: 'guitar',
    chords: [
      {
        name: 'Cadd9',
        root: 'C',
        quality: 'add9',
        frets: [null, 3, 2, 0, 3, 0],
        fingers: [null, 2, 1, 0, 3, 0],
        difficulty: 'intermediate',
      },
      {
        name: 'Gadd9',
        root: 'G',
        quality: 'add9',
        frets: [3, 0, 0, 0, 0, 3],
        fingers: [2, 0, 0, 0, 0, 3],
        difficulty: 'beginner',
      },
      {
        name: 'Dadd9',
        root: 'D',
        quality: 'add9',
        frets: [null, null, 0, 2, 3, 2],
        fingers: [null, null, 0, 1, 3, 2],
        difficulty: 'beginner',
      },
      {
        name: 'Em9',
        root: 'E',
        quality: 'minor9',
        frets: [0, 2, 0, 0, 0, 0],
        fingers: [0, 1, 0, 0, 0, 0],
        difficulty: 'beginner',
      },
      {
        name: 'Am9',
        root: 'A',
        quality: 'minor9',
        frets: [null, 0, 5, 5, 5, 7],
        fingers: [null, 0, 1, 2, 3, 4],
        difficulty: 'advanced',
      },
    ],
  },
  'Alternate Voicings': {
    type: 'Alternate Voicings',
    description: 'Alternative fingerings and positions for common chords',
    instrument: 'guitar',
    chords: [
      {
        name: 'C Major (Alt)',
        root: 'C',
        quality: 'major',
        frets: [null, 3, 5, 5, 5, 3],
        fingers: [null, 1, 2, 3, 4, 1],
        barres: [{ fret: 3, fromString: 1, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'G Major (Alt)',
        root: 'G',
        quality: 'major',
        frets: [3, 5, 5, 4, 3, 3],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 3, fromString: 0, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'D Major (Alt)',
        root: 'D',
        quality: 'major',
        frets: [null, 5, 7, 7, 7, 5],
        fingers: [null, 1, 2, 3, 4, 1],
        barres: [{ fret: 5, fromString: 1, toString: 5 }],
        difficulty: 'intermediate',
      },
      {
        name: 'A Minor (Alt)',
        root: 'A',
        quality: 'minor',
        frets: [5, 7, 7, 5, 5, 5],
        fingers: [1, 3, 4, 1, 1, 1],
        barres: [{ fret: 5, fromString: 0, toString: 5 }],
        difficulty: 'intermediate',
      },
    ],
  },
};

export const pianoVoicings: { [key: string]: VoicingSet } = {
  Triads: {
    type: 'Triads',
    description: 'Basic three-note chord structures',
    instrument: 'piano',
    chords: [
      {
        name: 'C Major',
        root: 'C',
        quality: 'major',
        frets: [], // Piano doesn't use frets - we'll handle differently
        fingers: [],
        difficulty: 'beginner',
      },
    ],
  },
  '7th Chords': {
    type: '7th Chords',
    description: 'Four-note chords with seventh intervals',
    instrument: 'piano',
    chords: [
      {
        name: 'Cmaj7',
        root: 'C',
        quality: 'major7',
        frets: [],
        fingers: [],
        difficulty: 'intermediate',
      },
    ],
  },
  'Extended Chords': {
    type: 'Extended Chords',
    description: 'Chords with 9th, 11th, and 13th extensions',
    instrument: 'piano',
    chords: [
      {
        name: 'Cmaj9',
        root: 'C',
        quality: 'major9',
        frets: [],
        fingers: [],
        difficulty: 'advanced',
      },
    ],
  },
  Inversions: {
    type: 'Inversions',
    description: 'Chord inversions and voicing variations',
    instrument: 'piano',
    chords: [
      {
        name: 'C/E',
        root: 'C',
        quality: 'major_first_inversion',
        frets: [],
        fingers: [],
        difficulty: 'intermediate',
      },
    ],
  },
};

// Utility functions
export function getVoicingsForInstrument(instrument: 'guitar' | 'piano'): {
  [key: string]: VoicingSet;
} {
  return instrument === 'guitar' ? guitarVoicings : pianoVoicings;
}

export function adaptVoicingsForTuning(
  voicingSet: VoicingSet,
  tuning: string[]
): VoicingSet {
  // For now, return the voicing set as-is
  // Full implementation would adjust chord shapes based on tuning
  // This is complex as it would require recalculating fret positions
  // based on the new string tunings
  return {
    ...voicingSet,
    chords: voicingSet.chords.map(chord => ({
      ...chord,
      // Add tuning-specific adjustments here if needed
    })),
  };
}

export function filterChordsByDifficulty(
  chords: ChordShape[],
  maxDifficulty: 'beginner' | 'intermediate' | 'advanced'
): ChordShape[] {
  const difficultyLevels = { beginner: 1, intermediate: 2, advanced: 3 };
  const maxLevel = difficultyLevels[maxDifficulty];

  return chords.filter(chord => difficultyLevels[chord.difficulty] <= maxLevel);
}

export function getChordsByQuality(
  chords: ChordShape[],
  quality: string
): ChordShape[] {
  return chords.filter(chord => chord.quality === quality);
}

export function transposeChordShape(
  shape: ChordShape,
  semitones: number
): ChordShape {
  // For barre chords and closed voicings, transpose by moving fret positions
  const hasBarre = shape.barres && shape.barres.length > 0;
  const hasOpenStrings = shape.frets.some(f => f === 0);

  if (hasBarre || !hasOpenStrings) {
    // Safe to transpose by moving all frets
    return {
      ...shape,
      frets: shape.frets.map(f => (f !== null && f > 0 ? f + semitones : f)),
      fingers: shape.fingers, // fingers stay the same
      barres: shape.barres?.map(barre => ({
        ...barre,
        fret: barre.fret + semitones,
      })),
    };
  }

  // For open chords, return as-is (would need chord substitution logic)
  return shape;
}

export function getChordShapesForRoot(
  voicingSet: VoicingSet,
  targetRoot: string
): ChordShape[] {
  const notes = [
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

  return voicingSet.chords.map(chord => {
    // Calculate semitone difference between chord root and target root
    const chordRootIndex = notes.indexOf(chord.root);
    const targetRootIndex = notes.indexOf(targetRoot);

    if (chordRootIndex === -1 || targetRootIndex === -1) {
      return chord; // Return unchanged if invalid notes
    }

    const semitones = (targetRootIndex - chordRootIndex + 12) % 12;

    if (semitones === 0) {
      return chord; // No transposition needed
    }

    // Transpose the chord shape
    const transposedShape = transposeChordShape(chord, semitones);

    // Update the chord name and root
    const newName = chord.name.replace(chord.root, targetRoot);

    return {
      ...transposedShape,
      name: newName,
      root: targetRoot,
    };
  });
}
