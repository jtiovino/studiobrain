// Comprehensive music theory utility library for StudioBrain

export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';
export type ModeName =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'harmonicMinor'
  | 'melodicMinor';
export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'dominant7'
  | 'major7'
  | 'minor7'
  | 'diminished7'
  | 'half-diminished7'
  | 'sus2'
  | 'sus4'
  | 'add9'
  | 'minor9'
  | 'power';
export type RomanNumeral =
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI'
  | 'VII'
  | 'i'
  | 'ii'
  | 'iii'
  | 'iv'
  | 'v'
  | 'vi'
  | 'vii'
  | 'i°'
  | 'ii°'
  | 'iii°'
  | 'iv°'
  | 'v°'
  | 'vi°'
  | 'vii°'
  | 'III+';

export interface ChordInfo {
  root: NoteName;
  quality: ChordQuality;
  romanNumeral: RomanNumeral;
  scaleDegree: number;
  intervals: number[];
  name: string;
  function:
    | 'tonic'
    | 'subdominant'
    | 'dominant'
    | 'mediant'
    | 'submediant'
    | 'leading-tone'
    | 'supertonic';
}

export interface ModeInfo {
  name: ModeName;
  displayName: string;
  intervals: number[];
  characteristic: string;
  parentScale: 'major' | 'minor';
  chordQualities: ChordQuality[];
  romanNumerals: RomanNumeral[];
}

// The 12 chromatic notes
export const CHROMATIC_NOTES: NoteName[] = [
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

// Mode definitions with proper theoretical information
export const MODES: Record<ModeName, ModeInfo> = {
  ionian: {
    name: 'ionian',
    displayName: 'Ionian (Major)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    characteristic: 'Natural 4th and 7th - bright, happy sound',
    parentScale: 'major',
    chordQualities: [
      'major',
      'minor',
      'minor',
      'major',
      'major',
      'minor',
      'diminished',
    ],
    romanNumerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  },
  dorian: {
    name: 'dorian',
    displayName: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    characteristic: 'Natural 6th, flat 3rd and 7th - jazzy, sophisticated',
    parentScale: 'minor',
    chordQualities: [
      'minor',
      'minor',
      'major',
      'major',
      'minor',
      'diminished',
      'major',
    ],
    romanNumerals: ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'],
  },
  phrygian: {
    name: 'phrygian',
    displayName: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    characteristic: 'Flat 2nd - dark, Spanish/Middle Eastern flavor',
    parentScale: 'minor',
    chordQualities: [
      'minor',
      'major',
      'major',
      'minor',
      'diminished',
      'major',
      'minor',
    ],
    romanNumerals: ['i', 'II', 'III', 'iv', 'v°', 'VI', 'vii'],
  },
  lydian: {
    name: 'lydian',
    displayName: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    characteristic: 'Sharp 4th (#11) - dreamy, ethereal, floating',
    parentScale: 'major',
    chordQualities: [
      'major',
      'major',
      'minor',
      'diminished',
      'major',
      'minor',
      'minor',
    ],
    romanNumerals: ['I', 'II', 'iii', 'iv°', 'V', 'vi', 'vii'],
  },
  mixolydian: {
    name: 'mixolydian',
    displayName: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    characteristic: 'Flat 7th - bluesy, rock, folk sound',
    parentScale: 'major',
    chordQualities: [
      'major',
      'minor',
      'diminished',
      'major',
      'minor',
      'minor',
      'major',
    ],
    romanNumerals: ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'VII'],
  },
  aeolian: {
    name: 'aeolian',
    displayName: 'Aeolian (Natural Minor)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    characteristic: 'Natural minor - sad, melancholic, introspective',
    parentScale: 'minor',
    chordQualities: [
      'minor',
      'diminished',
      'major',
      'minor',
      'minor',
      'major',
      'major',
    ],
    romanNumerals: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  },
  locrian: {
    name: 'locrian',
    displayName: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    characteristic: 'Flat 2nd and 5th - unstable, dissonant, rarely used',
    parentScale: 'minor',
    chordQualities: [
      'diminished',
      'major',
      'minor',
      'minor',
      'major',
      'major',
      'minor',
    ],
    romanNumerals: ['i°', 'II', 'iii', 'iv', 'V', 'VI', 'vii'],
  },
  harmonicMinor: {
    name: 'harmonicMinor',
    displayName: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    characteristic:
      'Raised 7th - exotic, Middle Eastern flavor, strong leading tone',
    parentScale: 'minor',
    chordQualities: [
      'minor',
      'diminished',
      'augmented',
      'minor',
      'major',
      'major',
      'diminished',
    ],
    romanNumerals: ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°'],
  },
  melodicMinor: {
    name: 'melodicMinor',
    displayName: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    characteristic:
      'Raised 6th and 7th - smooth melodic motion, jazz applications',
    parentScale: 'minor',
    chordQualities: [
      'minor',
      'minor',
      'augmented',
      'major',
      'major',
      'diminished',
      'diminished',
    ],
    romanNumerals: ['i', 'ii', 'III+', 'IV', 'V', 'vi°', 'vii°'],
  },
};

