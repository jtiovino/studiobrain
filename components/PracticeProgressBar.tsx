'use client';

import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { PracticeSessionState } from '@/lib/practice-plan-schema';

interface PracticeProgressBarProps {
  session: PracticeSessionState;
  lessonMode: boolean;
  className?: string;
}

export const PracticeProgressBar: React.FC<PracticeProgressBarProps> = ({
  session,
  lessonMode,
  className = '',
}) => {
  const completedSteps = session.stepStates.filter(
    step => step.isCompleted
  ).length;
  const totalSteps = session.stepStates.length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const totalMinutes = Math.floor(session.totalTimeSpent / 60);
  const currentStepTime = Math.floor(
    (session.stepStates[session.currentStepIndex]?.timeSpent || 0) / 60
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">
            Step {session.currentStepIndex + 1} of {totalSteps}
          </span>
          <span className="text-slate-400">
            {completedSteps}/{totalSteps} completed
          </span>
        </div>
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-slate-600/30"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Practice progress: ${completedSteps} of ${totalSteps} steps completed`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              lessonMode ? 'bg-cyan-400' : 'bg-purple-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Time and Status */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Session: {totalMinutes}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Current: {currentStepTime}m</span>
          </div>
        </div>

        {session.isCompleted && (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Complete!</span>
          </div>
        )}

        {session.isPaused && (
          <div
            className={`flex items-center gap-1 ${lessonMode ? 'text-cyan-400' : 'text-purple-400'}`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>Paused</span>
          </div>
        )}
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-1">
        {session.stepStates.map((step, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              step.isCompleted
                ? 'bg-green-500'
                : index === session.currentStepIndex
                  ? lessonMode
                    ? 'bg-cyan-500'
                    : 'bg-purple-500'
                  : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
