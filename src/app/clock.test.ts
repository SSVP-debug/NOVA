import { describe, expect, it } from 'vitest';
import { createAdjustableClock } from './clock';

describe('adjustable clock', () => {
  it('moves forward, adds up, and resets', () => {
    const c = createAdjustableClock(() => 1_000_000);
    const day = 24 * 60 * 60 * 1000;
    expect(c.now()).toBe(1_000_000);
    expect(c.shiftDays).toBe(0);
    c.advanceDays(7);
    c.advanceDays(1);
    expect(c.shiftDays).toBe(8);
    expect(c.now()).toBe(1_000_000 + 8 * day);
    c.reset();
    expect(c.now()).toBe(1_000_000);
  });
});
