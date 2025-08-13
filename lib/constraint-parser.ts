// Natural language processing for voicing constraints

import type { Constraints } from './voicing-explorer-types';

// Note pattern for regex matching
const NOTE = '(?:A#?|Bb|C#?|Db|D#?|Eb|F#?|Gb|G#?|Ab|B)';

/**
 * Parse natural language input into voicing constraints
 * @param input - Natural language string describing voicing requirements
 * @param base - Base constraints to merge with parsed constraints
 * @returns Partial constraints object with parsed requirements
 */
export function parseToConstraints(
  input: string,
  _base: Constraints = {}
): Partial<Constraints> {
  const s = input.toLowerCase();
  const patch: Partial<Constraints> = {};

  // Chord type constraints
  if (/triads?\s+only|just\s+triads?|no\s+7ths?/.test(s)) {
    patch.chordType = 'triad';
  }
  if (/(seventh|7th)\s+chords?/.test(s)) {
    patch.chordType = 'seventh';
  }
  if (/extended\s+chords?|add\s+tensions?/.test(s)) {
    patch.chordType = 'extended';
  }

  // String range constraints (guitar/bass)
  if (/top\s*3\s*strings?/.test(s)) {
    patch.stringRange = { from: 1, to: 3 };
  }
  if (/top\s*4\s*strings?/.test(s)) {
    patch.stringRange = { from: 1, to: 4 };
  }
  if (/bottom\s*3\s*strings?/.test(s)) {
    patch.stringRange = { from: 4, to: 6 }; // assuming 6-string guitar
  }
  if (/bottom\s*4\s*strings?/.test(s)) {
    patch.stringRange = { from: 3, to: 6 };
  }

  // Fret span constraints
  const mSpan = s.match(/max(?:imum)?\s*(\d+)\s*frets?/);
  if (mSpan) {
    patch.maxFretSpan = Math.max(2, Math.min(6, parseInt(mSpan[1], 10)));
  }
  if (/no\s+stretches?|compact\s+shapes?/.test(s)) {
    patch.maxFretSpan = 3;
  }

  // Fret range constraints
  const mFretRange = s.match(
    /(?:frets?\s*)?(\d+)(?:\s*[-–—]\s*|\s+to\s+)(\d+)/
  );
  if (mFretRange) {
    const fretMin = parseInt(mFretRange[1], 10);
    const fretMax = parseInt(mFretRange[2], 10);
    if (fretMin <= fretMax) {
      patch.fretMin = fretMin;
      patch.fretMax = fretMax;
    }
  }

  // Single fret position
  const mSingleFret = s.match(
    /(?:around\s+)?(?:fret\s+)?(\d+)(?:th)?\s+(?:fret|position)/
  );
  if (mSingleFret) {
    const fret = parseInt(mSingleFret[1], 10);
    patch.fretMin = Math.max(1, fret - 2);
    patch.fretMax = fret + 2;
  }

  // Open string preferences
  if (/avoid\s+open\s+strings?|no\s+open\s+strings?/.test(s)) {
    patch.openPreference = 'avoid';
    patch.requireOpenStrings = [];
  }
  if (/prefer\s+open\s+strings?|use\s+open\s+strings?/.test(s)) {
    patch.openPreference = 'prefer';
  }

  // Specific open string requirements
  const mOpen = s.match(
    new RegExp(`(?:use\s+|with\s+|include\s+)?open\\s*(${NOTE})`, 'i')
  );
  if (mOpen) {
    const note = mOpen[1].toUpperCase();
    // Normalize enharmonic equivalents
    const normalizedNote = normalizeNote(note);
    patch.requireOpenStrings = [normalizedNote];
  }

  // Multiple open strings
  const openStringsMatches = s.matchAll(new RegExp(`open\\s*(${NOTE})`, 'gi'));
  const openStrings = Array.from(openStringsMatches, match =>
    normalizeNote(match[1].toUpperCase())
  );
  if (openStrings.length > 1) {
    patch.requireOpenStrings = openStrings;
  }

  // Key center constraints
  const mKey = s.match(
    /(?:in\s+the\s+)?key\s+of\s*([A-G](?:#|b)?)(?:\s+(major|minor))?/i
  );
  if (mKey) {
    patch.keyCenter = normalizeNote(mKey[1].toUpperCase());
  }

  // Count preferences (still enforce 3-4 range)
  const mCount = s.match(/(?:only\s+)?(\d+)\s+(?:shapes?|options?|voicings?)/);
  if (mCount) {
    const count = Math.max(3, Math.min(4, parseInt(mCount[1], 10)));
    (patch as any).count = count;
  }

  // Piano register constraints
  if (/low\s+register|bass\s+register|lower/.test(s)) {
    patch.register = 'low';
  }
  if (/mid(?:dle)?\s+register|medium/.test(s)) {
    patch.register = 'mid';
  }
  if (/high\s+register|treble\s+register|upper/.test(s)) {
    patch.register = 'high';
  }

  // Instrument-specific hints (for context)
  let instrumentHint: string | undefined;
  if (/guitar|fret/.test(s)) instrumentHint = 'guitar';
  if (/piano|keyboard/.test(s)) instrumentHint = 'piano';
  if (/bass/.test(s)) instrumentHint = 'bass';

  // Add instrument hint to patch for context (not part of Constraints interface)
  if (instrumentHint) {
    (patch as any).instrumentHint = instrumentHint;
  }

  return patch;
}

/**
 * Normalize note names to handle enharmonic equivalents
 */
function normalizeNote(note: string): string {
  const enharmonicMap: Record<string, string> = {
    BB: 'A#',
    DB: 'C#',
    EB: 'D#',
    GB: 'F#',
    AB: 'G#',
  };

  return enharmonicMap[note] || note;
}

/**
 * Extract chord information from natural language
 * @param input - Natural language input
 * @returns Parsed chord information or null if no chord found
 */
export function parseChordFromText(input: string): {
  root: string;
  quality?: string;
  extension?: string;
  bass?: string;
} | null {
  // Common chord patterns
  const patterns = [
    // Complex chords: Cmaj9#11/G, Dm7b5, F#m7add11
    /([A-G][#b]?)([A-Za-z0-9#b+°∅-]+)(?:\/([A-G][#b]?))?/,
    // Simple chords: C, Dm, F#
    /([A-G][#b]?)([mM](?:aj)?|min(?:or)?|dim|aug|\+|°|∅)?/,
  ];

  const s = input.replace(/\s+/g, ''); // Remove spaces

  for (const pattern of patterns) {
    const match = s.match(pattern);
    if (match) {
      const [, root, quality, bass] = match;

      // Parse quality into base quality and extensions
      const { baseQuality, extension } = parseQuality(quality || '');

      return {
        root: normalizeNote(root.toUpperCase()),
        quality: baseQuality,
        extension,
        bass: bass ? normalizeNote(bass.toUpperCase()) : undefined,
      };
    }
  }

  return null;
}

/**
 * Parse chord quality string into base quality and extensions
 */
function parseQuality(quality: string): {
  baseQuality: string;
  extension?: string;
} {
  if (!quality || quality === 'M' || quality === 'maj') {
    return { baseQuality: 'major' };
  }

  if (quality === 'm' || quality === 'min' || quality === 'minor') {
    return { baseQuality: 'minor' };
  }

  if (quality.includes('dim') || quality.includes('°')) {
    return { baseQuality: 'diminished' };
  }

  if (quality.includes('aug') || quality.includes('+')) {
    return { baseQuality: 'augmented' };
  }

  // Complex qualities with extensions
  if (
    quality.includes('7') ||
    quality.includes('9') ||
    quality.includes('11') ||
    quality.includes('13')
  ) {
    if (quality.includes('maj7') || quality.includes('M7')) {
      return { baseQuality: 'major', extension: quality };
    }
    if (quality.includes('m7')) {
      return { baseQuality: 'minor', extension: quality };
    }
    return { baseQuality: 'dominant', extension: quality };
  }

  if (quality.includes('sus')) {
    return { baseQuality: 'suspended', extension: quality };
  }

  if (quality.includes('add')) {
    return { baseQuality: 'major', extension: quality };
  }

  // Default to major if unclear
  return {
    baseQuality: 'major',
    extension: quality !== 'major' ? quality : undefined,
  };
}

/**
 * Validate constraints for conflicts and provide suggestions
 */
export function validateConstraints(
  constraints: Constraints,
  instrument: string
): {
  valid: boolean;
  conflicts: string[];
  suggestions: string[];
} {
  const conflicts: string[] = [];
  const suggestions: string[] = [];

  // Check string range vs open string requirements
  if (constraints.stringRange && constraints.requireOpenStrings?.length) {
    // This would need actual tuning info to validate properly
    // For now, just warn about potential conflicts
    suggestions.push(
      'Verify that required open strings are within the specified string range'
    );
  }

  // Check fret range validity
  if (
    constraints.fretMin &&
    constraints.fretMax &&
    constraints.fretMin > constraints.fretMax
  ) {
    conflicts.push('Minimum fret cannot be higher than maximum fret');
    suggestions.push('Check your fret range values');
  }

  // Piano-specific validations
  if (instrument === 'piano') {
    if (constraints.fretMin || constraints.fretMax || constraints.stringRange) {
      conflicts.push('Fret and string constraints do not apply to piano');
      suggestions.push('Use register constraints for piano instead');
    }
  }

  // Guitar/Bass-specific validations
  if (
    (instrument === 'guitar' || instrument === 'bass') &&
    constraints.register
  ) {
    conflicts.push('Register constraints are for piano only');
    suggestions.push('Use fret range constraints for guitar/bass');
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    suggestions,
  };
}
