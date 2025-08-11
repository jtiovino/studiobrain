// Real voicing generation using curated chord database

import type {
  Instrument,
  Constraints,
  ChordInput,
  VoicingShape,
  VoicingRequest,
  VoicingResponse,
} from './voicing-explorer-types';
import {
  VoicingGenerationError,
  DEFAULT_CONSTRAINTS,
  STANDARD_TUNINGS,
} from './voicing-explorer-types';
import { parseChordFromText } from './constraint-parser';
import { guitarVoicings, type ChordShape } from './voicings';

// Note to semitone mapping
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

// Semitone to note mapping
const SEMITONE_TO_NOTE = [
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

// Quality mapping for chord lookup
const QUALITY_MAP: Record<string, string> = {
  major: 'major',
  maj: 'major',
  M: 'major',
  '': 'major',
  minor: 'minor',
  min: 'minor',
  m: 'minor',
  dominant7: 'dominant7',
  '7': 'dominant7',
  major7: 'major7',
  maj7: 'major7',
  M7: 'major7',
  minor7: 'minor7',
  m7: 'minor7',
  min7: 'minor7',
  power: 'power',
  '5': 'power',
};

/**
 * Main voicing generation function - uses curated chord database
 */
export async function generateVoicings(
  request: VoicingRequest
): Promise<VoicingResponse> {
  const startTime = Date.now();
  const metadata = {
    candidatesGenerated: 0,
    candidatesFiltered: 0,
    processingTimeMs: 0,
    warnings: [] as string[],
    suggestions: [] as string[],
  };

  try {
    // Parse chord input
    const chordInfo = parseChordInput(request.chordInput);
    if (!chordInfo) {
      throw new VoicingGenerationError(
        'Could not parse chord input',
        'INVALID_CHORD',
        ['Try a format like "Cmaj7", "Dm", or "G7"']
      );
    }

    // Merge constraints with defaults
    const constraints: Constraints = {
      ...DEFAULT_CONSTRAINTS,
      ...request.constraints,
    };

    // Get voicings from curated database
    const candidates = getCuratedVoicings(
      chordInfo.root,
      chordInfo.quality,
      request.instrument,
      constraints
    );
    metadata.candidatesGenerated = candidates.length;

    if (candidates.length === 0) {
      throw new VoicingGenerationError(
        `No voicings found for ${chordInfo.root}${chordInfo.quality}`,
        'NO_VOICINGS_FOUND',
        [
          'Try a different chord',
          'Check spelling of chord name',
          'Try basic chords like "C", "Dm", "G7"',
        ]
      );
    }

    // Apply constraint filtering
    const filtered = applyConstraints(
      candidates,
      constraints,
      request.instrument
    );
    metadata.candidatesFiltered = filtered.length;

    if (filtered.length === 0) {
      throw new VoicingGenerationError(
        'All voicings filtered out by constraints',
        'NO_VOICINGS_FOUND',
        [
          'Try expanding fret range',
          'Remove string restrictions',
          'Use different chord position',
        ]
      );
    }

    // Select top voicings (limit to 4)
    const count = Math.min(request.count || 4, 4);
    const selected = filtered.slice(0, count);

    // Generate lesson tips if requested
    let lessonTips: Record<string, string> | undefined;
    if (request.lessonMode) {
      lessonTips = generateLessonTips(selected);
    }

    metadata.processingTimeMs = Date.now() - startTime;

    return {
      voicings: selected,
      request,
      metadata,
      lessonTips,
    };
  } catch (error) {
    metadata.processingTimeMs = Date.now() - startTime;

    if (error instanceof VoicingGenerationError) {
      throw error;
    }

    throw new VoicingGenerationError(
      `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NO_VOICINGS_FOUND'
    );
  }
}

/**
 * Parse chord input into simple format for database lookup
 */
function parseChordInput(
  input: ChordInput
): { root: string; quality: string } | null {
  let chordInfo;

  if (input.literal) {
    // Parse literal chord symbol
    chordInfo = parseChordFromText(input.literal);
  } else if (input.root) {
    // Use structured input
    chordInfo = {
      root: input.root,
      quality: input.quality || 'major',
      extension: input.extension,
      bass: input.bass,
    };
  }

  if (!chordInfo) return null;

  // Normalize quality for database lookup
  let normalizedQuality: string;

  if (chordInfo.extension && chordInfo.extension.includes('7')) {
    // Handle 7th chords specially
    if (
      chordInfo.extension.includes('maj7') ||
      chordInfo.extension.includes('M7')
    ) {
      normalizedQuality = 'major7';
    } else if (chordInfo.extension.includes('m7')) {
      normalizedQuality = 'minor7';
    } else if (chordInfo.extension.includes('7')) {
      normalizedQuality = 'dominant7';
    } else {
      normalizedQuality = QUALITY_MAP[chordInfo.quality || 'major'] || 'major';
    }
  } else {
    // Use base quality for non-7th chords
    normalizedQuality = QUALITY_MAP[chordInfo.quality || 'major'] || 'major';
  }

  return {
    root: chordInfo.root,
    quality: normalizedQuality,
  };
}

/**
 * Get curated voicings from database
 */
function getCuratedVoicings(
  root: string,
  quality: string,
  instrument: Instrument,
  constraints: Constraints
): VoicingShape[] {
  if (instrument === 'guitar') {
    return getGuitarVoicingsFromDatabase(root, quality, constraints);
  }

  // For now, only support guitar voicings
  // Piano and bass can be added later
  return [];
}

/**
 * Get guitar voicings from curated database
 */
function getGuitarVoicingsFromDatabase(
  root: string,
  quality: string,
  constraints: Constraints
): VoicingShape[] {
  const voicings: VoicingShape[] = [];

  // Search through all voicing sets in the database
  for (const setName in guitarVoicings) {
    const voicingSet = guitarVoicings[setName];

    for (const chordShape of voicingSet.chords) {
      // Check if this chord matches what we're looking for
      if (chordMatches(chordShape, root, quality)) {
        // Convert ChordShape to VoicingShape
        const voicing = convertChordShapeToVoicingShape(
          chordShape,
          voicings.length
        );
        voicings.push(voicing);
      }

      // Also check for transposed versions
      const transposedVoicings = getTransposedVoicings(
        chordShape,
        root,
        quality,
        voicings.length
      );
      voicings.push(...transposedVoicings);
    }
  }

  return voicings;
}

/**
 * Check if a chord shape matches the requested root and quality
 */
function chordMatches(
  chordShape: ChordShape,
  root: string,
  quality: string
): boolean {
  return chordShape.root === root && chordShape.quality === quality;
}

/**
 * Convert ChordShape to VoicingShape format
 */
function convertChordShapeToVoicingShape(
  chordShape: ChordShape,
  id: number
): VoicingShape {
  return {
    id: `chord-${id}`,
    name: chordShape.name,
    root: chordShape.root,
    quality: chordShape.quality,
    instrument: 'guitar',
    frets: chordShape.frets,
    fingers: chordShape.fingers,
    barres: chordShape.barres,
    tuning: STANDARD_TUNINGS.guitar,
    position: getChordPosition(chordShape.frets),
    difficulty: chordShape.difficulty,
    playabilityScore: getDifficultyScore(chordShape.difficulty),
    musicalScore: 0.8, // Default good score for curated chords
    totalScore: getDifficultyScore(chordShape.difficulty) * 0.9, // Slight preference for easier chords
  };
}

/**
 * Get transposed versions of a chord shape for different roots
 */
function getTransposedVoicings(
  baseChord: ChordShape,
  targetRoot: string,
  targetQuality: string,
  startId: number
): VoicingShape[] {
  // Only transpose if the quality matches but root is different
  if (baseChord.quality !== targetQuality || baseChord.root === targetRoot) {
    return [];
  }

  const voicings: VoicingShape[] = [];
  const baseSemitone = NOTE_TO_SEMITONE[baseChord.root];
  const targetSemitone = NOTE_TO_SEMITONE[targetRoot];

  if (baseSemitone === undefined || targetSemitone === undefined) {
    return [];
  }

  const transpositionInterval = (targetSemitone - baseSemitone + 12) % 12;

  // Only transpose moveable shapes (barre chords)
  if (baseChord.barres && baseChord.barres.length > 0) {
    const transposedFrets = baseChord.frets.map(fret => {
      if (fret === null || fret === 0) return fret;
      return fret + transpositionInterval;
    });

    // Check if transposed chord stays within reasonable fret range
    const maxFret = Math.max(
      ...(transposedFrets.filter(f => f !== null) as number[])
    );
    if (maxFret <= 15) {
      // Stay within reasonable range
      const transposedChord: ChordShape = {
        ...baseChord,
        name: `${targetRoot} ${baseChord.quality}`,
        root: targetRoot,
        frets: transposedFrets,
        fingers: baseChord.fingers, // Keep same finger pattern
        barres: baseChord.barres?.map(barre => ({
          ...barre,
          fret: barre.fret + transpositionInterval,
        })),
      };

      const voicing = convertChordShapeToVoicingShape(
        transposedChord,
        startId + voicings.length
      );
      voicings.push(voicing);
    }
  }

  return voicings;
}

function getChordPosition(frets: (number | null)[]): string {
  const playedFrets = frets.filter(f => f !== null && f > 0) as number[];
  if (playedFrets.length === 0) return 'Open position';
  const minFret = Math.min(...playedFrets);
  return minFret === 1 ? '1st position' : `${minFret}th position`;
}

function getDifficultyScore(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): number {
  switch (difficulty) {
    case 'beginner':
      return 1.0;
    case 'intermediate':
      return 0.8;
    case 'advanced':
      return 0.6;
    default:
      return 0.7;
  }
}

/**
 * Apply constraint filtering to candidates
 */
function applyConstraints(
  candidates: VoicingShape[],
  constraints: Constraints,
  instrument: Instrument
): VoicingShape[] {
  return candidates.filter(voicing => {
    // Fret range filtering
    if ((constraints.fretMin || constraints.fretMax) && voicing.frets) {
      const playedFrets = voicing.frets.filter(
        f => f !== null && f > 0
      ) as number[];
      if (playedFrets.length > 0) {
        const minFret = Math.min(...playedFrets);
        const maxFret = Math.max(...playedFrets);
        if (constraints.fretMin && minFret < constraints.fretMin) return false;
        if (constraints.fretMax && maxFret > constraints.fretMax) return false;
      }
    }

    // String range filtering
    if (constraints.stringRange && voicing.frets) {
      const { from, to } = constraints.stringRange;
      const playedStrings = voicing.frets
        .map((fret, index) => (fret !== null ? index + 1 : null))
        .filter(s => s !== null) as number[];

      if (!playedStrings.every(s => s >= from && s <= to)) {
        return false;
      }
    }

    // Fret span filtering
    if (constraints.maxFretSpan && voicing.frets) {
      const playedFrets = voicing.frets.filter(
        f => f !== null && f > 0
      ) as number[];
      if (playedFrets.length > 0) {
        const span = Math.max(...playedFrets) - Math.min(...playedFrets);
        if (span > constraints.maxFretSpan) return false;
      }
    }

    return true;
  });
}

/**
 * Generate lesson tips for voicings
 */
function generateLessonTips(voicings: VoicingShape[]): Record<string, string> {
  const tips: Record<string, string> = {};

  voicings.forEach(voicing => {
    let tip = '';

    if (voicing.instrument === 'guitar' && voicing.frets) {
      const openStrings = voicing.frets.filter(f => f === 0).length;
      const playedFrets = voicing.frets.filter(
        f => f !== null && f > 0
      ) as number[];

      if (openStrings > 0) {
        tip = `Uses ${openStrings} open string${openStrings > 1 ? 's' : ''} for a richer sound`;
      } else if (playedFrets.length > 0) {
        const span = Math.max(...playedFrets) - Math.min(...playedFrets);
        if (span <= 2) {
          tip = 'Compact fingering makes this very playable';
        } else if (span >= 4) {
          tip = 'Wide stretch - practice slowly and build up';
        } else {
          tip = 'Good balance of reach and playability';
        }
      }
    }

    if (tip.length > 120) {
      tip = tip.substring(0, 117) + '...';
    }

    tips[voicing.id] =
      tip || 'Practice slowly and focus on clean finger placement';
  });

  return tips;
}
