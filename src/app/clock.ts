import type { Clock } from '@/core/ports';

/**
 * The app clock. Everything in the app asks `services.clock.now()` and never calls Date.now directly
 * (a test enforces this), so time can be moved forward for the demo: "advance 7 days" shows the
 * review schedule working without waiting a week.
 */
export interface AdjustableClock extends Clock {
  readonly shiftDays: number;
  advanceDays(days: number): void;
  reset(): void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function createAdjustableClock(base: () => number = () => Date.now()): AdjustableClock {
  let shift = 0;
  return {
    now: () => base() + shift * DAY_MS,
    get shiftDays() { return shift; },
    advanceDays(days: number) { shift += days; },
    reset() { shift = 0; },
  };
}
