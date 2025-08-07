'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { PracticeProgressBar } from './PracticeProgressBar';
import { PracticeStepCard } from './PracticeStepCard';
import {
  PracticePlan,
  PracticeSessionState,
  PracticeStepState,
} from '@/lib/practice-plan-schema';
import { useChatHistoryStore } from '@/lib/useChatHistoryStore';

interface InteractivePracticeSessionProps {
  plan: PracticePlan;
  sessionId: string;
  lessonMode: boolean;
  onExitSession: () => void;
  className?: string;
}

export const InteractivePracticeSession: React.FC<
  InteractivePracticeSessionProps
> = ({ plan, sessionId, lessonMode, onExitSession, className = '' }) => {
  const getPracticeSession = useChatHistoryStore(
    state => state.getPracticeSession
  );
  const updatePracticeSession = useChatHistoryStore(
    state => state.updatePracticeSession
  );
  const updateStepState = useChatHistoryStore(state => state.updateStepState);

  const [session, setSession] = useState<PracticeSessionState | null>(null);
  const globalTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load session state
  useEffect(() => {
    const practiceSession = getPracticeSession(sessionId);
    if (practiceSession) {
      setSession(practiceSession);
    }
  }, [sessionId, getPracticeSession]);

  // Sync session state to store with functional update support
  const syncSessionToStore = useCallback(
    (
      updates:
        | Partial<PracticeSessionState>
        | ((prev: PracticeSessionState | null) => Partial<PracticeSessionState>)
    ) => {
      if (typeof updates === 'function') {
        setSession(prev => {
          if (!prev) return null;
          const computedUpdates = updates(prev);
          updatePracticeSession(sessionId, computedUpdates);
          return { ...prev, ...computedUpdates };
        });
      } else {
        updatePracticeSession(sessionId, updates);
        setSession(prev => (prev ? { ...prev, ...updates } : null));
      }
    },
    [sessionId, updatePracticeSession]
  );

  const syncStepToStore = useCallback(
    (stepIndex: number, stepUpdates: Partial<PracticeStepState>) => {
      updateStepState(sessionId, stepIndex, stepUpdates);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stepStates: prev.stepStates.map((state, index) =>
            index === stepIndex ? { ...state, ...stepUpdates } : state
          ),
        };
      });
    },
    [sessionId, updateStepState]
  );

  // Global session timer effect with proper cleanup
  useEffect(() => {
    // Clear any existing timer
    if (globalTimerRef.current) {
      clearInterval(globalTimerRef.current);
      globalTimerRef.current = undefined;
    }

    // Start new timer if conditions are met
    if (
      session &&
      session.stepStates[session.currentStepIndex]?.isActive &&
      !session.isPaused
    ) {
      globalTimerRef.current = setInterval(() => {
        // Use functional update to avoid dependency on session.totalTimeSpent
        setSession(prev => {
          if (!prev) return null;
          const updatedSession = {
            ...prev,
            totalTimeSpent: prev.totalTimeSpent + 1,
          };
          updatePracticeSession(sessionId, {
            totalTimeSpent: updatedSession.totalTimeSpent,
          });
          return updatedSession;
        });
      }, 1000);
    }

    return () => {
      if (globalTimerRef.current) {
        clearInterval(globalTimerRef.current);
        globalTimerRef.current = undefined;
      }
    };
  }, [
    session?.currentStepIndex,
    session?.isPaused,
    sessionId,
    updatePracticeSession,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (globalTimerRef.current) {
        clearInterval(globalTimerRef.current);
        globalTimerRef.current = undefined;
      }
    };
  }, []);

  // All hooks must be declared before any conditional returns
  const currentStep = useMemo(
    () => (session ? plan.steps[session.currentStepIndex] : null),
    [plan.steps, session?.currentStepIndex]
  );

  const currentStepState = useMemo(
    () => (session ? session.stepStates[session.currentStepIndex] : null),
    [session?.stepStates, session?.currentStepIndex]
  );

  const handlePreviousStep = useCallback(() => {
    if (!session || session.currentStepIndex <= 0) return;

    // Stop current step timer
    syncStepToStore(session.currentStepIndex, {
      isActive: false,
      startTime: undefined,
    });

    syncSessionToStore({
      currentStepIndex: session.currentStepIndex - 1,
      isPaused: true,
    });
  }, [session?.currentStepIndex, syncStepToStore, syncSessionToStore]);

  const handleNextStep = useCallback(() => {
    if (!session || session.currentStepIndex >= plan.steps.length - 1) return;

    // Stop current step timer
    syncStepToStore(session.currentStepIndex, {
      isActive: false,
      startTime: undefined,
    });

    syncSessionToStore({
      currentStepIndex: session.currentStepIndex + 1,
      isPaused: true,
    });
  }, [
    session?.currentStepIndex,
    plan.steps.length,
    syncStepToStore,
    syncSessionToStore,
  ]);

  const handleCompleteStep = useCallback(() => {
    if (!session) return;

    const currentIndex = session.currentStepIndex;

    // Mark current step as completed and stop its timer
    syncStepToStore(currentIndex, {
      isCompleted: true,
      isActive: false,
      startTime: undefined,
    });

    // Check if all steps are completed
    const updatedStepStates = [...session.stepStates];
    updatedStepStates[currentIndex] = {
      ...updatedStepStates[currentIndex],
      isCompleted: true,
    };

    const allCompleted = updatedStepStates.every(step => step.isCompleted);

    if (allCompleted) {
      syncSessionToStore({
        isCompleted: true,
        isPaused: true,
      });
    } else if (currentIndex < plan.steps.length - 1) {
      // Auto-advance to next step
      syncSessionToStore({
        currentStepIndex: currentIndex + 1,
        isPaused: true,
      });
    }
  }, [
    session?.currentStepIndex,
    session?.stepStates,
    plan.steps.length,
    syncStepToStore,
    syncSessionToStore,
  ]);

  const handleStartStepTimer = useCallback(() => {
    if (!session) return;

    syncStepToStore(session.currentStepIndex, {
      isActive: true,
      startTime: new Date(),
    });
    syncSessionToStore({
      isPaused: false,
    });
  }, [session?.currentStepIndex, syncStepToStore, syncSessionToStore]);

  const handlePauseStepTimer = useCallback(() => {
    if (!session) return;

    syncStepToStore(session.currentStepIndex, {
      isActive: false,
    });
    syncSessionToStore({
      isPaused: true,
    });
  }, [session?.currentStepIndex, syncStepToStore, syncSessionToStore]);

  const handleStopStepTimer = useCallback(() => {
    if (!session) return;

    syncStepToStore(session.currentStepIndex, {
      isActive: false,
      startTime: undefined,
    });
    syncSessionToStore({
      isPaused: true,
    });
  }, [session?.currentStepIndex, syncStepToStore, syncSessionToStore]);

  const handleResetStepTimer = useCallback(() => {
    if (!session) return;

    syncStepToStore(session.currentStepIndex, {
      isActive: false,
      timeSpent: 0,
      startTime: undefined,
    });
  }, [session?.currentStepIndex, syncStepToStore]);

  const handleStepTimeUpdate = useCallback(
    (seconds: number) => {
      if (!session) return;
      syncStepToStore(session.currentStepIndex, {
        timeSpent: seconds,
      });
    },
    [session?.currentStepIndex, syncStepToStore]
  );

  const handleStepNotesChange = useCallback(
    (notes: string) => {
      if (!session) return;
      syncStepToStore(session.currentStepIndex, {
        notes,
      });
    },
    [session?.currentStepIndex, syncStepToStore]
  );

  const handlePauseSession = useCallback(() => {
    if (!session || !currentStepState) return;

    // Pause current step timer
    if (currentStepState.isActive) {
      syncStepToStore(session.currentStepIndex, {
        isActive: false,
      });
    }

    syncSessionToStore({
      isPaused: true,
    });
  }, [
    session?.currentStepIndex,
    currentStepState?.isActive,
    currentStepState,
    session,
    syncStepToStore,
    syncSessionToStore,
  ]);

  const handleResumeSession = useCallback(() => {
    if (!session || !currentStepState) return;

    // Resume current step timer if it was active
    if (!currentStepState.isCompleted) {
      syncStepToStore(session.currentStepIndex, {
        isActive: true,
        startTime: new Date(),
      });
    }

    syncSessionToStore({
      isPaused: false,
    });
  }, [
    session?.currentStepIndex,
    currentStepState?.isCompleted,
    currentStepState,
    session,
    syncStepToStore,
    syncSessionToStore,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ': // Space to pause/resume
          e.preventDefault();
          if (session?.isPaused || !currentStepState?.isActive) {
            handleStartStepTimer();
          } else {
            handlePauseStepTimer();
          }
          break;
        case 'ArrowLeft': // Previous step
          if (session && session.currentStepIndex > 0) {
            handlePreviousStep();
          }
          break;
        case 'ArrowRight': // Next step
          if (session && session.currentStepIndex < plan.steps.length - 1) {
            handleNextStep();
          }
          break;
        case 'Enter': // Complete current step
          if (currentStepState && !currentStepState.isCompleted) {
            handleCompleteStep();
          }
          break;
        case 'Escape': // Exit session
          onExitSession();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    session?.isPaused,
    currentStepState?.isActive,
    currentStepState?.isCompleted,
    currentStepState,
    session?.currentStepIndex,
    session,
    handleStartStepTimer,
    handlePauseStepTimer,
    handlePreviousStep,
    handleNextStep,
    handleCompleteStep,
    onExitSession,
    plan.steps.length,
  ]);

  const completedSteps = useMemo(
    () =>
      session ? session.stepStates.filter(step => step.isCompleted).length : 0,
    [session?.stepStates, session]
  );

  const totalMinutes = useMemo(
    () => Math.floor((session?.totalTimeSpent || 0) / 60),
    [session?.totalTimeSpent]
  );

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading practice session...</div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      role="main"
      aria-label="Interactive Practice Session"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-2xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
          >
            Interactive Practice Session
          </h2>
          <p className="text-slate-400 mt-1">{plan.goal}</p>
          <div className="text-xs text-slate-500 mt-1">
            Keyboard: Space=Pause/Resume, ←→=Navigate, Enter=Complete, Esc=Exit
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Session Controls */}
          {!session.isCompleted && (
            <>
              {session.isPaused ? (
                <Button
                  onClick={handleResumeSession}
                  className={`transition-all duration-200 ${
                    lessonMode
                      ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/30'
                      : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'
                  }`}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button
                  onClick={handlePauseSession}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
            </>
          )}

          <Button
            onClick={onExitSession}
            variant="outline"
            className="border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Exit Session
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <PracticeProgressBar session={session} lessonMode={lessonMode} />

      {/* Session Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400">
          <span>Total time: {totalMinutes} minutes</span>
          <span>
            Completed: {completedSteps}/{plan.steps.length} steps
          </span>
        </div>

        {session.isCompleted && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Session Complete!
          </Badge>
        )}
      </div>

      {/* Current Step Navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousStep}
          disabled={session.currentStepIndex === 0}
          className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous Step
        </Button>

        <div className="flex items-center gap-2">
          {plan.steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                session.stepStates[index].isCompleted
                  ? 'bg-green-500'
                  : index === session.currentStepIndex
                    ? lessonMode
                      ? 'bg-neon-cyan'
                      : 'bg-neon-purple'
                    : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextStep}
          disabled={session.currentStepIndex === plan.steps.length - 1}
          className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          Next Step
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Current Step Card */}
      {currentStep && currentStepState && (
        <PracticeStepCard
          step={currentStep}
          stepIndex={session.currentStepIndex}
          totalSteps={plan.steps.length}
          stepState={currentStepState}
          practiceSession={session}
          lessonMode={lessonMode}
          onPrevious={
            session.currentStepIndex > 0 ? handlePreviousStep : undefined
          }
          onNext={
            session.currentStepIndex < plan.steps.length - 1
              ? handleNextStep
              : undefined
          }
          onComplete={handleCompleteStep}
          onStartTimer={handleStartStepTimer}
          onPauseTimer={handlePauseStepTimer}
          onStopTimer={handleStopStepTimer}
          onResetTimer={handleResetStepTimer}
          onTimeUpdate={handleStepTimeUpdate}
          onNotesChange={handleStepNotesChange}
        />
      )}
    </div>
  );
};
