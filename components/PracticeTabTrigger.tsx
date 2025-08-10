'use client';

import React from 'react';

import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface PracticeTabTriggerProps {
  value: string;
  children: React.ReactNode;
  lessonMode: boolean;
  className?: string;
}

export const PracticeTabTrigger: React.FC<PracticeTabTriggerProps> = ({
  value,
  children,
  lessonMode,
  className = '',
}) => {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'practice-tab-trigger',
        lessonMode ? 'lesson-mode' : 'practice-mode',
        className
      )}
    >
      {children}
    </TabsTrigger>
  );
};
