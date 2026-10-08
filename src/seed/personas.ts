import { DEFAULT_SETTINGS } from '@/core/settings';
import { applyAttempt, createLearner } from '@/core/engine';
import type { AttemptEvent, Confidence, ContentPack, ExplanationStyle, LearnerState, MisconceptionId, Profile } from '@/core/types';
import { DAY } from '@/core/util/time';
import { newId } from '@/core/util/id';

const PALETTE = ['#0f766e', '#4f46e5', '#b45309', '#be185d', '#0369a1'];

/** Names of the two demo learners. Profiles marked `seeded` are the only ones the demo reset may delete. */
export const DEMO_NAMES = { fresh: 'Fresh learner (demo)', aarav: 'Aarav, 3 weeks of history (demo)' } as const;

export function makeProfile(name: string, now: number, seeded = false): Profile {
  return { id: newId(), name, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] as string, createdAt: now, seeded, settings: { ...DEFAULT_SETTINGS } };
}

interface Step {
  d: number; // days ago
  concept: string;
  ok: boolean;
  conf?: Confidence;
  mis?: MisconceptionId;
  probeFor?: MisconceptionId;
  after?: ExplanationStyle;
}

/** Builds history by running scripted attempts THROUGH THE REAL ENGINE, so seeded data is always consistent. */
function build(profileId: string, pack: ContentPack, now: number, steps: Step[]): LearnerState {
  let s = createLearner(profileId, pack, now);
  steps.forEach((st, i) => {
    const ev: AttemptEvent = {
      type: 'attempt', at: now - st.d * DAY + i * 1000, questionId: `seed-${i}`, specId: `seed-${st.concept}`,
      concept: st.concept, chosenOptionId: 'o1', correct: st.ok, misconception: st.mis, confidence: st.conf ?? 'sure',
      timeMs: 15000, hintsUsed: 0, isProbe: !!st.probeFor, probeFor: st.probeFor, afterStyle: st.after,
    };
    s = applyAttempt(s, ev, pack);
  });
  return s;
}

export function freshLearner(profileId: string, pack: ContentPack, now: number): LearnerState {
  return createLearner(profileId, pack, now);
}

/** "Aarav": 3 weeks of history. Counterexamples worked, plain did not, and off-by-one keeps coming back. */
export function aaravLearner(profileId: string, pack: ContentPack, now: number): LearnerState {
  const O = 'off-by-one-start';
  return build(profileId, pack, now, [
    { d: 21, concept: 'variables', ok: true }, { d: 21, concept: 'variables', ok: true },
    { d: 20, concept: 'lists', ok: true }, { d: 20, concept: 'lists', ok: true },
    { d: 14, concept: 'loops', ok: true, conf: 'unsure' }, { d: 14, concept: 'loops', ok: true },
    { d: 10, concept: 'loop-bounds', ok: false, mis: O },
    { d: 10, concept: 'loop-bounds', ok: false, mis: O, probeFor: O, after: 'plain' },
    { d: 6, concept: 'loop-bounds', ok: false, mis: O },
    { d: 6, concept: 'loop-bounds', ok: false, mis: O, probeFor: O, after: 'plain' },
    { d: 3, concept: 'loop-bounds', ok: false, mis: O },
    { d: 3, concept: 'loop-bounds', ok: true, probeFor: O, after: 'counterexample' },
    { d: 2, concept: 'loop-bounds', ok: false, mis: O },
    { d: 2, concept: 'loop-bounds', ok: true, probeFor: O, after: 'counterexample' },
    { d: 1, concept: 'loop-bounds', ok: false, mis: O },
  ]);
}