// Chord function definitions
export const CHORD_FUNCTIONS: Record<
  number,
  | 'tonic'
  | 'subdominant'
  | 'dominant'
  | 'mediant'
  | 'submediant'
  | 'leading-tone'
  | 'supertonic'
> = {
  0: 'tonic',
  1: 'supertonic',
  2: 'mediant',
  3: 'subdominant',
  4: 'dominant',
  5: 'submediant',
  6: 'leading-tone',
};

// Interval patterns for chord construction
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  diminished7: [0, 3, 6, 9],
  'half-diminished7': [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14], // 14 = 2 + 12 (octave)
  minor9: [0, 3, 7, 10, 14], // minor 7th + 9th
  power: [0, 7], // Just root and fifth
};

// Utility functions
export function getNoteFromSemitone(
  rootNote: NoteName,
  semitones: number
): NoteName {
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  const targetIndex = (rootIndex + semitones) % 12;
  return CHROMATIC_NOTES[targetIndex];
}

export function getScaleNotes(root: NoteName, mode: ModeName): NoteName[] {
  const modeInfo = MODES[mode];
  return modeInfo.intervals.map(interval =>
    getNoteFromSemitone(root, interval)
  );
}

export function buildChord(root: NoteName, quality: ChordQuality): NoteName[] {
  const intervals = CHORD_INTERVALS[quality];
  return intervals.map(interval => getNoteFromSemitone(root, interval));
}

// Helper function to build a triad from a scale degree
export function buildTriadFromScaleDegree(
  scaleNotes: NoteName[],
  degree: number
): NoteName[] {
  // Get the 1st, 3rd, and 5th of the triad (scale degrees 1, 3, 5 relative to the chord root)
  const rootIndex = (degree - 1) % 7;
  const thirdIndex = (degree - 1 + 2) % 7; // Skip one scale note (2nd interval)
  const fifthIndex = (degree - 1 + 4) % 7; // Skip three scale notes (4th interval)

  const root = scaleNotes[rootIndex];
  const third = scaleNotes[thirdIndex];
  const fifth = scaleNotes[fifthIndex];

  console.log(
    `    🔨 Building triad for degree ${degree}: indices [${rootIndex}, ${thirdIndex}, ${fifthIndex}] → [${root}, ${third}, ${fifth}]`
  );

  return [root, third, fifth];
}

// Helper function to determine chord quality from triad intervals
export function analyzeChordQuality(triad: NoteName[]): ChordQuality {
  const [root, third, fifth] = triad;

  // Calculate semitone intervals
  const rootIndex = CHROMATIC_NOTES.indexOf(root);
  const thirdIndex = CHROMATIC_NOTES.indexOf(third);
  const fifthIndex = CHROMATIC_NOTES.indexOf(fifth);

  // Calculate intervals (handle wrapping around octave)
  const thirdInterval = (thirdIndex - rootIndex + 12) % 12;
  const fifthInterval = (fifthIndex - rootIndex + 12) % 12;

  // Determine quality based on intervals
  if (thirdInterval === 4 && fifthInterval === 7) {
    return 'major';
  } else if (thirdInterval === 3 && fifthInterval === 7) {
    return 'minor';
  } else if (thirdInterval === 3 && fifthInterval === 6) {
    return 'diminished';
  } else if (thirdInterval === 4 && fifthInterval === 8) {
    return 'augmented';
  }

  // Default to major if intervals don't match standard patterns
  return 'major';
}

