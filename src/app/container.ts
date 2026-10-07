import { createAI } from '@/adapters/ai';
import { DexieStorage } from '@/adapters/storage/dexieStorage';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { DEFAULT_PACK_ID, getPack } from '@/content';
import type { AIPort, Clock, GeneratorRegistry, StoragePort } from '@/core/ports';
import type { ContentPack } from '@/core/types';
import { createDefaultGenerators } from '@/generators';

/** Composition root: the ONLY place that decides which adapter implements which port. */
export interface Services {
  pack: ContentPack;
  storage: StoragePort;
  ai: AIPort;
  clock: Clock;
  generators: GeneratorRegistry;
}

export function createServices(overrides: Partial<Services> = {}): Services {
  const hasIDB = typeof indexedDB !== 'undefined';
  return {
    pack: getPack(DEFAULT_PACK_ID),
    storage: hasIDB ? new DexieStorage() : new MemoryStorage(),
    ai: createAI('auto'),
    clock: { now: () => Date.now() },
    generators: createDefaultGenerators(),
    ...overrides,
  };
}
