'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import type { VoicingShape } from '@/lib/voicing-explorer-types';

interface VoicingFretboardProps {
  voicing: VoicingShape;
  tuning?: string[];
  lessonMode?: boolean;
}

export function VoicingFretboard({
  voicing,
  tuning = ['E', 'A', 'D', 'G', 'B', 'E'],
  lessonMode = false,
}: VoicingFretboardProps) {
  // Only render for guitar/bass voicings with frets
  if (
    !voicing.frets ||
    (voicing.instrument !== 'guitar' && voicing.instrument !== 'bass')
  ) {
    return null;
  }

  // Generate fretboard notes for visualization
  const generateFretboardNotes = (): string[][] => {
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
    const stringNotes: string[][] = [];

    // Calculate fret range - show wider range than compact version
    const playedFrets = voicing.frets!.filter(
      f => f !== null && f > 0
    ) as number[];
    const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
    const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 4;
    const startFret = Math.max(0, minFret - 1);
    const endFret = Math.max(12, maxFret + 2);

    tuning.forEach((stringNote, _stringIndex) => {
      const notes: string[] = [];
      const baseNoteIndex = noteNames.indexOf(stringNote);

      for (let fret = startFret; fret <= endFret; fret++) {
        const noteIndex = (baseNoteIndex + fret) % 12;
        notes.push(noteNames[noteIndex]);
      }

      stringNotes.push(notes);
    });

    return stringNotes;
  };

  const fretboardNotes = generateFretboardNotes();
  const playedFrets = voicing.frets!.filter(
    f => f !== null && f > 0
  ) as number[];
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
  const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 4;
  const startFret = Math.max(0, minFret - 1);
  const endFret = Math.max(12, maxFret + 2);
  const fretRange = Array.from(
    { length: endFret - startFret + 1 },
    (_, i) => startFret + i
  );

  return (
    <div className="space-y-4">
      <Label
        className={`text-base font-medium ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
      >
        Fretboard Diagram
      </Label>

      {/* Fret position indicator */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-muted-foreground">
          Fret positions: {startFret} - {endFret}
        </div>
        {startFret > 0 && (
          <div className="text-xs text-muted-foreground">
            Starting at {startFret}fr
          </div>
        )}
      </div>

      {/* String status indicators */}
      <div className="flex justify-center mb-2">
        <div className="min-w-[700px] flex justify-between px-4">
          {voicing
            .frets!.slice()
            .reverse()
            .map((fret, stringIndex) => {
              const status = fret === null ? 'X' : fret === 0 ? 'O' : '';
              return (
                <div key={stringIndex} className="text-center">
                  <div className="text-foreground font-mono text-sm font-bold">
                    {status}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {tuning.slice().reverse()[stringIndex]}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Main fretboard visualization */}
      <div className="overflow-x-auto bg-glass-bg backdrop-blur-xl p-6 rounded-xl border border-glass-border shadow-lg">
        <div className="min-w-[700px] relative">
          {fretboardNotes
            .slice()
            .reverse()
            .map((string, stringIndex) => (
              <div key={stringIndex} className="flex mb-1">
                {string.map((note, fretIndex) => {
                  const actualFret = startFret + fretIndex;
                  const reversedStringIndex = tuning.length - 1 - stringIndex;
                  const voicingFret = voicing.frets![reversedStringIndex];
                  const isPressed = voicingFret === actualFret;
                  const isRoot = note === voicing.root && isPressed;
                  const isOpen = voicingFret === 0 && actualFret === 0;
                  const isMuted = voicing.frets![reversedStringIndex] === null;
                  const fingerNumber = voicing.fingers?.[reversedStringIndex];

                  return (
                    <div
                      key={fretIndex}
                      className={`
                      w-14 h-10 border border-glass-border flex items-center justify-center text-sm font-mono font-semibold
                      ${
                        isPressed || isOpen
                          ? isRoot
                            ? `${lessonMode ? 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/30' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/30'}`
                            : `${lessonMode ? 'bg-neon-cyan/60 text-black shadow-md' : 'bg-neon-purple/60 text-white shadow-md'}`
                          : isMuted
                            ? 'bg-glass-bg/50 text-muted-foreground/50'
                            : 'bg-glass-bg/80 text-muted-foreground'
                      }
                      ${isPressed || isOpen ? `ring-2 ${lessonMode ? 'ring-neon-cyan/50' : 'ring-neon-purple/50'}` : ''}
                      transition-all duration-200
                    `}
                    >
                      {actualFret === 0 ? (
                        <span className="text-foreground font-bold">|</span>
                      ) : isPressed || isOpen ? (
                        fingerNumber && fingerNumber > 0 ? (
                          <span className="text-xs font-bold">
                            {fingerNumber}
                          </span>
                        ) : (
                          <span className="text-lg">●</span>
                        )
                      ) : (
                        <span className="text-xs opacity-70">{note}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>

      {/* Fret numbers at bottom */}
      <div className="flex justify-center">
        <div className="min-w-[700px] flex justify-between px-4">
          {fretRange.map((fret, index) => (
            <div key={index} className="text-center">
              <div className="text-muted-foreground text-xs">{fret}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center mt-6">
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded ${lessonMode ? 'bg-neon-cyan' : 'bg-neon-purple'}`}
            ></div>
            <span className="text-muted-foreground">Root Note</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded ${lessonMode ? 'bg-neon-cyan/60' : 'bg-neon-purple/60'}`}
            ></div>
            <span className="text-muted-foreground">Chord Tone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-glass-bg/80 rounded border border-glass-border"></div>
            <span className="text-muted-foreground">Available Note</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono font-bold">X</span>
            <span className="text-muted-foreground">Muted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono font-bold">O</span>
            <span className="text-muted-foreground">Open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoicingFretboard;
