import { CONFIG } from '../config';
import type { GeneratorRegistry } from '../ports';
import type { AttemptEvent, ConceptId, ContentPack, Difficulty, LearnerState, MisconceptionId, Plan, Question, QuestionSpec } from '../types';
import { topoOrder } from './graph';
import { planToday } from './planner';
import { materializeQuestion } from './questions';
import { summarizeSession, type SessionSummary } from './session';

/**
 * Quick diagnostic for a new profile (backlog A2). Pure: it only looks at the answers given so far
 * in THIS check and at the pack. The caller records the answers through applyAttempt.
 *
 * Rules (all numbers are in CONFIG.diagnostic):
 *  1. Coverage first: one question in every concept that has questions, prerequisites first.
 *  2. Then follow up where the answer was wrong (to see if it is a gap or a slip), then the rest.
 *     Right answer -> next question one level harder. Wrong answer -> one level easier,
 *     and the mistake it showed is kept among the wrong options.
 *  3. Stop early when every concept is settled (last answers agree) and the minimum is reached.
 *  4. Never more than the maximum, and never the same question twice.
 */

/** Concepts that have at least one question, prerequisites first. Only these can be checked. */
export function diagnosticConcepts(pack: ContentPack): ConceptId[] {
  const hasQuestions = new Set(pack.questions.map((q) => q.concept));
  return topoOrder(pack).filter((id) => hasQuestions.has(id));
}

/** How many questions the check will ask at least and at most for this pack. */
export function diagnosticLength(pack: ContentPack): { min: number; max: number } {
  const ids = new Set(diagnosticConcepts(pack));
  const available = pack.questions.filter((q) => ids.has(q.concept)).length;
  const max = Math.min(CONFIG.diagnostic.maxQuestions, available);
  return { min: Math.min(CONFIG.diagnostic.minQuestions, max), max };
}

export interface DiagnosticTarget {
  concept: ConceptId;
  difficulty: Difficulty;
  focus: MisconceptionId[];
}

/** Decides WHAT to ask next (or null = the check is finished). */
export function chooseDiagnosticTarget(pack: ContentPack, events: AttemptEvent[]): DiagnosticTarget | null {
  const cfg = CONFIG.diagnostic;
  const { min, max } = diagnosticLength(pack);
  if (events.length >= max) return null;

  const order = diagnosticConcepts(pack);
  const asked = new Set(events.map((e) => e.specId));
  const answers = (c: ConceptId) => events.filter((e) => e.concept === c);
  const hasMore = (c: ConceptId) => pack.questions.some((q) => q.concept === c && !asked.has(q.id));

  // 1. coverage
  const uncovered = order.find((c) => answers(c).length === 0);
  if (uncovered) return { concept: uncovered, difficulty: cfg.startDifficulty, focus: [] };

  // 2. follow-ups
  const settled = (c: ConceptId) => {
    const last = answers(c).slice(-cfg.settleAfter);
    return last.length >= cfg.settleAfter && last.every((e) => e.correct === last[0]!.correct);
  };
  const open = order.filter(hasMore);
  const pool = events.length < min ? open : open.filter((c) => !settled(c)); // 3. stop early when settled
  if (!pool.length) return null;

  // wrong answers first, then fewer answers, then prerequisite order
  const rank = (c: ConceptId): [number, number, number] => [answers(c).at(-1)!.correct ? 1 : 0, answers(c).length, order.indexOf(c)];
  const [concept] = [...pool].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });

  const last = answers(concept!).at(-1)!;
  const lastLevel = pack.questions.find((q) => q.id === last.specId)?.difficulty ?? cfg.startDifficulty;
  const difficulty = (last.correct ? Math.min(3, lastLevel + 1) : Math.max(1, lastLevel - 1)) as Difficulty;
  return { concept: concept!, difficulty, focus: !last.correct && last.misconception ? [last.misconception] : [] };
}

export interface DiagnosticInput {
  pack: ContentPack;
  generators: GeneratorRegistry;
  events: AttemptEvent[]; // answers given so far in this check
  seed: number;
}

/** The next question, or null when the check is finished. Deterministic for the same input. */
export function nextDiagnosticQuestion(i: DiagnosticInput): Question | null {
  const target = chooseDiagnosticTarget(i.pack, i.events);
  if (!target) return null;
  const asked = new Set(i.events.map((e) => e.specId));
  // Mistakes the earlier questions of this check already offered: a question that offers NEW ones tells us more.
  const covered = new Set<MisconceptionId>();
  for (const q of i.pack.questions) if (asked.has(q.id)) offeredBy(q, i.generators).forEach((m) => covered.add(m));
  const fresh = (q: QuestionSpec) => offeredBy(q, i.generators).filter((m) => !covered.has(m)).length;
  const gap = (q: QuestionSpec) => Math.abs(q.difficulty - target.difficulty);
  const spec = i.pack.questions
    .filter((q) => q.concept === target.concept && !asked.has(q.id))
    // stay within one level of the target difficulty (the check still adapts), then prefer the most new mistakes
    .sort((a, b) => (gap(a) > 1 ? 1 : 0) - (gap(b) > 1 ? 1 : 0) || fresh(b) - fresh(a) || gap(a) - gap(b))[0];
  return spec ? materializeQuestion(spec, i.generators, i.seed + i.events.length, target.focus) : null;
}

/** Mistakes a question can reveal (its wrong options, or the targets of its generator). */
export function offeredBy(spec: QuestionSpec, generators: GeneratorRegistry): MisconceptionId[] {
  if (spec.kind === 'static') return [...new Set(spec.options.flatMap((o) => (o.misconception ? [o.misconception] : [])))];
  return generators.get(spec.generator)?.targets ?? [];
}

// ---------- results ----------
export type DiagnosticLevel = 'needs-work' | 'building' | 'solid';

export interface DiagnosticSummary {
  total: number;
  correct: number;
  sureWrong: number;
  concepts: { id: ConceptId; title: string; asked: number; correct: number; mastery: number; level: DiagnosticLevel }[];
  mistakes: SessionSummary['mistakes'];
  planBefore: Plan;
  planAfter: Plan;
}

export const levelOf = (mastery: number): DiagnosticLevel =>
  mastery >= CONFIG.mastery.solidFrom ? 'solid' : mastery >= CONFIG.mastery.shakyFrom ? 'building' : 'needs-work';

/** Pure: what to show after the check, including how the plan changed. `after` must come from applyAttempt. */
export function summarizeDiagnostic(
  events: AttemptEvent[],
  pack: ContentPack,
  before: LearnerState,
  after: LearnerState,
  now: number,
): DiagnosticSummary {
  const s = summarizeSession(events, pack, before, after, now);
  const concepts = diagnosticConcepts(pack)
    .filter((id) => events.some((e) => e.concept === id))
    .map((id) => {
      const mine = events.filter((e) => e.concept === id);
      const mastery = after.concepts[id]?.mastery ?? 0;
      return {
        id,
        title: pack.concepts.find((c) => c.id === id)?.title ?? id,
        asked: mine.length,
        correct: mine.filter((e) => e.correct).length,
        mastery,
        level: levelOf(mastery),
      };
    });
  return {
    total: s.total,
    correct: s.correct,
    sureWrong: s.sureWrong,
    concepts,
    mistakes: s.mistakes,
    planBefore: planToday(before, pack, now),
    planAfter: planToday(after, pack, now),
  };
}
