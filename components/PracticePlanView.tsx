'use client';

import React from 'react';
import { PracticePlan } from '@/lib/practice-plan-schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Guitar, Target, CheckCircle, AlertCircle } from 'lucide-react';

interface PracticePlanViewProps {
  plan: PracticePlan;
  lessonMode: boolean;
}

export const PracticePlanView: React.FC<PracticePlanViewProps> = ({
  plan,
  lessonMode,
}) => {
  const totalMinutes = plan.steps.reduce((sum, step) => sum + step.minutes, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-glass-bg/50 backdrop-blur-xl border border-glass-border">
        <CardHeader className="pb-4">
          <CardTitle
            className={`flex items-center gap-3 text-xl ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
          >
            <Target className="w-5 h-5" />
            {plan.goal}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalMinutes} minutes total
            </div>
            <div className="flex items-center gap-1">
              <Guitar className="w-4 h-4" />
              {plan.steps.length} steps
            </div>
          </div>
        </CardHeader>

        {/* Equipment Needed */}
        <CardContent className="pt-0">
          <div className="space-y-2">
            <h4
              className={`font-medium ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
            >
              What You Need:
            </h4>
            <div className="flex flex-wrap gap-2">
              {plan.what_you_need.map((item, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`border-glass-border ${
                    index === 0
                      ? lessonMode
                        ? 'text-neon-cyan border-neon-cyan/50'
                        : 'text-neon-purple border-neon-purple/50'
                      : 'text-slate-300'
                  }`}
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {plan.steps.map((step, index) => (
          <Card
            key={index}
            className="bg-glass-bg/30 backdrop-blur-xl border border-glass-border"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle
                  className={`text-lg ${lessonMode ? 'text-slate-200' : 'text-slate-200'}`}
                >
                  {index + 1}. {step.name}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-glass-bg border-glass-border"
                >
                  {step.minutes} min
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Instructions */}
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
                      <div className="text-sm text-slate-300 pl-5">
                        {step.why}
                      </div>
                    </div>
                  )}

                  {step.success_cue && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-neon-cyan uppercase tracking-wide">
                        <CheckCircle className="w-3 h-3" />
                        Success Indicator
                      </div>
                      <div className="text-sm text-slate-300 pl-5">
                        {step.success_cue}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes for Today */}
      {plan.notes_for_today && (
        <Card className="bg-glass-bg/40 backdrop-blur-xl border border-glass-border">
          <CardHeader className="pb-3">
            <CardTitle
              className={`text-sm font-medium ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
            >
              📝 Notes for Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300 leading-relaxed">
              {plan.notes_for_today}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
