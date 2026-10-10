import { createAI } from '@/adapters/ai';
import { DexieStorage } from '@/adapters/storage/dexieStorage';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { DEFAULT_PACK_ID, getPack, PACKS } from '@/content';
import type { AIPort, Clock, GeneratorRegistry, StoragePort } from '@/core/ports';
import type { ContentPack } from '@/core/types';
import { createAdjustableClock, type AdjustableClock } from './clock';
import { createDefaultGenerators } from '@/generators';

/** Composition root: the ONLY place that decides which adapter implements which port. */
export interface Services {
  pack: ContentPack; // the pack in use; the session swaps it when the student picks another subject
  packs: ContentPack[]; // every subject the student can pick (the first is the default)
  storage: StoragePort;
  ai: AIPort;
  clock: Clock;
  demoClock?: AdjustableClock; // set when `clock` is adjustable (demo tools move time with it)
  generators: GeneratorRegistry;
}

export function createServices(overrides: Partial<Services> = {}): Services {
  const hasIDB = typeof indexedDB !== 'undefined';
  const adjustable = createAdjustableClock();
  const services: Services = {
    pack: getPack(DEFAULT_PACK_ID),
    packs: PACKS,
    storage: hasIDB ? new DexieStorage() : new MemoryStorage(),
    ai: createAI('auto'),
    clock: adjustable,
    demoClock: adjustable,
    generators: createDefaultGenerators(),
    ...overrides,
  };
  // A custom pack (tests) is the only subject unless the caller also says otherwise.
  if (overrides.pack && !('packs' in overrides)) services.packs = [overrides.pack];
  // A custom clock (tests) is only movable if the caller also says so.
  if (overrides.clock && !('demoClock' in overrides)) services.demoClock = undefined;
  return services;
}
