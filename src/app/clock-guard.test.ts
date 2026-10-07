// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard for backlog A6: all app time comes from the injected Clock, so the demo can move time.
 * Only these places may read the real time directly.
 */
const ALLOWED = new Set([
  'src/app/clock.ts', // the clock itself
  'src/core/util/id.ts', // fallback id when crypto is missing (not "learning time")
]);
const ALLOWED_PREFIX = ['src/adapters/']; // storage adapters stamp export files (metadata only)

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('no direct reads of the real time', () => {
  it('Date.now() and new Date() appear only where allowed', () => {
    const offenders = files('src')
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) && f !== 'src/testkit.ts')
      .filter((f) => !ALLOWED.has(f) && !ALLOWED_PREFIX.some((p) => f.startsWith(p)))
      .filter((f) => /Date\.now\s*\(|new Date\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders, `Use services.clock.now() instead of the real time in: ${offenders.join(', ')}`).toEqual([]);
  });
});
