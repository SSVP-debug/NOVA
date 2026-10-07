import { CONFIG } from '../config';
import { DAY } from '../util/time';
import type { ConceptId, ConceptState, LearnerState } from '../types';

/** Simple expanding-interval schedule. A wrong answer resets the stage. */
export function scheduleReview(cs: ConceptState, correct: boolean, at: number): void {
  const days = CONFIG.review.intervalsDays;
  cs.reviewStage = correct ? Math.min(cs.reviewStage + 1, days.length - 1) : 0;
  cs.nextReviewAt = at + (days[cs.reviewStage] ?? 1) * DAY;
}

/** Concepts whose review time has passed, most overdue first. */
export function dueConcepts(state: LearnerState, now: number): ConceptId[] {
  return Object.entries(state.concepts)
    .filter(([, c]) => c.attempts > 0 && c.nextReviewAt !== undefined && c.nextReviewAt <= now)
    .sort((a, b) => (a[1].nextReviewAt ?? 0) - (b[1].nextReviewAt ?? 0))
    .map(([id]) => id);
}
