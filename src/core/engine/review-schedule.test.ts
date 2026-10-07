import { describe, expect, it } from 'vitest';
import { applyAttempt, createLearner, describeDue, planToday, reviewSchedule } from '@/core/engine';
import { DAY } from '@/core/util/time';
import { attempt, NOW, pack } from '@/testkit';

const learnedLists = () => applyAttempt(createLearner('p', pack, NOW), attempt({ concept: 'lists', correct: true, at: NOW }), pack);

describe('describeDue', () => {
  it('uses plain words', () => {
    expect(describeDue(NOW + 5 * DAY, NOW)).toBe('due in 5 days');
    expect(describeDue(NOW + DAY, NOW)).toBe('due tomorrow');
    expect(describeDue(NOW + DAY / 2, NOW)).toBe('due tomorrow');
    expect(describeDue(NOW, NOW)).toBe('due today');
    expect(describeDue(NOW - DAY / 2, NOW)).toBe('due today');
    expect(describeDue(NOW - DAY, NOW)).toBe('due 1 day ago');
    expect(describeDue(NOW - 4 * DAY, NOW)).toBe('due 4 days ago');
  });
});

describe('review schedule follows time (fake clock = the `now` argument)', () => {
  it('is empty for a learner with no answers', () => {
    expect(reviewSchedule(createLearner('p', pack, NOW), pack, NOW)).toEqual([]);
  });

  it('lists the practised topic, not due yet, then due as time passes', () => {
    const s = learnedLists();
    expect(reviewSchedule(s, pack, NOW)).toMatchObject([{ concept: 'lists', title: 'Lists', due: false, label: 'due in 3 days' }]);
    expect(reviewSchedule(s, pack, NOW + 2 * DAY)[0]).toMatchObject({ due: false, label: 'due tomorrow' });
    expect(reviewSchedule(s, pack, NOW + 3 * DAY)[0]).toMatchObject({ due: true, label: 'due today' });
    expect(reviewSchedule(s, pack, NOW + 4 * DAY)[0]).toMatchObject({ due: true, label: 'due 1 day ago' });
  });

  it("today's plan has no review before the time, and a review step after it", () => {
    const s = learnedLists();
    expect(planToday(s, pack, NOW + 2 * DAY).steps.some((x) => x.kind === 'review')).toBe(false);
    const later = planToday(s, pack, NOW + 4 * DAY);
    expect(later.steps[0]).toMatchObject({ kind: 'review', concept: 'lists' });
    expect(later.headline).toBe('Quick review, then move on');
  });

  it('a wrong answer brings the review back to 1 day', () => {
    const s = applyAttempt(learnedLists(), attempt({ concept: 'lists', misconception: 'index-starts-at-one', at: NOW + DAY }), pack);
    expect(reviewSchedule(s, pack, NOW + DAY)[0]!.label).toBe('due tomorrow');
  });

  it('most overdue topic comes first', () => {
    let s = learnedLists();
    s = applyAttempt(s, attempt({ concept: 'loops', correct: true, at: NOW + 2 * DAY }), pack);
    expect(reviewSchedule(s, pack, NOW + 10 * DAY).map((r) => r.concept)).toEqual(['lists', 'loops']);
  });
});
