import { CONFIG } from '../config';
import { EXPLANATION_STYLES } from '../types';
import type { ExplanationStyle, LearnerState, MisconceptionState } from '../types';

export interface StyleChoice {
  style: ExplanationStyle;
  reason: string;
}

const rate = (s?: { shown: number; helped: number }) => (s && s.shown ? s.helped / s.shown : 0);

/**
 * Transparent rules (the "Why this?" text comes from here):
 *  1. A style that helped before (shown >= N, help rate >= X) wins.
 *  2. If the same mistake keeps coming back, try a style not yet given a fair chance.
 *  3. Otherwise start with a plain explanation.
 * Upgrade path: swap this function for a Thompson-sampling bandit. Keep the signature.
 */
export function chooseStyle(
  state: LearnerState,
  available: ExplanationStyle[],
  misconception?: MisconceptionState,
): StyleChoice {
  const pool = available.length ? available : (['plain'] as ExplanationStyle[]);
  const { minShownToTrust, minHelpRate } = CONFIG.strategy;

  const proven = pool
    .map((style) => ({ style, s: state.strategies[style] }))
    .filter((x) => x.s && x.s.shown >= minShownToTrust && rate(x.s) >= minHelpRate)
    .sort((a, b) => rate(b.s) - rate(a.s))[0];
  if (proven) {
    return {
      style: proven.style,
      reason: `${proven.style} helped you before (${proven.s!.helped} of ${proven.s!.shown} follow-up questions correct), so NOVA uses it again.`,
    };
  }

  if (misconception && misconception.seen >= 2) {
    const untried = EXPLANATION_STYLES.filter((s) => pool.includes(s) && s !== 'plain').find(
      (s) => (state.strategies[s]?.shown ?? 0) < minShownToTrust,
    );
    if (untried) {
      return { style: untried, reason: `This mistake came back ${misconception.seen} times, so NOVA tries a different style: ${untried}.` };
    }
  }

  const first = pool.includes('plain') ? 'plain' : (pool[0] as ExplanationStyle);
  return { style: first, reason: 'NOVA has no history of what works for you yet, so it starts with a simple explanation.' };
}
