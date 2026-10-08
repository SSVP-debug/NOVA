import { describe, expect, it } from 'vitest';
import { buildIntervention, materializeQuestion, planToday, reviewSchedule } from '@/core/engine';
import { generators, NOW, pack } from '@/testkit';
import { DEMO_CONCEPT, DEMO_QUESTION } from './demoScript';
import { aaravLearner, freshLearner } from './personas';

const spec = () => pack.questions.find((q) => q.id === DEMO_QUESTION.specId)!;
const question = () => materializeQuestion(spec(), generators, DEMO_QUESTION.seed, [DEMO_QUESTION.focus]);

/** If someone edits the content and this fails, the 3-minute demo would break. Fix the content or DEMO_QUESTION. */
describe('the demo path still works with the current content', () => {
  it('the fixed demo question exists, is repeatable, and offers the demo mistake as a wrong answer', () => {
    expect(spec(), `question "${DEMO_QUESTION.specId}" was removed from the pack`).toBeTruthy();
    expect(spec().concept).toBe(DEMO_CONCEPT);
    expect(question()).toEqual(question());
    const wrong = question().options.filter((o) => o.misconception === DEMO_QUESTION.focus);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]!.correct).toBeUndefined();
  });

  it('the SAME wrong answer gives a plain explanation to the fresh learner and a counterexample to Aarav, with the reason', () => {
    const q = question();
    const wrong = q.options.find((o) => o.misconception === DEMO_QUESTION.focus)!;
    const fresh = buildIntervention(pack, freshLearner('f', pack, NOW), q, wrong);
    const aarav = buildIntervention(pack, aaravLearner('a', pack, NOW), q, wrong);
    expect(fresh.style).toBe('plain');
    expect(fresh.reason).toMatch(/no history of what works for you yet/);
    expect(aarav.style).toBe('counterexample');
    expect(aarav.reason).toMatch(/counterexample helped you before \(2 of 2 follow-up questions correct\)/);
    expect(aarav.baseText).not.toBe(fresh.baseText);
  });

  it('Aarav starts with the demo mistake in his plan and has reviews waiting; the fresh learner starts with a quick check', () => {
    const a = aaravLearner('a', pack, NOW);
    expect(planToday(a, pack, NOW).steps[0]).toMatchObject({ kind: 'fix-misconception', misconception: DEMO_QUESTION.focus });
    expect(reviewSchedule(a, pack, NOW).some((r) => r.due)).toBe(true);
    expect(planToday(freshLearner('f', pack, NOW), pack, NOW).steps[0]!.kind).toBe('diagnostic');
  });

  it('the demo mistake is active for Aarav and unknown for the fresh learner', () => {
    expect(aaravLearner('a', pack, NOW).misconceptions[DEMO_QUESTION.focus]?.status).toBe('active');
    expect(freshLearner('f', pack, NOW).misconceptions[DEMO_QUESTION.focus]).toBeUndefined();
  });
});
