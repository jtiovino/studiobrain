import React from 'react';
import { ChordShape } from '@/lib/voicings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ChordDiagramProps {
  chord: ChordShape;
  tuning?: string[];
  showPlayButton?: boolean;
  onPlay?: (chord: ChordShape) => void;
  size?: 'small' | 'medium' | 'large';
}

export function ChordDiagram({
  chord,
  tuning = ['E', 'A', 'D', 'G', 'B', 'E'],
  showPlayButton = false,
  onPlay,
  size = 'medium',
}: ChordDiagramProps) {
  const sizeClasses = {
    small: {
      container: 'w-24 h-32',
      fret: 'w-3 h-4',
      text: 'text-xs',
      spacing: 'gap-0.5',
      finger: 'w-2 h-2 text-xs',
    },
    medium: {
      container: 'w-32 h-40',
      fret: 'w-4 h-5',
      text: 'text-sm',
      spacing: 'gap-1',
      finger: 'w-3 h-3 text-xs',
    },
    large: {
      container: 'w-40 h-48',
      fret: 'w-5 h-6',
      text: 'text-base',
      spacing: 'gap-1.5',
      finger: 'w-4 h-4 text-sm',
    },
  };

  const classes = sizeClasses[size];

  // Get the minimum and maximum fret positions (excluding nulls and 0s)
  const activeFrets = chord.frets.filter(
    (f): f is number => f !== null && f > 0
  );
  const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 1;
  const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 4;

  // Show 4-5 frets, starting from minFret if it's > 1
  const startFret = minFret > 1 ? minFret : 1;
  const endFret = Math.max(startFret + 3, maxFret);
  const fretRange = Array.from(
    { length: endFret - startFret + 1 },
    (_, i) => startFret + i
  );

  // Reverse tuning to match standard guitar orientation (high E at bottom)
  const displayTuning = [...tuning].reverse();
  const displayFrets = [...chord.frets].reverse();
  const displayFingers = [...chord.fingers].reverse();

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

  const getFingerDot = (stringIndex: number, fretNumber: number) => {
    const fretPos = displayFrets[stringIndex];
    const fingerPos = displayFingers[stringIndex];

    if (fretPos === fretNumber && fretPos !== null && fretPos > 0) {
      return (
        <div
          className={`${classes.finger} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
        >
          {fingerPos && fingerPos > 0 ? fingerPos : ''}
        </div>
      );
    }
    return null;
  };

  const getStringStatus = (stringIndex: number) => {
    const fretPos = displayFrets[stringIndex];
    if (fretPos === null) return 'X'; // Muted
    if (fretPos === 0) return '○'; // Open
    return ''; // Fretted
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Chord Name and Info */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className={`font-semibold text-white ${classes.text}`}>
            {chord.name}
          </h4>
          <Badge
            variant="outline"
            className={`${getDifficultyColor(chord.difficulty)} text-white text-xs mt-1`}
          >
            {chord.difficulty}
          </Badge>
        </div>
        {showPlayButton && onPlay && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlay(chord)}
            className="h-6 w-6 p-0"
            title={`Play ${chord.name}`}
          >
            <Play className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Chord Diagram */}
      <div
        className={`${classes.container} relative bg-gray-900 rounded border`}
      >
        {/* Fret position indicator */}
        {startFret > 1 && (
          <div className="absolute -left-6 top-2 text-xs text-gray-400">
            {startFret}fr
          </div>
        )}

        {/* String status indicators (muted/open) */}
        <div
          className={`flex justify-between px-2 py-1 ${classes.text} text-gray-300`}
        >
          {displayFrets.map((fret, stringIndex) => (
            <span key={stringIndex} className="font-mono">
              {getStringStatus(stringIndex)}
            </span>
          ))}
        </div>

        {/* Fretboard Grid */}
        <div className="flex-1 relative">
          {/* Strings (vertical lines) */}
          {displayTuning.map((_, stringIndex) => (
            <div
              key={stringIndex}
              className="absolute top-0 bottom-0 w-px bg-gray-600"
              style={{
                left: `${(stringIndex * 100) / (displayTuning.length - 1)}%`,
              }}
            />
          ))}

          {/* Frets (horizontal lines) */}
          {fretRange.map((fretNumber, fretIndex) => (
            <div
              key={fretNumber}
              className="absolute left-0 right-0 h-px bg-gray-600"
              style={{ top: `${(fretIndex * 100) / fretRange.length}%` }}
            />
          ))}

          {/* Finger positions */}
          {fretRange.map((fretNumber, fretIndex) =>
            displayTuning.map((_, stringIndex) => (
              <div
                key={`${fretNumber}-${stringIndex}`}
                className="absolute"
                style={{
                  left: `${(stringIndex * 100) / (displayTuning.length - 1)}%`,
                  top: `${(fretIndex * 100) / fretRange.length}%`,
                  width: `${100 / (displayTuning.length - 1)}%`,
                  height: `${100 / fretRange.length}%`,
                }}
              >
                {getFingerDot(stringIndex, fretNumber)}
              </div>
            ))
          )}

          {/* Barre indicators */}
          {chord.barres?.map((barre, index) => {
            const barreInRange =
              barre.fret >= startFret && barre.fret <= endFret;
            if (!barreInRange) return null;

            const fretIndex = barre.fret - startFret;
            const startStringIndex = displayTuning.length - 1 - barre.toString;
            const endStringIndex = displayTuning.length - 1 - barre.fromString;

            return (
              <div
                key={index}
                className="absolute bg-blue-500 opacity-50 rounded-full"
                style={{
                  left: `${(startStringIndex * 100) / (displayTuning.length - 1)}%`,
                  top: `${(fretIndex * 100) / fretRange.length + 50 / fretRange.length - 5}%`,
                  width: `${((endStringIndex - startStringIndex) * 100) / (displayTuning.length - 1)}%`,
                  height: '10%',
                }}
              />
            );
          })}
        </div>

        {/* String names at bottom */}
        <div
          className={`flex justify-between px-2 py-1 ${classes.text} text-gray-400`}
        >
          {displayTuning.map((note, index) => (
            <span key={index} className="font-mono">
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChordDiagram;
