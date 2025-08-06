'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ChordInfo, NoteName } from '@/lib/music-theory';

interface PianoKey {
  note: string;
  isBlack: boolean;
  isActive: boolean;
  isRoot: boolean;
}

interface MusicVisualizerPanelProps {
  selectedInstrument: string;
  onInstrumentChange: (value: string) => void;
  selectedChord: string;
  onChordChange: (value: string) => void;
  selectedMode: string;
  onModeChange: (value: string) => void;
  visualizerView: 'guitar' | 'piano';
  onVisualizerViewChange: (view: 'guitar' | 'piano') => void;
  selectedTuning: string;
  onTuningChange: (value: string) => void;
  fretboardFlipped: boolean;
  onFretboardFlip: () => void;
  generateScaleNotes: () => string[];
  generateFretboardNotes: () => string[][];
  generateChords: () => ChordInfo[];
  generatePianoKeys: () => PianoKey[];
}

export function MusicVisualizerPanel({
  selectedInstrument,
  onInstrumentChange,
  selectedChord,
  onChordChange,
  selectedMode,
  onModeChange,
  visualizerView,
  onVisualizerViewChange,
  selectedTuning,
  onTuningChange,
  fretboardFlipped,
  onFretboardFlip,
  generateScaleNotes,
  generateFretboardNotes,
  generateChords,
  generatePianoKeys,
}: MusicVisualizerPanelProps) {
  const notes: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const modes = [
    'major',
    'minor',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
    'harmonicMinor',
    'melodicMinor',
  ];

  const tunings = [
    { value: 'standard', label: 'Standard (E-A-D-G-B-E)' },
    { value: 'dropD', label: 'Drop D (D-A-D-G-B-E)' },
    { value: 'openG', label: 'Open G (D-G-D-G-B-D)' },
    { value: 'dadgad', label: 'DADGAD (D-A-D-G-A-D)' },
  ];

  const scaleNotes = generateScaleNotes();
  const fretboardNotes = generateFretboardNotes();
  const chords = generateChords();
  const pianoKeys = generatePianoKeys();

  return (
    <Card className="bg-zinc-900/95 backdrop-blur-sm border-zinc-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">
          Music Theory Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Instrument</Label>
            <Select
              value={selectedInstrument}
              onValueChange={onInstrumentChange}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="guitar" className="text-white">
                  Guitar
                </SelectItem>
                <SelectItem value="keyboard" className="text-white">
                  Keyboard
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Root Note</Label>
            <Select value={selectedChord} onValueChange={onChordChange}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {notes.map(note => (
                  <SelectItem key={note} value={note} className="text-white">
                    {note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Mode/Scale</Label>
            <Select value={selectedMode} onValueChange={onModeChange}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {modes.map(mode => (
                  <SelectItem key={mode} value={mode} className="text-white">
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">View</Label>
            <div className="flex gap-2">
              <Button
                variant={visualizerView === 'guitar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onVisualizerViewChange('guitar')}
                className="flex-1"
              >
                Guitar
              </Button>
              <Button
                variant={visualizerView === 'piano' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onVisualizerViewChange('piano')}
                className="flex-1"
              >
                Piano
              </Button>
            </div>
          </div>
        </div>

        {/* Guitar specific controls */}
        {visualizerView === 'guitar' && (
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Tuning</Label>
              <Select value={selectedTuning} onValueChange={onTuningChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {tunings.map(tuning => (
                    <SelectItem
                      key={tuning.value}
                      value={tuning.value}
                      className="text-white"
                    >
                      {tuning.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Fretboard View</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={onFretboardFlip}
                className="flex items-center gap-2"
              >
                {fretboardFlipped ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                {fretboardFlipped ? 'Standard' : 'Flipped'}
              </Button>
            </div>
          </div>
        )}

        {/* Scale Notes Display */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Scale Notes</Label>
          <div className="flex flex-wrap gap-2">
            {scaleNotes.map((note, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                {note}
              </div>
            ))}
          </div>
        </div>

        {/* Chords Display */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Diatonic Chords</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {chords.map((chord, index) => (
              <div
                key={index}
                className="p-2 bg-zinc-800 border border-zinc-700 rounded-md text-center"
              >
                <div className="text-white font-medium">{chord.name}</div>
                <div className="text-zinc-400 text-xs">
                  {chord.romanNumeral}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visualizer */}
        {visualizerView === 'guitar' ? (
          <div className="space-y-2">
            <Label className="text-zinc-300">Fretboard</Label>
            <div className="overflow-x-auto bg-zinc-800 p-4 rounded-lg">
              <div className="min-w-[600px]">
                {fretboardNotes.map((string, stringIndex) => (
                  <div key={stringIndex} className="flex mb-1">
                    {string.map((note, fretIndex) => {
                      const isScaleNote = scaleNotes.includes(note);
                      const isRoot = note === selectedChord;
                      return (
                        <div
                          key={fretIndex}
                          className={`w-10 h-6 border border-zinc-600 flex items-center justify-center text-xs font-mono ${
                            isRoot
                              ? 'bg-red-500 text-white'
                              : isScaleNote
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {fretIndex === 0 ? '|' : note}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-zinc-300">Piano Keys</Label>
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex">
                  {pianoKeys.map((key, index) => (
                    <div
                      key={index}
                      className={`
                        ${
                          key.isBlack
                            ? 'w-6 h-20 bg-zinc-900 border border-zinc-600 -ml-3 -mr-3 z-10'
                            : 'w-8 h-32 bg-white border border-zinc-300'
                        }
                        ${
                          key.isActive
                            ? key.isRoot
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                            : ''
                        }
                        flex items-end justify-center pb-2 text-xs font-mono relative
                      `}
                    >
                      <span
                        className={`${key.isBlack ? 'text-white' : 'text-black'}`}
                      >
                        {key.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
