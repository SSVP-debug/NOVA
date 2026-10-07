import { CONFIG } from '../config';
import type { AttemptEvent, ConceptId, ContentPack, LearnerState, MisconceptionId, PlanStep } from '../types';
import { planToday } from './planner';

export interface SessionSummary {
  headline: string;
  total: number;
  correct: number;
  accuracy: number; // 0..1
  mistakes: { id: MisconceptionId; title: string; count: number }[]; // wrong answers by mistake, most repeated first
  resolved: { id: MisconceptionId; title: string }[]; // fixed in this session (passed probe)
  sureWrong: number; // answers marked "sure" that were wrong
  concepts: { id: ConceptId; title: string; before: number; after: number }[]; // mastery 0..1
  nextStep?: PlanStep;
}

const title = (pack: ContentPack, id: MisconceptionId) => pack.misconceptions.find((m) => m.id === id)?.title ?? id;

/** Pure: turns the attempts of one practice session into what the student should see at the end. */
export function summarizeSession(
  events: AttemptEvent[],
  pack: ContentPack,
  before: LearnerState,
  after: LearnerState,
  now: number,
): SessionSummary {
  const total = events.length;
  const correct = events.filter((e) => e.correct).length;
  const accuracy = total ? correct / total : 0;

  const counts = new Map<MisconceptionId, number>();
  for (const e of events) if (!e.correct && e.misconception) counts.set(e.misconception, (counts.get(e.misconception) ?? 0) + 1);
  const mistakes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, title: title(pack, id), count }));

  const resolvedIds = new Set<MisconceptionId>();
  for (const e of events) if (e.correct && e.isProbe && e.probeFor && after.misconceptions[e.probeFor]?.status === 'resolved') resolvedIds.add(e.probeFor);
  const resolved = [...resolvedIds].map((id) => ({ id, title: title(pack, id) }));

  const conceptIds = [...new Set(events.map((e) => e.concept))];
  const concepts = conceptIds.map((id) => ({
    id,
    title: pack.concepts.find((c) => c.id === id)?.title ?? id,
    before: before.concepts[id]?.mastery ?? CONFIG.mastery.initial,
    after: after.concepts[id]?.mastery ?? CONFIG.mastery.initial,
  }));

  const headline = !total
    ? 'No questions answered yet'
    : accuracy >= 0.8
      ? 'Strong session'
      : accuracy >= 0.5
        ? 'Good progress'
        : 'Useful session: now NOVA knows what to work on';

  return {
    headline,
    total,
    correct,
    accuracy,
    mistakes,
    resolved,
    sureWrong: events.filter((e) => e.confidence === 'sure' && !e.correct).length,
    concepts,
    nextStep: planToday(after, pack, now).steps[0],
  };
}
