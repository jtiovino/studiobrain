'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  StickyNote,
  MessageCircle,
} from 'lucide-react';
import { PracticeTimer } from './PracticeTimer';
import { PracticeChatPanel } from './PracticeChatPanel';
import {
  Step,
  PracticeSessionState,
  PracticeStepState,
} from '@/lib/practice-plan-schema';

interface PracticeStepCardProps {
  step: Step;
  stepIndex: number;
  totalSteps: number;
  stepState: PracticeStepState;
  practiceSession: PracticeSessionState;
  lessonMode: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onComplete: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onStopTimer: () => void;
  onResetTimer: () => void;
  onTimeUpdate: (seconds: number) => void;
  onNotesChange: (notes: string) => void;
  className?: string;
}

export const PracticeStepCard: React.FC<PracticeStepCardProps> = ({
  step,
  stepIndex,
  totalSteps,
  stepState,
  practiceSession,
  lessonMode,
  onPrevious,
  onNext,
  onComplete,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onResetTimer,
  onTimeUpdate,
  onNotesChange,
  className = '',
}) => {
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const isCurrentStep = stepIndex === practiceSession.currentStepIndex;
  const canGoNext = stepIndex < totalSteps - 1;
  const canGoPrevious = stepIndex > 0;

  return (
    <Card
      className={`bg-glass-bg/50 backdrop-blur-xl border border-glass-border ${className}`}
    >
      {/* Header with navigation */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-200 ${
                stepState.isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : isCurrentStep
                    ? lessonMode
                      ? 'border-neon-cyan text-neon-cyan'
                      : 'border-neon-purple text-neon-purple'
                    : 'border-slate-600 text-slate-400'
              }`}
            >
              {stepState.isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="text-sm font-bold">{stepIndex + 1}</span>
              )}
            </div>

            <CardTitle
              className={`text-lg ${isCurrentStep ? 'text-slate-200' : 'text-slate-400'}`}
            >
              {step.name}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-glass-bg border-glass-border"
            >
              {step.minutes} min
            </Badge>

            {/* Step Status */}
            {stepState.isCompleted && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="text-xs text-slate-500">
            Step {stepIndex + 1} of {totalSteps}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer - only show for current step */}
        {isCurrentStep && (
          <PracticeTimer
            isActive={stepState.isActive}
            isPaused={practiceSession.isPaused}
            timeSpent={stepState.timeSpent}
            targetMinutes={step.minutes}
            onStart={onStartTimer}
            onPause={onPauseTimer}
            onStop={onStopTimer}
            onReset={onResetTimer}
            onTimeUpdate={onTimeUpdate}
            lessonMode={lessonMode}
            size="medium"
          />
        )}

        {/* Instructions */}
        <div className="space-y-3">
          <div className="text-slate-300 text-sm leading-relaxed">
            {step.instructions}
          </div>

          {/* TAB Snippet */}
          {step.tab_snippet && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">TAB:</div>
              <pre className="text-sm font-mono text-slate-200 whitespace-pre-wrap">
                {step.tab_snippet}
              </pre>
            </div>
          )}

          {/* Diagrams */}
          {step.diagrams.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Diagrams:
              </div>
              <div className="flex flex-wrap gap-2">
                {step.diagrams.map((diagram, diagramIndex) => (
                  <Badge
                    key={diagramIndex}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    {diagram.type === 'scale' && '🎵'}
                    {diagram.type === 'arp' && '🎶'}
                    {diagram.type === 'voicing' && '🎸'}
                    {diagram.name} ({diagram.position_label})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Lesson Mode Fields */}
          {lessonMode && (step.why || step.success_cue) && (
            <div className="grid gap-3 mt-4 pt-3 border-t border-glass-border">
              {step.why && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-neon-cyan uppercase tracking-wide">
                    <AlertCircle className="w-3 h-3" />
                    Why This Matters
                  </div>
                  <div className="text-sm text-slate-300 pl-5">{step.why}</div>
                </div>
              )}

              {step.success_cue && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-neon-cyan uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" />
                    Success Indicator
                  </div>
                  <div className="text-sm text-slate-300 pl-5">
                    {step.success_cue}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="text-slate-400 hover:text-slate-200 p-0 h-auto font-normal"
          >
            <StickyNote className="w-3 h-3 mr-1" />
            {showNotes ? 'Hide' : 'Add'} Notes
          </Button>

          {showNotes && (
            <Textarea
              value={stepState.notes || ''}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Add your notes about this step..."
              className="bg-glass-bg border-glass-border text-slate-200 placeholder:text-slate-400 resize-none"
              rows={3}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* Time spent indicator */}
            {stepState.timeSpent > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  {Math.floor(stepState.timeSpent / 60)}:
                  {(stepState.timeSpent % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCurrentStep && (
              <Button
                onClick={onComplete}
                disabled={stepState.isCompleted}
                className={`transition-all duration-200 ${
                  stepState.isCompleted
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : lessonMode
                      ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/30'
                      : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'
                }`}
              >
                {stepState.isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 mr-1" />
                    Mark Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Chat Panel - only show for current step */}
        {isCurrentStep && (
          <PracticeChatPanel
            practiceSession={practiceSession}
            currentStep={step}
            lessonMode={lessonMode}
            isExpanded={isChatExpanded}
            onToggle={() => setIsChatExpanded(!isChatExpanded)}
          />
        )}
      </CardContent>
    </Card>
  );
};
