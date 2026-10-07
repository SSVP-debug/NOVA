import { CONFIG } from '../config';
import type { Confidence } from '../types';

/**
 * Reference rule (simple, explainable). Upgrade path: replace with Bayesian Knowledge Tracing.
 * Keep the signature and nothing else needs to change.
 */
export function nextMastery(prev: number, correct: boolean, confidence: Confidence): number {
  const m = CONFIG.mastery;
  let next: number;
  if (correct) {
    const w = confidence === 'guess' ? m.guessWeight : 1;
    next = prev + (1 - prev) * m.gainOnCorrect * w;
  } else {
    const loss = confidence === 'sure' ? m.lossOnSureWrong : m.lossOnWrong;
    next = prev - prev * loss;
  }
  return Math.min(1, Math.max(0, next));
}
