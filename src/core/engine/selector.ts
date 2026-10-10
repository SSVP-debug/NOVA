import { CONFIG } from '../config';
import type { GeneratorRegistry } from '../ports';
import type { ConceptId, ContentPack, Difficulty, LearnerState, MisconceptionId, Question, QuestionSpec } from '../types';
import { createRng } from '../util/rng';
import { masteryOf } from './graph';
import { offeredBy } from './diagnostic';
import { materializeQuestion } from './questions';

export interface SelectInput {
  pack: ContentPack;
  state: LearnerState;
  generators: GeneratorRegistry;
  concept: ConceptId;
  seed: number;
  focus?: MisconceptionId[];
  recentSpecIds?: string[];
}

export const targetDifficulty = (mastery: number): Difficulty => (mastery < 0.4 ? 1 : mastery < 0.7 ? 2 : 3);

function testsFocus(spec: QuestionSpec, gens: GeneratorRegistry, focus: MisconceptionId[]): boolean {
  if (!focus.length) return false;
  if (spec.kind === 'static') return spec.options.some((o) => o.misconception && focus.includes(o.misconception));
  const g = gens.get(spec.generator);
  return !!g && g.targets.some((t) => focus.includes(t));
}

/**
 * Picks the best question for this learner: right difficulty, tests their current mistakes,
 * and avoids what they just saw. Deterministic for a given seed.
 */
export function selectQuestion(i: SelectInput): Question | null {
  const focus = i.focus ?? [];
  const recent = new Set((i.recentSpecIds ?? []).slice(-CONFIG.selector.recentWindow));
  const target = targetDifficulty(masteryOf(i.state, i.concept));
  const rnd = createRng(i.seed);

  // Coverage first: a question the learner has not answered yet can still reveal a new mistake.
  const answered = new Set(i.state.history.map((e) => e.specId));
  const tested = new Set<string>();
  for (const q of i.pack.questions) if (answered.has(q.id)) offeredBy(q, i.generators).forEach((m) => tested.add(m));

  const scored = i.pack.questions
    .filter((q) => q.concept === i.concept)
    .map((q) => ({
      q,
      score:
        -Math.abs(q.difficulty - target) * 2 +
        (testsFocus(q, i.generators, focus) ? 5 : 0) -
        (recent.has(q.id) ? 10 : 0) -
        (answered.has(q.id) ? CONFIG.selector.answeredPenalty : 0) +
        CONFIG.selector.freshBonus * Math.min(3, offeredBy(q, i.generators).filter((m) => !tested.has(m)).length) +
        rnd() * 0.5,
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.q;
  return best ? materializeQuestion(best, i.generators, i.seed, focus) : null;
}
