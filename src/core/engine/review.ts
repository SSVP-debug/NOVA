import { CONFIG } from '../config';
import { DAY } from '../util/time';
import type { ConceptId, ConceptState, ContentPack, LearnerState } from '../types';

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

export interface ReviewItem {
  concept: ConceptId;
  title: string;
  dueAt: number;
  due: boolean; // the review time has come
  label: string; // plain words: "due 2 days ago", "due today", "due tomorrow", "due in 5 days"
}

/** Wording for a review time, relative to `now`. Pure. */
export function describeDue(dueAt: number, now: number): string {
  const diff = dueAt - now;
  if (diff <= 0) {
    const days = Math.floor(-diff / DAY);
    return days === 0 ? 'due today' : `due ${days} day${days > 1 ? 's' : ''} ago`;
  }
  const days = Math.ceil(diff / DAY);
  return days === 1 ? 'due tomorrow' : `due in ${days} days`;
}

/** Every practised topic with its review time, most overdue first. Drives the "Review" list on Home. */
export function reviewSchedule(state: LearnerState, pack: ContentPack, now: number): ReviewItem[] {
  return Object.entries(state.concepts)
    .filter(([, c]) => c.attempts > 0 && c.nextReviewAt !== undefined)
    .map(([id, c]) => ({
      concept: id,
      title: pack.concepts.find((x) => x.id === id)?.title ?? id,
      dueAt: c.nextReviewAt as number,
      due: (c.nextReviewAt as number) <= now,
      label: describeDue(c.nextReviewAt as number, now),
    }))
    .sort((a, b) => a.dueAt - b.dueAt);
}
