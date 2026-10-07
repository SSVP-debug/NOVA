import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { FallbackAI } from '@/adapters/ai/fallbackAI';
import { LocalModelAI } from '@/adapters/ai/localModelAI';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { DexieStorage } from '@/adapters/storage/dexieStorage';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { applyAttempt, createLearner } from '@/core/engine';
import type { LocalModelRuntime, StoragePort } from '@/core/ports';
import type { Intervention } from '@/core/types';
import { aaravLearner, makeProfile } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';

for (const [name, make] of [['memory', () => new MemoryStorage()], ['dexie', () => new DexieStorage('t-' + Math.random())]] as [string, () => StoragePort][]) {
  describe(`storage: ${name}`, () => {
    it('saves, loads, exports, imports with a new id, deletes', async () => {
      const st = make();
      const p = makeProfile('Asha', NOW);
      await st.saveProfile(p);
      const l = applyAttempt(createLearner(p.id, pack, NOW), attempt({ misconception: 'off-by-one-start' }), pack);
      await st.saveLearner(l);
      expect((await st.loadLearner(p.id, pack.id))!.history).toHaveLength(1);
      const bundle = await st.exportProfile(p.id);
      const copy = await st.importBundle(JSON.parse(JSON.stringify(bundle)));
      expect(copy.id).not.toBe(p.id);
      expect((await st.loadLearner(copy.id, pack.id))!.profileId).toBe(copy.id);
      await st.deleteProfile(p.id);
      expect(await st.loadLearner(p.id, pack.id)).toBeUndefined();
      expect(await st.listProfiles()).toHaveLength(1);
      await expect(st.importBundle({ nope: 1 })).rejects.toThrow(/NOVA export/);
    });
  });
}

const iv: Intervention = { concept: 'loop-bounds', style: 'plain', evidence: 'e', reason: 'r', baseText: 'Verified template text for the student.' };
const runtime = (fn: () => Promise<string>): LocalModelRuntime => ({ id: 'fake', isReady: async () => true, generate: fn });

describe('AI', () => {
  it('template AI returns verified text and scores teach-back from the checklist', async () => {
    const ai = new TemplateAI();
    expect(await ai.explain({ intervention: iv, learnerLevel: 'beginner' })).toBe(iv.baseText);
    const r = await ai.evaluateTeachBack({ pack, concept: 'loop-bounds', answer: 'The first item is at 0 and the stop is not included' });
    expect(r.covered).toEqual(expect.arrayContaining(['stop-excluded', 'zero-index']));
    expect(r.missing).toContain('start');
  });
  it('fallback AI never fails: errors and timeouts return the template', async () => {
    const boom = new FallbackAI(new LocalModelAI(runtime(async () => { throw new Error('model crashed'); })), new TemplateAI(), 50);
    expect(await boom.explain({ intervention: iv, learnerLevel: 'beginner' })).toBe(iv.baseText);
    const slow = new FallbackAI(new LocalModelAI(runtime(() => new Promise((r) => setTimeout(() => r('too late, sorry'), 300)))), new TemplateAI(), 50);
    expect(await slow.explain({ intervention: iv, learnerLevel: 'beginner' })).toBe(iv.baseText);
    const ok = new FallbackAI(new LocalModelAI(runtime(async () => 'A friendlier rewrite of the idea.')), new TemplateAI(), 500);
    expect(await ok.explain({ intervention: iv, learnerLevel: 'beginner' })).toBe('A friendlier rewrite of the idea.');
  });
});

describe('seeded personas run through the real engine', () => {
  it('Aarav has an active mistake and a proven style; the planner and strategy react to it', async () => {
    const { planToday, chooseStyle } = await import('@/core/engine');
    const s = aaravLearner('a', pack, NOW);
    expect(s.misconceptions['off-by-one-start']).toMatchObject({ status: 'active' });
    expect(planToday(s, pack, NOW).steps[0]!.kind).toBe('fix-misconception');
    expect(chooseStyle(s, ['plain', 'counterexample'], s.misconceptions['off-by-one-start']).style).toBe('counterexample');
    const fresh = createLearner('f', pack, NOW);
    expect(chooseStyle(fresh, ['plain', 'counterexample']).style).toBe('plain'); // personalization contrast
  });
});
