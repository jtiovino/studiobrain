'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

interface PracticeTimerProps {
  isActive: boolean;
  isPaused: boolean;
  timeSpent: number; // in seconds
  targetMinutes?: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onTimeUpdate: (seconds: number) => void;
  lessonMode: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const PracticeTimer: React.FC<PracticeTimerProps> = React.memo(
  ({
    isActive,
    isPaused,
    timeSpent,
    targetMinutes,
    onStart,
    onPause,
    onStop,
    onReset,
    onTimeUpdate,
    lessonMode,
    size = 'medium',
    className = '',
  }) => {
    const [currentTime, setCurrentTime] = useState(timeSpent);
    const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
      setCurrentTime(timeSpent);
    }, [timeSpent]);

    useEffect(() => {
      if (isActive && !isPaused) {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const newTime = prev + 1;
            onTimeUpdate(newTime);
            return newTime;
          });
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [isActive, isPaused, onTimeUpdate]);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressPercentage = (): number => {
      if (!targetMinutes) return 0;
      return Math.min((currentTime / (targetMinutes * 60)) * 100, 100);
    };

    const sizeClasses = useMemo(() => {
      switch (size) {
        case 'small':
          return {
            container: 'px-3 py-2',
            time: 'text-lg font-mono',
            buttons: 'h-8 w-8 p-1',
            icon: 'w-3 h-3',
          };
        case 'large':
          return {
            container: 'px-6 py-4',
            time: 'text-3xl font-mono',
            buttons: 'h-12 w-12 p-2',
            icon: 'w-6 h-6',
          };
        default:
          return {
            container: 'px-4 py-3',
            time: 'text-2xl font-mono',
            buttons: 'h-10 w-10 p-2',
            icon: 'w-4 h-4',
          };
      }
    }, [size]);
    const isOverTime = targetMinutes && currentTime > targetMinutes * 60;

    return (
      <div
        className={`bg-glass-bg/30 backdrop-blur-xl border border-glass-border rounded-lg ${sizeClasses.container} ${className}`}
      >
        <div className="flex items-center justify-between">
          {/* Timer Display */}
          <div className="flex flex-col items-center space-y-1">
            <div
              className={`${sizeClasses.time} font-bold transition-colors duration-200 ${
                isOverTime
                  ? 'text-red-400'
                  : lessonMode
                    ? 'text-neon-cyan'
                    : 'text-neon-purple'
              }`}
            >
              {formatTime(currentTime)}
            </div>

            {targetMinutes && (
              <div className="text-xs text-slate-400">/ {targetMinutes}:00</div>
            )}

            {/* Progress indicator for target time */}
            {targetMinutes && (
              <div className="w-16 h-1 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isOverTime
                      ? 'bg-red-500'
                      : lessonMode
                        ? 'bg-neon-cyan'
                        : 'bg-neon-purple'
                  }`}
                  style={{
                    width: `${Math.min(getProgressPercentage(), 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            {!isActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStart}
                className={`${sizeClasses.buttons} transition-all duration-200 ${
                  lessonMode
                    ? 'hover:bg-neon-cyan/10 hover:text-neon-cyan text-slate-400'
                    : 'hover:bg-neon-purple/10 hover:text-neon-purple text-slate-400'
                }`}
                title="Start timer"
                aria-label="Start practice timer"
              >
                <Play className={sizeClasses.icon} />
              </Button>
            ) : isPaused ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStart}
                className={`${sizeClasses.buttons} transition-all duration-200 ${
                  lessonMode
                    ? 'hover:bg-neon-cyan/10 hover:text-neon-cyan text-slate-400'
                    : 'hover:bg-neon-purple/10 hover:text-neon-purple text-slate-400'
                }`}
                title="Resume timer"
                aria-label="Resume practice timer"
              >
                <Play className={sizeClasses.icon} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPause}
                className={`${sizeClasses.buttons} transition-all duration-200 ${
                  lessonMode
                    ? 'hover:bg-neon-cyan/10 hover:text-neon-cyan text-neon-cyan'
                    : 'hover:bg-neon-purple/10 hover:text-neon-purple text-neon-purple'
                }`}
                title="Pause timer"
                aria-label="Pause practice timer"
              >
                <Pause className={sizeClasses.icon} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              disabled={!isActive}
              className={`${sizeClasses.buttons} transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 text-slate-400 disabled:opacity-50`}
              title="Stop timer"
            >
              <Square className={sizeClasses.icon} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isActive && !isPaused}
              className={`${sizeClasses.buttons} transition-all duration-200 hover:bg-slate-500/10 hover:text-slate-300 text-slate-400 disabled:opacity-50`}
              title="Reset timer"
            >
              <RotateCcw className={sizeClasses.icon} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
