import { describe, expect, it } from 'vitest';
import { applyAttempt, buildIntervention, calibrationSummary, chooseStyle, conceptStatus, createLearner, dueConcepts, matchConcepts, materializeQuestion, nextMastery, planToday, selectQuestion, topoOrder } from '@/core/engine';
import { DAY } from '@/core/util/time';
import { attempt, generators, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p1', pack, NOW);

describe('mastery', () => {
  it('rises on correct, falls on wrong, and sure-wrong costs more', () => {
    expect(nextMastery(0.2, true, 'sure')).toBeGreaterThan(0.2);
    expect(nextMastery(0.5, false, 'unsure')).toBeLessThan(0.5);
    expect(nextMastery(0.5, false, 'sure')).toBeLessThan(nextMastery(0.5, false, 'unsure'));
    expect(nextMastery(0.5, true, 'guess')).toBeLessThan(nextMastery(0.5, true, 'sure'));
  });
  it('stays within 0..1', () => {
    let m = 0.2; for (let i = 0; i < 50; i++) m = nextMastery(m, true, 'sure');
    expect(m).toBeLessThanOrEqual(1);
  });
});

describe('applyAttempt (reducer)', () => {
  it('is pure and tracks mistakes, calibration and review', () => {
    const s0 = fresh();
    const s1 = applyAttempt(s0, attempt({ misconception: 'off-by-one-start' }), pack);
    expect(s0.history).toHaveLength(0); // input untouched
    expect(s1.misconceptions['off-by-one-start']).toMatchObject({ seen: 1, status: 'active' });
    expect(s1.calibration.sure).toEqual({ n: 1, wrong: 1 });
    expect(s1.concepts['loop-bounds']!.nextReviewAt).toBe(NOW + DAY);
  });
  it('a passed probe resolves the mistake and credits the style', () => {
    let s = applyAttempt(fresh(), attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ correct: true, isProbe: true, probeFor: 'off-by-one-start', afterStyle: 'counterexample' }), pack);
    expect(s.misconceptions['off-by-one-start']!.status).toBe('resolved');
    expect(s.strategies.counterexample).toEqual({ shown: 1, helped: 1 });
  });
  it('a relapse reactivates a resolved mistake', () => {
    let s = applyAttempt(fresh(), attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ correct: true, isProbe: true, probeFor: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    expect(s.misconceptions['off-by-one-start']).toMatchObject({ seen: 2, status: 'active' });
  });
  it('caps history', () => {
    let s = fresh(); for (let i = 0; i < 230; i++) s = applyAttempt(s, attempt({ correct: true }), pack);
    expect(s.history.length).toBe(200);
  });
});

describe('strategy', () => {
  it('starts plain, then prefers a style that helped, and shows the reason', () => {
    expect(chooseStyle(fresh(), ['plain', 'counterexample']).style).toBe('plain');
    const s = fresh(); s.strategies.counterexample = { shown: 3, helped: 3 }; s.strategies.plain = { shown: 2, helped: 0 };
    const c = chooseStyle(s, ['plain', 'counterexample']);
    expect(c.style).toBe('counterexample');
    expect(c.reason).toMatch(/helped you before/);
  });
  it('tries a new style when a mistake keeps returning', () => {
    const s = fresh();
    const c = chooseStyle(s, ['plain', 'counterexample'], { seen: 2, status: 'active', firstSeen: 0, lastSeen: 0 });
    expect(c.style).toBe('counterexample');
  });
});

describe('planner and graph', () => {
  it('fresh learner gets a diagnostic', () => {
    expect(planToday(fresh(), pack, NOW).steps[0]!.kind).toBe('diagnostic');
  });
  it('active mistake comes first, then reviews', () => {
    let s = applyAttempt(fresh(), attempt({ concept: 'lists', correct: true, at: NOW - 5 * DAY }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    const plan = planToday(s, pack, NOW + 2 * DAY);
    expect(plan.steps[0]).toMatchObject({ kind: 'fix-misconception', misconception: 'off-by-one-start' });
    expect(plan.steps.some((x) => x.kind === 'review')).toBe(true);
    expect(dueConcepts(s, NOW + 2 * DAY)).toContain('lists');
  });
  it('topological order puts prerequisites first and locks dependants', () => {
    const order = topoOrder(pack);
    expect(order.indexOf('loops')).toBeLessThan(order.indexOf('loop-bounds'));
    expect(conceptStatus(fresh(), pack, 'loop-bounds')).toBe('locked');
  });
});

describe('selector, intervention, matcher, calibration', () => {
  it('selector is deterministic and honours focus', () => {
    const a = selectQuestion({ pack, state: fresh(), generators, concept: 'loop-bounds', seed: 9, focus: ['off-by-one-start'] })!;
    const b = selectQuestion({ pack, state: fresh(), generators, concept: 'loop-bounds', seed: 9, focus: ['off-by-one-start'] })!;
    expect(a).toEqual(b);
    expect(a.options.some((o) => o.misconception === 'off-by-one-start')).toBe(true);
  });
  it('builds an intervention with evidence, reason and verified text', () => {
    const q = materializeQuestion(pack.questions.find((x) => x.id === 'loop-bounds-print')!, generators, 3, ['off-by-one-start']);
    const wrong = q.options.find((o) => o.misconception === 'off-by-one-start')!;
    const iv = buildIntervention(pack, fresh(), q, wrong);
    expect(iv.style).toBe('plain');
    expect(iv.baseText.length).toBeGreaterThan(10);
    expect(iv.evidence).toMatch(/Off-by-one/);
  });
  it('routes student doubts to concepts, tolerating typos', () => {
    expect(matchConcepts('I dont get loops', pack)[0]!.concept).toBe('loops');
    expect(matchConcepts('my code skips the first item', pack)[0]!.concept).toBeDefined();
    expect(matchConcepts('why is the sky blue', pack)).toHaveLength(0);
  });
  it('flags overconfidence', () => {
    let s = fresh(); for (let i = 0; i < 4; i++) s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    expect(calibrationSummary(s).overconfident).toBe(true);
  });
});
