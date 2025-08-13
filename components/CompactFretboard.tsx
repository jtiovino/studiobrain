'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { VoicingShape } from '@/lib/voicing-explorer-types';

interface CompactFretboardProps {
  voicing: VoicingShape;
  lessonTip?: string;
  lessonMode: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium';
}

export function CompactFretboard({
  voicing,
  lessonTip,
  lessonMode,
  onClick,
  size = 'small',
}: CompactFretboardProps) {
  // Only render for guitar/bass voicings with frets
  if (
    !voicing.frets ||
    (voicing.instrument !== 'guitar' && voicing.instrument !== 'bass')
  ) {
    return null;
  }

  const sizeConfig = {
    small: {
      container: 'w-24 h-20',
      cell: 'w-3 h-3',
      text: 'text-xs',
      name: 'text-xs',
      badge: 'text-xs',
      tip: 'text-xs max-w-24',
    },
    medium: {
      container: 'w-32 h-24',
      cell: 'w-4 h-4',
      text: 'text-xs',
      name: 'text-sm',
      badge: 'text-xs',
      tip: 'text-xs max-w-32',
    },
  };

  const config = sizeConfig[size];

  // Calculate fret range - show 4 frets starting from the lowest played fret
  const playedFrets = voicing.frets!.filter(
    f => f !== null && f > 0
  ) as number[];
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
  const startFret = minFret > 1 ? minFret : 1;
  const fretRange = Array.from({ length: 4 }, (_, i) => startFret + i);

  // Standard guitar strings (low E to high E) - display top to bottom
  const stringCount = 6;
  const strings = Array.from({ length: stringCount }, (_, i) => i);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-600';
      case 'intermediate':
        return 'bg-yellow-600';
      case 'advanced':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={`bg-zinc-800 rounded-lg p-2 border border-zinc-700 hover:border-zinc-600 transition-colors ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        {/* Chord name and difficulty */}
        <div className="text-center mb-2">
          <div className={`font-semibold text-white ${config.name}`}>
            {voicing.name}
          </div>
          <Badge
            variant="outline"
            className={`${getDifficultyColor(voicing.difficulty)} text-white ${config.badge} mt-1`}
          >
            {voicing.difficulty}
          </Badge>
        </div>

        {/* Compact fretboard grid */}
        <div
          className={`${config.container} bg-zinc-900 rounded border relative overflow-hidden`}
        >
          {/* Fret position indicator */}
          {startFret > 1 && (
            <div className="absolute -left-5 top-1 text-xs text-zinc-400">
              {startFret}fr
            </div>
          )}

          {/* String status indicators at top */}
          <div className="flex justify-center mb-1">
            {voicing
              .frets!.slice()
              .reverse()
              .map((fret, stringIndex) => {
                const status = fret === null ? 'X' : fret === 0 ? 'O' : '';
                return (
                  <div
                    key={stringIndex}
                    className={`${config.cell} flex items-center justify-center ${config.text} text-zinc-300 font-mono`}
                  >
                    {status}
                  </div>
                );
              })}
          </div>

          {/* Fretboard grid */}
          <div className="relative">
            {fretRange.map((fretNumber, fretIndex) => (
              <div key={fretNumber} className="flex justify-center">
                {strings.map(stringIndex => {
                  // Reverse string order for display (string 5 = high E, string 0 = low E)
                  const reversedStringIndex = stringCount - 1 - stringIndex;
                  const fretValue = voicing.frets![reversedStringIndex];
                  const fingerValue = voicing.fingers?.[reversedStringIndex];

                  const isPressed = fretValue === fretNumber;
                  const isRoot = voicing.root && isPressed; // Simple root detection

                  return (
                    <div
                      key={stringIndex}
                      className={`
                        ${config.cell} border border-zinc-600 flex items-center justify-center ${config.text} font-mono
                        ${
                          isPressed
                            ? isRoot
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                            : 'bg-zinc-700 text-zinc-400'
                        }
                      `}
                    >
                      {fretIndex === 0
                        ? '|'
                        : isPressed
                          ? fingerValue && fingerValue > 0
                            ? fingerValue
                            : '●'
                          : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson tip */}
      {lessonMode && lessonTip && (
        <div
          className={`text-neon-cyan text-center leading-tight ${config.tip}`}
        >
          {lessonTip}
        </div>
      )}
    </div>
  );
}
