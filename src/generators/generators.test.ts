import { describe, expect, it } from 'vitest';
import { validatePack } from '@/core/content/validate';
import { materializeQuestion } from '@/core/engine';
import { generators, pack } from '@/testkit';

describe('content pack', () => {
  it('has no validation errors', () => {
    expect(validatePack(pack, generators).errors).toEqual([]);
  });
  it('validator catches an untagged wrong option', () => {
    const bad = structuredClone(pack);
    const q = bad.questions.find((x) => x.kind === 'static')!;
    if (q.kind === 'static') delete q.options[1]!.misconception;
    expect(validatePack(bad, generators).errors.join()).toMatch(/no misconception tag/);
  });
});

describe('generators', () => {
  for (const spec of pack.questions.filter((q) => q.kind === 'generated')) {
    it(`${spec.id}: 4 options, 1 correct, unique, tagged, deterministic`, () => {
      for (let seed = 1; seed <= 500; seed++) {
        const q = materializeQuestion(spec, generators, seed);
        expect(q.options).toHaveLength(4);
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
        for (const o of q.options) if (!o.correct) expect(q.feedback?.[o.misconception!]?.plain).toBeTruthy();
        expect(materializeQuestion(spec, generators, seed)).toEqual(q);
      }
    });
  }
  it('keeps the focus mistake among the wrong options', () => {
    const spec = pack.questions.find((x) => x.id === 'loop-bounds-print')!;
    for (let seed = 1; seed <= 200; seed++) {
      const q = materializeQuestion(spec, generators, seed, ['index-vs-value']);
      expect(q.options.some((o) => o.misconception === 'index-vs-value')).toBe(true);
    }
  });
});