// Helper function to get Roman numeral based on scale degree and quality
export function getRomanNumeral(
  degree: number,
  quality: ChordQuality
): RomanNumeral {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const lowerRomanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
  const diminishedRomanNumerals = [
    'i°',
    'ii°',
    'iii°',
    'iv°',
    'v°',
    'vi°',
    'vii°',
  ];

  const index = degree - 1;

  if (quality === 'diminished') {
    return diminishedRomanNumerals[index] as RomanNumeral;
  } else if (quality === 'minor') {
    return lowerRomanNumerals[index] as RomanNumeral;
  } else {
    return romanNumerals[index] as RomanNumeral;
  }
}

export function getModeChords(root: NoteName, mode: ModeName): ChordInfo[] {
  const scaleNotes = getScaleNotes(root, mode);
  console.log(`\n🎵 Generating chords for ${root} ${mode}`);
  console.log(`📝 Scale notes: [${scaleNotes.join(', ')}]`);

  return scaleNotes.map((_, index) => {
    const scaleDegree = index + 1;
    const triad = buildTriadFromScaleDegree(scaleNotes, scaleDegree);
    const quality = analyzeChordQuality(triad);
    const romanNumeral = getRomanNumeral(scaleDegree, quality);
    const chordFunction = CHORD_FUNCTIONS[index];
    const chordRoot = triad[0];
    const intervals = CHORD_INTERVALS[quality];

    console.log(
      `🎵 Degree ${scaleDegree}: [${triad.join(', ')}] → ${quality} → ${chordRoot}${quality === 'minor' ? 'm' : quality === 'diminished' ? '°' : ''}`
    );

    // Generate chord name
    let chordName = chordRoot;
    switch (quality) {
      case 'minor':
        chordName += 'm';
        break;
      case 'diminished':
        chordName += '°';
        break;
      case 'augmented':
        chordName += '+';
        break;
      case 'dominant7':
        chordName += '7';
        break;
      case 'major7':
        chordName += 'maj7';
        break;
      case 'minor7':
        chordName += 'm7';
        break;
      case 'diminished7':
        chordName += '°7';
        break;
      case 'half-diminished7':
        chordName += 'ø7';
        break;
      case 'sus2':
        chordName += 'sus2';
        break;
      case 'sus4':
        chordName += 'sus4';
        break;
      case 'add9':
        chordName += 'add9';
        break;
      case 'minor9':
        chordName += 'm9';
        break;
      case 'power':
        chordName += '5';
        break;
      default:
        // major chords have no suffix
        break;
    }

    return {
      root: chordRoot,
      quality,
      romanNumeral,
      scaleDegree,
      intervals,
      name: chordName,
      function: chordFunction,
    };
  });
}

export function getChordTones(chordInfo: ChordInfo): NoteName[] {
  return buildChord(chordInfo.root, chordInfo.quality);
}

// Helper function to convert legacy mode names
export function normalizeModeNames(mode: string): ModeName {
  const modeMap: Record<string, ModeName> = {
    major: 'ionian',
    minor: 'aeolian',
    ionian: 'ionian',
    dorian: 'dorian',
    phrygian: 'phrygian',
    lydian: 'lydian',
    mixolydian: 'mixolydian',
    aeolian: 'aeolian',
    locrian: 'locrian',
    harmonicminor: 'harmonicMinor',
    'harmonic minor': 'harmonicMinor',
    melodicminor: 'melodicMinor',
    'melodic minor': 'melodicMinor',
  };
  return modeMap[mode.toLowerCase()] || 'ionian';
}

