'use client';

import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Music, Loader2, AlertCircle, Guitar, Piano } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserStore } from '@/lib/useUserStore';
import type {
  VoicingResponse,
  VoicingShape,
  Instrument,
  ChordInput,
} from '@/lib/voicing-explorer-types';
import { CompactFretboard } from '@/components/CompactFretboard';

interface VoicingExplorerProps {
  lessonMode: boolean;
  onVoicingSelect?: (voicing: VoicingShape) => void;
}

export interface VoicingExplorerRef {
  generateFromChat: (data: {
    instrument: Instrument;
    chordInput: ChordInput;
    naturalLanguage?: string;
  }) => void;
}

interface CompactVoicingProps {
  voicing: VoicingShape;
  lessonTip?: string;
  lessonMode: boolean;
  onClick: () => void;
}

function CompactVoicing({
  voicing,
  lessonTip,
  lessonMode,
  onClick,
}: CompactVoicingProps) {
  // For guitar/bass voicings, use CompactFretboard
  if (
    (voicing.instrument === 'guitar' || voicing.instrument === 'bass') &&
    voicing.frets
  ) {
    return (
      <CompactFretboard
        voicing={voicing}
        lessonTip={lessonTip}
        lessonMode={lessonMode}
        onClick={onClick}
        size="small"
      />
    );
  }

  // For piano voicings, show a simple compact card
  if (voicing.instrument === 'piano' && voicing.notes) {
    return (
      <div
        className="flex flex-col items-center space-y-2 cursor-pointer"
        onClick={onClick}
      >
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors w-32">
          <div className="text-center">
            <h4 className="font-semibold text-white text-sm mb-2">
              {voicing.name}
            </h4>
            <div className="flex flex-wrap gap-1 justify-center">
              {voicing.notes.slice(0, 4).map((note, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs font-mono"
                >
                  {note.note}
                  {note.octave}
                </Badge>
              ))}
            </div>
            <Badge
              variant="outline"
              className="text-xs mt-2 text-blue-400 border-blue-400"
            >
              {voicing.difficulty}
            </Badge>
          </div>
        </div>
        {lessonMode && lessonTip && (
          <div className="text-xs text-neon-cyan text-center max-w-32 leading-tight">
            {lessonTip}
          </div>
        )}
      </div>
    );
  }

  return null;
}

