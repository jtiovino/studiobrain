'use client';

import React, { useState, useCallback } from 'react';
import { Music, Loader2, AlertCircle, Guitar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserStore } from '@/lib/useUserStore';
import type {
  VoicingResponse,
  VoicingShape,
  Instrument,
  ChordInput,
} from '@/lib/voicing-explorer-types';
import { VoicingFretboard } from '@/components/VoicingFretboard';

interface VoicingsModuleProps {
  lessonMode: boolean;
}

export default function VoicingsModule({ lessonMode }: VoicingsModuleProps) {
  const { mainInstrument, preferredTuning } = useUserStore();

  const [instrument, setInstrument] = useState<Instrument>(
    mainInstrument as Instrument
  );
  const [chordRoot, setChordRoot] = useState('C');
  const [chordQuality, setChordQuality] = useState('major');
  const [chordExtension, setChordExtension] = useState('');
  const [fretMin, setFretMin] = useState('1');
  const [fretMax, setFretMax] = useState('12');

  const [isLoading, setIsLoading] = useState(false);
  const [voicings, setVoicings] = useState<VoicingShape[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const chordInput: ChordInput = {
        root: chordRoot,
        quality: chordQuality,
        extension: chordExtension || undefined,
      };

      const requestBody = {
        instrument,
        chordInput,
        constraints: {
          useUserTuning: true,
          fretMin: instrument !== 'piano' ? parseInt(fretMin) : undefined,
          fretMax: instrument !== 'piano' ? parseInt(fretMax) : undefined,
        },
        count: 4,
        lessonMode,
      };

      const response = await fetch('/api/voicings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate voicings');
      }

      const result: VoicingResponse = await response.json();
      setVoicings(result.voicings);

      if (result.metadata.suggestions?.length) {
        setSuggestions(result.metadata.suggestions);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setVoicings([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    instrument,
    chordRoot,
    chordQuality,
    chordExtension,
    fretMin,
    fretMax,
    lessonMode,
  ]);

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
  const qualities = [
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: 'dominant7', label: '7' },
    { value: 'major7', label: 'maj7' },
    { value: 'minor7', label: 'm7' },
    { value: 'diminished', label: 'dim' },
    { value: 'augmented', label: 'aug' },
    { value: 'suspended4', label: 'sus4' },
    { value: 'suspended2', label: 'sus2' },
  ];

  return (
    <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
      <CardHeader className="pb-6">
        <CardTitle
          className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
        >
          <div
            className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
          >
            <Guitar
              className={`w-6 h-6 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
            />
          </div>
          Chord Voicing Assistant
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Generate and visualize chord voicings with readable fretboard diagrams
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Root Note */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Root</Label>
            <Select value={chordRoot} onValueChange={setChordRoot}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {notes.map(note => (
                  <SelectItem key={note} value={note}>
                    {note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Quality</Label>
            <Select value={chordQuality} onValueChange={setChordQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualities.map(quality => (
                  <SelectItem key={quality.value} value={quality.value}>
                    {quality.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extension */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Extension</Label>
            <Input
              value={chordExtension}
              onChange={e => setChordExtension(e.target.value)}
              placeholder="9, 11, 13..."
              className="bg-glass-bg border-glass-border"
            />
          </div>

          {/* Fret Range */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Fret Min</Label>
            <Input
              type="number"
              value={fretMin}
              onChange={e => setFretMin(e.target.value)}
              min="0"
              max="24"
              className="bg-glass-bg border-glass-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Fret Max</Label>
            <Input
              type="number"
              value={fretMax}
              onChange={e => setFretMax(e.target.value)}
              min="0"
              max="24"
              className="bg-glass-bg border-glass-border"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            size="lg"
            className={`px-8 font-semibold ${lessonMode ? 'bg-neon-cyan hover:bg-neon-cyan/80' : 'bg-neon-purple hover:bg-neon-purple/80'} text-black`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Voicings'
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Suggestions:</div>
                <ul className="list-disc list-inside space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Voicings Display with Readable Fretboards */}
        {voicings.length > 0 && (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-foreground">
              Generated Voicings
            </h3>
            <div className="space-y-12">
              {voicings.map((voicing, index) => (
                <div
                  key={voicing.id}
                  className="bg-glass-bg/30 backdrop-blur-sm p-6 rounded-xl border border-glass-border shadow-lg"
                >
                  <div className="space-y-6">
                    {/* Voicing Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-bold text-foreground">
                          {voicing.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-medium">
                            {voicing.position}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              voicing.difficulty === 'beginner'
                                ? 'bg-green-600/20 text-green-300'
                                : voicing.difficulty === 'intermediate'
                                  ? 'bg-yellow-600/20 text-yellow-300'
                                  : 'bg-red-600/20 text-red-300'
                            }`}
                          >
                            {voicing.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Voicing #{index + 1}
                        </div>
                        {voicing.playabilityScore && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Playability:{' '}
                            {Math.round(voicing.playabilityScore * 100)}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Readable Fretboard */}
                    <VoicingFretboard
                      voicing={voicing}
                      tuning={voicing.tuning || ['E', 'A', 'D', 'G', 'B', 'E']}
                    />

                    {/* Additional Info */}
                    {voicing.barres && voicing.barres.length > 0 && (
                      <div className="mt-4 p-4 bg-amber-600/10 border border-amber-600/20 rounded-lg">
                        <div className="text-amber-300 font-medium text-sm mb-1">
                          Barre Chord
                        </div>
                        <div className="text-amber-200/80 text-xs">
                          {voicing.barres.map((barre, i) => (
                            <span key={i}>
                              Barre fret {barre.fret} from string{' '}
                              {barre.fromString} to {barre.toString}
                              {i < voicing.barres!.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && voicings.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <Guitar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              Ready to generate chord voicings
            </p>
            <p className="text-sm">
              Choose a chord and click Generate Voicings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
