import { MapGeneratorRegistry } from './registry';
import { accumulatorInit, indexVsValue, loopCondition, recursionBaseCase } from './fundamentals';
import { printLoop, whichRange } from './loopBounds';

/** Add new generators here. This is the ONLY place that lists them. */
export function createDefaultGenerators(): MapGeneratorRegistry {
  return new MapGeneratorRegistry([
    printLoop,
    whichRange,
    accumulatorInit,
    loopCondition,
    indexVsValue,
    recursionBaseCase,
  ]);
}
export { MapGeneratorRegistry };
