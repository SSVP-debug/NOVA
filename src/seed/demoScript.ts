import type { MisconceptionId } from '@/core/types';

/**
 * The fixed question used in the 3-minute demo (task D5). Both demo learners get exactly this question,
 * so "same wrong answer, different teaching" is reliable. If the content team renames this question,
 * `demoScript.test.ts` fails, so the demo cannot break silently.
 */
export interface ScriptedQuestion {
  specId: string;
  seed: number;
  focus: MisconceptionId; // the mistake the demo shows
  run?: number; // lets the same demo question be started again
}

export const DEMO_QUESTION: ScriptedQuestion = { specId: 'loop-bounds-print', seed: 7, focus: 'off-by-one-start' };
export const DEMO_CONCEPT = 'loop-bounds';
