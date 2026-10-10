import { describe, expect, it } from 'vitest';
import { buildSolution } from './solution';
import { materializeQuestion } from './questions';
import { generators, pack } from '@/testkit';

describe('buildSolution', () => {
  it('gives the correct option and the pack text for the topic', () => {
    const spec = pack.questions.find((x) => x.kind === 'static')!;
    const q = materializeQuestion(spec, generators, 1, []);
    const sol = buildSolution(pack, q)!;
    expect(sol.answer).toBe(q.options.find((o) => o.correct)!.text.trim());
    expect(sol.why.length).toBeGreaterThan(0);
  });
  it('returns nothing when no option is marked correct', () => {
    const spec = pack.questions.find((x) => x.kind === 'static')!;
    const q = materializeQuestion(spec, generators, 1, []);
    expect(buildSolution(pack, { ...q, options: q.options.map((o) => ({ ...o, correct: false })) })).toBeUndefined();
  });
});
