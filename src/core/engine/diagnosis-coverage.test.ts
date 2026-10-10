import { describe, expect, it } from 'vitest';
import {
  applyAttempt, chooseDiagnosticTarget, createLearner, nextDiagnosticQuestion, offeredBy, selectQuestion,
} from '@/core/engine';
import type { QuestionSpec } from '@/core/types';
import { attempt, generators, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p1', pack, NOW);
const staticSpecs = pack.questions.filter((q): q is Extract<QuestionSpec, { kind: 'static' }> => q.kind === 'static');

/** A concept with a static question that offers mistake M and another static question that does not. */
function findPair() {
  for (const a of staticSpecs) {
    const m = a.options.find((o) => o.misconception)?.misconception;
    if (!m) continue;
    const other = staticSpecs.find((b) => b.concept === a.concept && b.id !== a.id && !b.options.some((o) => o.misconception === m));
    if (other) return { concept: a.concept, mistake: m, offering: a, notOffering: other };
  }
  throw new Error('The pack has no suitable pair of questions for this test');
}

describe('a correct answer only counts against a mistake when the question could have shown it', () => {
  const { concept, mistake, offering, notOffering } = findPair();
  const withMistake = () => applyAttempt(fresh(), attempt({ concept, specId: offering.id, correct: false, misconception: mistake }), pack);

  it('starts active after a wrong answer that shows it', () => {
    expect(withMistake().misconceptions[mistake]!.status).toBe('active');
  });

  it('a correct answer to a question that never offered the mistake leaves it active', () => {
    const next = applyAttempt(withMistake(), attempt({ concept, specId: notOffering.id, correct: true }), pack);
    expect(next.misconceptions[mistake]!.status).toBe('active');
  });

  it('a correct answer to a question that offered the mistake (and the learner avoided it) makes it "improving"', () => {
    const next = applyAttempt(withMistake(), attempt({ concept, specId: offering.id, correct: true }), pack);
    expect(next.misconceptions[mistake]!.status).toBe('improving');
  });

  it('a correct probe still resolves it', () => {
    const next = applyAttempt(withMistake(), attempt({ concept, specId: offering.id, correct: true, isProbe: true, probeFor: mistake }), pack);
    expect(next.misconceptions[mistake]!.status).toBe('resolved');
  });
});

describe('practice prefers a question the learner has not answered yet', () => {
  it('between two otherwise identical questions, picks the one not answered before', () => {
    const s = staticSpecs[0]!;
    const twin: QuestionSpec = { ...structuredClone(s), id: `${s.id}-twin` };
    const small = { ...pack, questions: [...pack.questions.filter((q) => q.concept !== s.concept), s, twin] };
    const learner = applyAttempt(createLearner('p1', small, NOW), attempt({ concept: s.concept, specId: s.id, correct: true }), small);
    for (let seed = 1; seed <= 25; seed++) {
      expect(selectQuestion({ pack: small, state: learner, generators, concept: s.concept, seed })!.specId).toBe(twin.id);
    }
  });
});

describe('the quick check prefers questions that can show more new mistakes', () => {
  it('between two questions at the same difficulty, asks the one that offers more mistakes (even if listed second)', () => {
    const rich = staticSpecs.find((q) => offeredBy(q, generators).length >= 2)!;
    const poor: QuestionSpec = { ...structuredClone(rich), id: `${rich.id}-poor`, options: rich.options.map(({ misconception: _m, ...o }) => o) };
    const small = { ...pack, questions: [poor, rich] }; // the poorer question comes first on purpose
    expect(offeredBy(poor, generators)).toHaveLength(0);
    const q = nextDiagnosticQuestion({ pack: small, generators, events: [], seed: 1 })!;
    expect(q.specId).toBe(rich.id);
  });

  it('still adapts: a question two levels away from the target is not chosen just for offering more mistakes', () => {
    const target = chooseDiagnosticTarget(pack, [])!;
    const q = nextDiagnosticQuestion({ pack, generators, events: [], seed: 1 })!;
    const chosen = pack.questions.find((s) => s.id === q.specId)!;
    expect(Math.abs(chosen.difficulty - target.difficulty)).toBeLessThanOrEqual(1);
  });
});