// Get the characteristic intervals that define a mode
export function getCharacteristicIntervals(
  mode: ModeName
): { interval: number; name: string; quality: string }[] {
  const characteristics: Record<
    ModeName,
    { interval: number; name: string; quality: string }[]
  > = {
    ionian: [
      { interval: 6, name: '4th', quality: 'perfect' },
      { interval: 10, name: '7th', quality: 'major' },
    ],
    dorian: [
      { interval: 5, name: '6th', quality: 'major' },
      { interval: 2, name: '3rd', quality: 'minor' },
    ],
    phrygian: [
      { interval: 0, name: '2nd', quality: 'minor' },
      { interval: 2, name: '3rd', quality: 'minor' },
    ],
    lydian: [{ interval: 5, name: '4th', quality: 'augmented' }],
    mixolydian: [{ interval: 9, name: '7th', quality: 'minor' }],
    aeolian: [
      { interval: 2, name: '3rd', quality: 'minor' },
      { interval: 7, name: '6th', quality: 'minor' },
      { interval: 9, name: '7th', quality: 'minor' },
    ],
    locrian: [
      { interval: 0, name: '2nd', quality: 'minor' },
      { interval: 5, name: '5th', quality: 'diminished' },
    ],
    harmonicMinor: [
      { interval: 10, name: '7th', quality: 'major' },
      { interval: 2, name: '3rd', quality: 'minor' },
      { interval: 7, name: '6th', quality: 'minor' },
    ],
    melodicMinor: [
      { interval: 8, name: '6th', quality: 'major' },
      { interval: 10, name: '7th', quality: 'major' },
      { interval: 2, name: '3rd', quality: 'minor' },
    ],
  };

  return characteristics[mode] || [];
}

// Get common chord progressions for each mode
export function getCommonProgressions(
  mode: ModeName
): { name: string; numerals: string[]; description: string }[] {
  const progressions: Record<
    ModeName,
    { name: string; numerals: string[]; description: string }[]
  > = {
    ionian: [
      {
        name: 'I-V-vi-IV',
        numerals: ['I', 'V', 'vi', 'IV'],
        description: 'Pop progression',
      },
      {
        name: 'ii-V-I',
        numerals: ['ii', 'V', 'I'],
        description: 'Jazz turnaround',
      },
      {
        name: 'I-vi-ii-V',
        numerals: ['I', 'vi', 'ii', 'V'],
        description: 'Circle progression',
      },
    ],
    dorian: [
      { name: 'i-IV-i', numerals: ['i', 'IV', 'i'], description: 'Modal vamp' },
      {
        name: 'i-VII-i',
        numerals: ['i', 'VII', 'i'],
        description: 'Dorian cadence',
      },
      {
        name: 'i-ii-i',
        numerals: ['i', 'ii', 'i'],
        description: 'Minor ii emphasis',
      },
    ],
    phrygian: [
      {
        name: 'i-II-i',
        numerals: ['i', 'II', 'i'],
        description: 'Phrygian cadence',
      },
      {
        name: 'i-VI-VII-i',
        numerals: ['i', 'VI', 'VII', 'i'],
        description: 'Spanish progression',
      },
    ],
    lydian: [
      {
        name: 'I-II-I',
        numerals: ['I', 'II', 'I'],
        description: 'Lydian characteristic',
      },
      {
        name: 'I-iii-II-I',
        numerals: ['I', 'iii', 'II', 'I'],
        description: 'Floating progression',
      },
    ],
    mixolydian: [
      {
        name: 'I-VII-I',
        numerals: ['I', 'VII', 'I'],
        description: 'Rock progression',
      },
      {
        name: 'I-VII-IV-I',
        numerals: ['I', 'VII', 'IV', 'I'],
        description: 'Mixolydian loop',
      },
    ],
    aeolian: [
      {
        name: 'i-VI-VII-i',
        numerals: ['i', 'VI', 'VII', 'i'],
        description: 'Minor progression',
      },
      {
        name: 'i-iv-V-i',
        numerals: ['i', 'iv', 'V', 'i'],
        description: 'Harmonic minor feel',
      },
    ],
    locrian: [
      {
        name: 'i°-II-i°',
        numerals: ['i°', 'II', 'i°'],
        description: 'Unstable resolution',
      },
    ],
    harmonicMinor: [
      {
        name: 'i-V-i',
        numerals: ['i', 'V', 'i'],
        description: 'Strong resolution with major V',
      },
      {
        name: 'i-VI-vii°-i',
        numerals: ['i', 'VI', 'vii°', 'i'],
        description: 'Harmonic minor cadence',
      },
    ],
    melodicMinor: [
      {
        name: 'i-IV-V-i',
        numerals: ['i', 'IV', 'V', 'i'],
        description: 'Major IV and V chords',
      },
      {
        name: 'i-ii-V-i',
        numerals: ['i', 'ii', 'V', 'i'],
        description: 'Jazz minor progression',
      },
    ],
  };

  return progressions[mode] || [];
}
