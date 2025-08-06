import { z } from 'zod';

export const DiagramSchema = z.object({
  type: z.enum(['scale', 'arp', 'voicing']),
  name: z.string().min(1),
  position_label: z.string().min(1),
  root_string: z.enum(['E', 'A', 'D', 'G', 'B', 'e', 'none']),
  root_fret: z.number().int().min(0),
});

export const StepSchema = z.object({
  name: z.string().min(1),
  minutes: z.number().int().min(1),
  instructions: z.string().min(1),
  diagrams: z.array(DiagramSchema).default([]),
  tab_snippet: z.string().min(1).nullable(),
  why: z.string().min(1).nullable(),
  success_cue: z.string().min(1).nullable(),
});

export const PracticePlanSchema = z.object({
  goal: z.string().min(5),
  what_you_need: z.array(z.string().min(1)).default([]),
  steps: z.array(StepSchema).min(1),
  notes_for_today: z.string().min(1).nullable(),
});

export type PracticePlan = z.infer<typeof PracticePlanSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type Step = z.infer<typeof StepSchema>;

// Practice Session State Types (for interactive practice sessions)
export interface PracticeStepState {
  isCompleted: boolean;
  isActive: boolean;
  timeSpent: number;
  startTime?: Date;
  notes?: string;
}

export interface PracticeSessionState {
  id: string;
  planId: string;
  currentStepIndex: number;
  isPaused: boolean;
  isCompleted: boolean;
  totalTimeSpent: number;
  stepStates: PracticeStepState[];
  createdAt: Date;
  updatedAt: Date;
}

// Post-validation function for business logic rules
export function postValidatePlan(
  plan: PracticePlan,
  input: { time_minutes: number; tuning: string; lesson_mode: boolean }
) {
  // 1) Minutes must sum to time_minutes
  const total = plan.steps.reduce((s, st) => s + st.minutes, 0);
  if (total !== input.time_minutes)
    throw new Error(
      `Minutes sum (${total}) ≠ time_minutes (${input.time_minutes})`
    );

  // 2) First what_you_need item must be tuning
  const first = plan.what_you_need[0]?.toLowerCase() || '';
  const expected = `guitar in ${input.tuning}`.toLowerCase();
  if (!first.includes(expected))
    throw new Error(
      `First 'what_you_need' must be "Guitar in ${input.tuning}"`
    );

  // 3) Resource sanity: metronome only if BPM usage appears
  const listsMet = plan.what_you_need.some(s => /metronome/i.test(s));
  const mentionsBpm = plan.steps.some(st =>
    /\b(bpm|metronome|quarter|eighth|triplet|sixteenth)\b/i.test(
      st.instructions
    )
  );
  if (listsMet && !mentionsBpm)
    throw new Error('Metronome listed but no BPM usage in steps');

  // 4) Lesson mode fields must match toggle
  if (!input.lesson_mode) {
    const bad = plan.steps.find(
      st => st.why !== null || st.success_cue !== null
    );
    if (bad)
      throw new Error("lesson_mode=false but 'why'/'success_cue' not null");
  }
}

// Safe parse helper that combines JSON parsing, Zod validation, and post-validation
export function parsePlan(
  jsonStr: string,
  input: { time_minutes: number; tuning: string; lesson_mode: boolean }
) {
  const parsed = PracticePlanSchema.parse(JSON.parse(jsonStr)); // throws on bad JSON/shape
  postValidatePlan(parsed, input); // throws on rule mismatch
  return parsed as PracticePlan;
}
