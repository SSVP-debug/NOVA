import { PACKS } from '@/content';
import { createDefaultGenerators } from '@/generators';
import type { AttemptEvent } from '@/core/types';

export const pack = PACKS[0]!;
export const generators = createDefaultGenerators();
export const NOW = 1_800_000_000_000;

export function attempt(over: Partial<AttemptEvent> = {}): AttemptEvent {
  return {
    type: 'attempt', at: NOW, questionId: 'q#1', specId: 'q', concept: 'loop-bounds', chosenOptionId: 'o1',
    correct: false, confidence: 'sure', timeMs: 10000, hintsUsed: 0, isProbe: false, ...over,
  };
}