const VoicingExplorer = forwardRef<VoicingExplorerRef, VoicingExplorerProps>(
  ({ lessonMode, onVoicingSelect }, ref) => {
    const { mainInstrument } = useUserStore();

    const [instrument, setInstrument] = useState<Instrument>(
      mainInstrument as Instrument
    );
    const [chordRoot, setChordRoot] = useState('C');
    const [chordQuality, setChordQuality] = useState('major');
    const [chordExtension, setChordExtension] = useState('');
    const [literalChord, setLiteralChord] = useState('');
    const [useLiteral, setUseLiteral] = useState(false);
    const [fretMin, setFretMin] = useState('1');
    const [fretMax, setFretMax] = useState('12');
    const [register, setRegister] = useState<'low' | 'mid' | 'high'>('mid');

    const [isLoading, setIsLoading] = useState(false);
    const [voicings, setVoicings] = useState<VoicingShape[]>([]);
    const [lessonTips, setLessonTips] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleGenerate = useCallback(
      async (naturalLanguage?: string) => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);

        try {
          const chordInput: ChordInput =
            useLiteral || literalChord
              ? {
                  literal:
                    literalChord ||
                    `${chordRoot}${chordQuality}${chordExtension}`,
                }
              : {
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
              register: instrument === 'piano' ? register : undefined,
            },
            count: 4,
            lessonMode,
            naturalLanguage,
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
          setLessonTips(result.lessonTips || {});

          if (result.metadata.suggestions?.length) {
            setSuggestions(result.metadata.suggestions);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An unknown error occurred';
          setError(errorMessage);
          setVoicings([]);
          setLessonTips({});
        } finally {
          setIsLoading(false);
        }
      },
      [
        instrument,
        chordRoot,
        chordQuality,
        chordExtension,
        literalChord,
        useLiteral,
        fretMin,
        fretMax,
        register,
        lessonMode,
      ]
    );

    // Expose method for chat integration
    useImperativeHandle(
      ref,
      () => ({
        generateFromChat: (data: {
          instrument: Instrument;
          chordInput: ChordInput;
          naturalLanguage?: string;
        }) => {
          if (data.instrument !== instrument) setInstrument(data.instrument);
          if (data.chordInput.literal) {
            setLiteralChord(data.chordInput.literal);
            setUseLiteral(true);
          } else if (data.chordInput.root) {
            setChordRoot(data.chordInput.root);
            setChordQuality(data.chordInput.quality || 'major');
            setChordExtension(data.chordInput.extension || '');
            setUseLiteral(false);
          }
          handleGenerate(data.naturalLanguage);
        },
      }),
      [instrument, handleGenerate]
    );

    const handleVoicingClick = (voicing: VoicingShape) => {
      onVoicingSelect?.(voicing);
    };

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
        <CardHeader className="pb-3">
          <CardTitle
            className={`flex items-center gap-2 text-lg font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
          >
            <div
              className={`p-1.5 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
            >
              <Music
                className={`w-4 h-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
              />
            </div>
            Voicing Explorer
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Generate chord voicings with smart constraints
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* Instrument */}
            <div className="space-y-1.5">
              <Label className="text-foreground font-medium text-sm">
                Instrument
              </Label>
              <Select
                value={instrument}
                onValueChange={(value: Instrument) => setInstrument(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guitar">
                    <div className="flex items-center gap-2">
                      <Guitar className="w-4 h-4" />
                      Guitar
                    </div>
                  </SelectItem>
                  <SelectItem value="piano">
                    <div className="flex items-center gap-2">
                      <Piano className="w-4 h-4" />
                      Piano
                    </div>
                  </SelectItem>
                  <SelectItem value="bass">Bass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chord Input */}
            {!useLiteral ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-foreground font-medium text-sm">
                    Root
                  </Label>
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

                <div className="space-y-1.5">
                  <Label className="text-foreground font-medium text-sm">
                    Quality
                  </Label>
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
              </>
            ) : (
              <div className="space-y-1.5 col-span-2">
                <Label className="text-foreground font-medium text-sm">
                  Chord
                </Label>
                <Input
                  value={literalChord}
                  onChange={e => setLiteralChord(e.target.value)}
                  placeholder="Cmaj7, Dm, F#m7b5..."
                />
              </div>
            )}

            {/* Range Controls */}
            {instrument !== 'piano' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-foreground font-medium text-sm">
                    Fret Min
                  </Label>
                  <Input
                    type="number"
                    value={fretMin}
                    onChange={e => setFretMin(e.target.value)}
                    min="0"
                    max="24"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground font-medium text-sm">
                    Fret Max
                  </Label>
                  <Input
                    type="number"
                    value={fretMax}
                    onChange={e => setFretMax(e.target.value)}
                    min="0"
                    max="24"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-sm">
                  Register
                </Label>
                <Select
                  value={register}
                  onValueChange={(value: 'low' | 'mid' | 'high') =>
                    setRegister(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Toggle and Generate */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseLiteral(!useLiteral)}
              className="text-xs"
            >
              {useLiteral ? 'Structured' : 'Literal'}
            </Button>

            <Button
              onClick={() => handleGenerate()}
              disabled={isLoading}
              size="sm"
              className={`${lessonMode ? 'bg-neon-cyan hover:bg-neon-cyan/80' : 'bg-neon-purple hover:bg-neon-purple/80'} text-black font-medium`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
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

          {/* Voicing Results */}
          {voicings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                Generated Voicings
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {voicings.map(voicing => (
                  <CompactVoicing
                    key={voicing.id}
                    voicing={voicing}
                    lessonTip={lessonTips[voicing.id]}
                    lessonMode={lessonMode}
                    onClick={() => handleVoicingClick(voicing)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && voicings.length === 0 && !error && (
            <div className="text-center py-6 text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Ready to explore voicings</p>
              <p className="text-xs">Configure your chord and click Generate</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

VoicingExplorer.displayName = 'VoicingExplorer';

export default VoicingExplorer;
