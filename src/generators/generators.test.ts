import { describe, expect, it } from 'vitest';
import { validatePack } from '@/core/content/validate';
import { materializeQuestion } from '@/core/engine';
import { PACKS } from '@/content';
import { generators, pack } from '@/testkit';

describe.each(PACKS)('content pack: $id', (contentPack) => {
  it('has no validation errors', () => {
    expect(validatePack(contentPack, generators)).toEqual({ errors: [], warnings: [] });
  });
  it('validator catches an untagged wrong option', () => {
    const bad = structuredClone(contentPack);
    const q = bad.questions.find((x) => x.kind === 'static')!;
    if (q.kind === 'static') delete q.options[1]!.misconception;
    expect(validatePack(bad, generators).errors.join()).toMatch(/no misconception tag/);
  });
  it('covers every concept with at least four questions', () => {
    for (const concept of contentPack.concepts) {
      expect(contentPack.questions.filter((question) => question.concept === concept.id).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('generators', () => {
  for (const contentPack of PACKS) {
    for (const spec of contentPack.questions.filter((q) => q.kind === 'generated')) {
      it(`${contentPack.id}/${spec.id}: 4 options, 1 correct, unique, tagged, deterministic over 500 seeds`, () => {
        for (let seed = 1; seed <= 500; seed++) {
          const q = materializeQuestion(spec, generators, seed);
          expect(q.options).toHaveLength(4);
          expect(q.options.filter((o) => o.correct)).toHaveLength(1);
          expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
          for (const o of q.options) if (!o.correct) expect(q.feedback?.[o.misconception!]?.plain).toBeTruthy();
          expect(materializeQuestion(spec, generators, seed)).toEqual(q);
        }
      });

      it(`${contentPack.id}/${spec.id}: keeps each targeted focus mistake available`, () => {
        if (spec.kind !== 'generated') return;
        const generator = generators.get(spec.generator)!;
        for (const misconception of generator.targets) {
          const q = materializeQuestion(spec, generators, 17, [misconception]);
          expect(q.options.some((option) => option.misconception === misconception)).toBe(true);
        }
      });
    }
  }
  it('keeps the focus mistake among the wrong options', () => {
    const spec = pack.questions.find((x) => x.id === 'loop-bounds-print')!;
    for (let seed = 1; seed <= 200; seed++) {
      const q = materializeQuestion(spec, generators, seed, ['index-vs-value']);
      expect(q.options.some((o) => o.misconception === 'index-vs-value')).toBe(true);
    }
  });
});
