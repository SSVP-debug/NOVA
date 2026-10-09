import { describe, expect, it } from 'vitest';
import {
  applyAttempt, buildConceptMap, conceptStatus, createLearner, isTestable, nextDiagnosticQuestion, planToday, prerequisiteMet,
} from '@/core/engine';
import type { AttemptEvent } from '@/core/types';
import { attempt, generators, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p1', pack, NOW);

describe('lock rule: a topic that cannot be measured must not block others', () => {
  it('knows which topics can be measured', () => {
    expect(isTestable(pack, 'variables')).toBe(true);
    expect(isTestable(pack, 'loops')).toBe(true);
  });

  it('a fresh learner cannot open prereq topics until Variables is answered', () => {
    expect(conceptStatus(fresh(), pack, 'variables')).toBe('new');
    expect(conceptStatus(fresh(), pack, 'lists')).toBe('locked');
    expect(conceptStatus(fresh(), pack, 'loops')).toBe('locked');
    expect(conceptStatus(fresh(), pack, 'loop-bounds')).toBe('locked');
  });

  it('answering Variables unlocks dependent concepts', () => {
    const s = createLearner('p', pack, NOW);
    expect(conceptStatus(s, pack, 'lists')).toBe('locked');
    const answered = applyAttempt(s, attempt({ concept: 'variables', correct: true }), pack);
    answered.concepts.variables!.mastery = 0.5;
    expect(conceptStatus(answered, pack, 'lists')).toBe('new');
  });

  it('the concept map agrees with the lock rule and shows what blocks a topic', () => {
    const map = buildConceptMap(pack, fresh());
    expect(map.edges.find((e) => e.from === 'variables' && e.to === 'lists')!.met).toBe(false);
    expect(map.nodes.find((n) => n.id === 'lists')!.unlockBy.map((u) => u.id)).toContain('variables');
    expect(prerequisiteMet(fresh(), pack, 'variables')).toBe(false);
  });

  it('a perfect quick check leaves no answered topic locked', () => {
    let s = fresh();
    const events: AttemptEvent[] = [];
    for (let i = 0; i < 20; i++) {
      const q = nextDiagnosticQuestion({ pack, generators, events, seed: 7 });
      if (!q) break;
      const o = q.options.find((x) => x.correct)!;
      const ev = attempt({ at: NOW + i, questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id, correct: true });
      events.push(ev);
      s = applyAttempt(s, ev, pack);
    }
    const asked = [...new Set(events.map((e) => e.concept))];
    expect(asked.length).toBeGreaterThanOrEqual(3);
    for (const c of asked) expect(conceptStatus(s, pack, c)).not.toBe('locked');
  });
});

describe('planner: one fix step per topic', () => {
  it('merges several mistakes in the same topic and leads with the most repeated one', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-end' }), pack);
    for (let i = 0; i < 2; i++) s = applyAttempt(s, attempt({ concept: 'lists', misconception: 'len-is-last-index' }), pack);

    const fixes = planToday(s, pack, NOW).steps.filter((x) => x.kind === 'fix-misconception');
    expect(fixes.map((f) => f.concept)).toEqual(['loop-bounds', 'lists']); // never the same topic twice
    expect(fixes[0]).toMatchObject({ misconception: 'off-by-one-start' });
    expect(fixes[0]!.reason).toMatch(/2 different mistakes in Loop bounds/);
    expect(fixes[0]!.reason).toMatch(/most repeated is "Off-by-one \(loop start\)" \(3 times\)/);
  });

  it('a single mistake keeps the simple wording', () => {
    const s = applyAttempt(fresh(), attempt({ misconception: 'off-by-one-start' }), pack);
    const fix = planToday(s, pack, NOW).steps[0]!;
    expect(fix.reason).toBe('You have made the mistake "Off-by-one (loop start)" 1 time. A short probe will check if it is fixed.');
  });
});
