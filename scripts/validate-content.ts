import { PACKS } from '../src/content';
import { validatePack } from '../src/core/content/validate';
import { createDefaultGenerators } from '../src/generators';

const gens = createDefaultGenerators();
let failed = false;
for (const pack of PACKS) {
  const r = validatePack(pack, gens);
  console.log(`\n${pack.id}: ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  r.errors.forEach((e) => console.log('  ERROR  ' + e));
  r.warnings.forEach((w) => console.log('  warn   ' + w));
  if (r.errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
