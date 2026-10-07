import { describe, expect, it } from 'vitest';
import { applyAttempt, createLearner, summarizeSession } from '@/core/engine';
import { attempt, NOW, pack } from '@/testkit';

const run = (evs: ReturnType<typeof attempt>[]) => {
  const before = createLearner('p', pack, NOW);
  const after = evs.reduce((s, e) => applyAttempt(s, e, pack), before);
  return { before, after, sum: summarizeSession(evs, pack, before, after, NOW) };
};

describe('summarizeSession', () => {
  it('counts answers, groups mistakes, flags sure-but-wrong, and recommends the fix first', () => {
    const { sum } = run([
      attempt({ correct: true, concept: 'lists' }),
      attempt({ misconception: 'off-by-one-start' }),
      attempt({ misconception: 'off-by-one-start' }),
      attempt({ misconception: 'index-vs-value', confidence: 'unsure' }),
      attempt({ correct: true, concept: 'lists' }),
    ]);
    expect(sum).toMatchObject({ total: 5, correct: 2, sureWrong: 2 });
    expect(sum.accuracy).toBeCloseTo(0.4);
    expect(sum.mistakes[0]).toMatchObject({ id: 'off-by-one-start', count: 2 });
    expect(sum.concepts.map((c) => c.id).sort()).toEqual(['lists', 'loop-bounds']);
    expect(sum.concepts.find((c) => c.id === 'lists')!.after).toBeGreaterThan(sum.concepts.find((c) => c.id === 'lists')!.before);
    expect(sum.nextStep).toMatchObject({ kind: 'fix-misconception', misconception: 'off-by-one-start' });
  });
  it('reports a mistake fixed by a passed probe', () => {
    const { sum } = run([
      attempt({ misconception: 'off-by-one-start' }),
      attempt({ correct: true, isProbe: true, probeFor: 'off-by-one-start', afterStyle: 'plain' }),
    ]);
    expect(sum.resolved.map((r) => r.id)).toEqual(['off-by-one-start']);
    expect(sum.nextStep?.kind).not.toBe('fix-misconception');
  });
  it('handles an empty session', () => {
    const { sum } = run([]);
    expect(sum).toMatchObject({ total: 0, accuracy: 0, headline: 'No questions answered yet' });
  });
});
