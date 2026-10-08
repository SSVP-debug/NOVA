import { describe, expect, it } from 'vitest';
import { isLowResourceDevice } from './index';
import { LocalModelAI } from './localModelAI';
import type { LocalModelRuntime } from '@/core/ports';
import type { Intervention } from '@/core/types';

const intervention: Intervention = {
  concept: 'loops',
  style: 'plain',
  evidence: 'Verified evidence.',
  reason: 'Because.',
  baseText: 'A loop repeats a block of code.',
};

describe('device-aware lite mode', () => {
  it('detects either low memory or few CPU cores and leaves unknown devices on auto', () => {
    expect(isLowResourceDevice({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe(true);
    expect(isLowResourceDevice({ deviceMemory: 8, hardwareConcurrency: 2 })).toBe(true);
    expect(isLowResourceDevice({ deviceMemory: 4, hardwareConcurrency: 4 })).toBe(false);
    expect(isLowResourceDevice({})).toBe(false);
  });
});

describe('LocalModelAI runtime cancellation', () => {
  it('aborts model generation at its configured timeout', async () => {
    const runtime: LocalModelRuntime = {
      id: 'abort-test',
      isReady: async () => true,
      generate: (_prompt, options) => new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }),
    };
    const ai = new LocalModelAI(runtime, 5);
    await expect(ai.explain({ intervention, learnerLevel: 'beginner' })).rejects.toThrow('aborted');
  });
});
