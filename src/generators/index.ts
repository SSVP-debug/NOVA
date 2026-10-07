import { MapGeneratorRegistry } from './registry';
import { printLoop, whichRange } from './loopBounds';

/** Add new generators here. This is the ONLY place that lists them. */
export function createDefaultGenerators(): MapGeneratorRegistry {
  return new MapGeneratorRegistry([printLoop, whichRange]);
}
export { MapGeneratorRegistry };
