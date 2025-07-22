import React, { useState, useEffect } from 'react';
import { ChordShape, VoicingSet, getVoicingsForInstrument, getChordShapesForRoot } from '@/lib/voicings';
import { ChordDiagram } from './ChordDiagram';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Music, Volume2 } from 'lucide-react';

interface VoicingViewProps {
  selectedVoicing: string;
  instrument: 'guitar' | 'piano';
  tuning: string[];
  currentKey?: string;
  onBack: () => void;
  onPlayChord?: (chord: ChordShape) => void;
}

export function VoicingView({ 
  selectedVoicing, 
  instrument, 
  tuning,
  currentKey,
  onBack,
  onPlayChord 
}: VoicingViewProps) {
  const [selectedRoot, setSelectedRoot] = useState<string>(currentKey || 'C');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const voicings = getVoicingsForInstrument(instrument);
  const voicingSet = voicings[selectedVoicing];

  // Update selected root when current key changes
  useEffect(() => {
    if (currentKey) {
      setSelectedRoot(currentKey);
    }
  }, [currentKey]);

  if (!voicingSet) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400">Voicing set not found</p>
        <Button onClick={onBack} className="mt-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const chordShapes = getChordShapesForRoot(voicingSet, selectedRoot);

  // Available root notes
  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handlePlayChord = (chord: ChordShape) => {
    if (onPlayChord) {
      onPlayChord(chord);
    } else {
      // Fallback: basic audio feedback
      console.log(`Playing chord: ${chord.name}`);
    }
  };

  const getDifficultyStats = () => {
    const stats = { beginner: 0, intermediate: 0, advanced: 0 };
    chordShapes.forEach(chord => {
      stats[chord.difficulty]++;
    });
    return stats;
  };

  const difficultyStats = getDifficultyStats();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="h-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Music className="w-5 h-5" />
              {selectedVoicing}
            </h2>
            <p className="text-gray-400 text-sm">{voicingSet.description}</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Root Note Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Root:</span>
            <Select value={selectedRoot} onValueChange={setSelectedRoot}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rootNotes.map(note => (
                  <SelectItem key={note} value={note}>
                    {note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-gray-700">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 rounded-r-none"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 rounded-l-none"
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {chordShapes.length} chord{chordShapes.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                {difficultyStats.beginner > 0 && (
                  <Badge variant="outline" className="bg-green-600 text-white text-xs">
                    {difficultyStats.beginner} Beginner
                  </Badge>
                )}
                {difficultyStats.intermediate > 0 && (
                  <Badge variant="outline" className="bg-yellow-600 text-white text-xs">
                    {difficultyStats.intermediate} Intermediate  
                  </Badge>
                )}
                {difficultyStats.advanced > 0 && (
                  <Badge variant="outline" className="bg-red-600 text-white text-xs">
                    {difficultyStats.advanced} Advanced
                  </Badge>
                )}
              </div>
            </div>
            {instrument === 'guitar' && (
              <span className="text-sm text-gray-400">
                Tuning: {tuning.join('-')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chord Shapes Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {chordShapes.map((chord, index) => (
            <ChordDiagram
              key={`${chord.name}-${index}`}
              chord={chord}
              tuning={tuning}
              size="small"
              showPlayButton={true}
              onPlay={handlePlayChord}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {chordShapes.map((chord, index) => (
            <Card key={`${chord.name}-${index}`} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <ChordDiagram
                    chord={chord}
                    tuning={tuning}
                    size="medium"
                    showPlayButton={true}
                    onPlay={handlePlayChord}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{chord.name}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlayChord(chord)}
                        className="h-8"
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gray-700 text-gray-300">
                          {chord.quality}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`text-white ${
                            chord.difficulty === 'beginner' ? 'bg-green-600' :
                            chord.difficulty === 'intermediate' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                        >
                          {chord.difficulty}
                        </Badge>
                      </div>
                      
                      {/* Fret positions */}
                      <div className="text-sm text-gray-400">
                        <span className="font-medium">Frets: </span>
                        {chord.frets.map((fret, i) => (
                          <span key={i} className="mr-1">
                            {fret === null ? 'X' : fret === 0 ? 'O' : fret}
                          </span>
                        ))}
                      </div>
                      
                      {/* Finger positions */}
                      <div className="text-sm text-gray-400">
                        <span className="font-medium">Fingers: </span>
                        {chord.fingers.map((finger, i) => (
                          <span key={i} className="mr-1">
                            {finger === null ? '-' : finger === 0 ? 'O' : finger}
                          </span>
                        ))}
                      </div>

                      {/* Barre information */}
                      {chord.barres && chord.barres.length > 0 && (
                        <div className="text-sm text-gray-400">
                          <span className="font-medium">Barre: </span>
                          {chord.barres.map((barre, i) => (
                            <span key={i}>
                              Fret {barre.fret} (strings {barre.fromString + 1}-{barre.toString + 1})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chordShapes.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No Chords Available</h3>
            <p className="text-gray-500">
              No chord shapes found for {selectedVoicing} in {selectedRoot}. 
              Try a different root note or voicing type.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VoicingView;