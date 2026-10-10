/**
 * Offline-readiness check for the PRODUCTION build (run `npm run build` first).
 * It cannot replace a real browser test (see docs/OFFLINE_TEST.md), but it catches the common
 * reasons offline fails: a file the page needs that the service worker does not save, a font or
 * script loaded from the internet, or a broken manifest.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const MAX_PRECACHE_GZIP_KB = 1024; // the saved app should stay small for low-resource devices

// Hosts that appear only as text inside libraries (error-message links, XML namespaces) or the optional
// same-laptop model runtime. They are never fetched while the student learns.
const ALLOWED_HOSTS = new Set(['www.w3.org', 'react.dev', 'tinyurl.com', 'bit.ly', 'localhost:11434']);

const errors: string[] = [];
const ok: string[] = [];
const fail = (m: string) => errors.push(m);
const BASE = (process.env.VITE_BASE ?? '/').replace(/^\/+|\/+$/g, ''); // '' for site root, 'NOVA' for /NOVA/
const stripBase = (u: string) => (BASE && u.startsWith(BASE + '/') ? u.slice(BASE.length + 1) : u === BASE ? '' : u);
const norm = (u: string) => stripBase(u.replace(/^https?:\/\/[^/]+/, '').replace(/^\.?\//, '').split('#')[0]!.split('?')[0]!);

if (!existsSync(DIST)) {
  console.error('No dist folder. Run "npm run build" first.');
  process.exit(1);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(DIST).map((f) => relative(DIST, f).replace(/\\/g, '/'));

// 1. service worker and the list of files it saves
const swPath = join(DIST, 'sw.js');
let precache = new Set<string>();
if (!existsSync(swPath)) fail('dist/sw.js is missing: the service worker was not built.');
else {
  const sw = readFileSync(swPath, 'utf8');
  precache = new Set([...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => norm(m[1]!)));
  if (!/precacheAndRoute/.test(sw)) fail('sw.js does not call precacheAndRoute: nothing is saved for offline.');
  if (!/NavigationRoute|createHandlerBoundToURL/.test(sw)) fail('sw.js has no navigation fallback: reloading offline would fail.');
  if (!precache.has('index.html')) fail('index.html is not in the saved files.');
  else ok.push(`service worker saves ${precache.size} files, including index.html and a navigation fallback`);
}

// 2. everything index.html needs must be saved
const html = existsSync(join(DIST, 'index.html')) ? readFileSync(join(DIST, 'index.html'), 'utf8') : '';
if (!html) fail('dist/index.html is missing.');
const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]!).filter((r) => !r.startsWith('data:'));
for (const r of refs) {
  if (/^https?:\/\//.test(r) || r.startsWith('//')) fail(`index.html loads from the internet: ${r}`);
  else if (!precache.has(norm(r))) fail(`index.html needs "${r}" but the service worker does not save it.`);
}
if (refs.length && !errors.some((e) => e.startsWith('index.html'))) ok.push(`all ${refs.length} files used by index.html are saved`);

// 3. every built asset must be saved
const assets = files.filter((f) => f.startsWith('assets/'));
// The optional model engine is saved on demand (first download), not with the app.
const ON_DEMAND = /^assets\/(ai-model-[^/]+\.js|ort-wasm-[^/]+\.wasm)$/; // engine script, and the library's own unused copy of the engine
const unsaved = assets.filter((f) => !precache.has(f) && !ON_DEMAND.test(f));
if (unsaved.length) fail(`built files not saved for offline: ${unsaved.join(', ')}`);
else ok.push(`all ${assets.length} built files in assets/ are saved`);

// 4. manifest
const mPath = join(DIST, 'manifest.webmanifest');
if (!existsSync(mPath)) fail('manifest.webmanifest is missing.');
else {
  const m = JSON.parse(readFileSync(mPath, 'utf8')) as { name?: string; short_name?: string; start_url?: string; display?: string; icons?: { src: string }[] };
  for (const k of ['name', 'short_name', 'start_url', 'display'] as const) if (!m[k]) fail(`manifest is missing "${k}".`);
  if (!m.icons?.length) fail('manifest has no icons.');
  for (const i of m.icons ?? []) if (!files.includes(norm(i.src))) fail(`manifest icon "${i.src}" is not in dist.`);
  if (!precache.has('manifest.webmanifest')) fail('manifest.webmanifest is not saved offline.');
  if (!errors.some((e) => e.includes('manifest'))) ok.push('manifest is complete and its icons exist');
}

// 5. nothing loaded from the internet
// The on-demand model engine contains library text with CDN/model-hub addresses; it is checked separately below.
const textFiles = files.filter((f) => /\.(html|css|js|webmanifest|svg)$/.test(f) && !ON_DEMAND.test(f));
const hosts = new Map<string, string[]>();
for (const f of textFiles) {
  for (const m of readFileSync(join(DIST, f), 'utf8').matchAll(/https?:\/\/([a-zA-Z0-9._:-]+)/g)) {
    const h = m[1]!;
    hosts.set(h, [...new Set([...(hosts.get(h) ?? []), f])]);
  }
}
const unknown = [...hosts.keys()].filter((h) => !ALLOWED_HOSTS.has(h));
if (unknown.length) fail(`unexpected internet addresses in the build: ${unknown.map((h) => `${h} (in ${hosts.get(h)!.join(', ')})`).join('; ')}`);
else ok.push(`no unexpected internet addresses (${[...hosts.keys()].join(', ') || 'none'} are text only)`);
for (const f of textFiles.filter((x) => x.endsWith('.css'))) {
  if (/@import\s+url\(\s*["']?https?:/.test(readFileSync(join(DIST, f), 'utf8'))) fail(`${f} imports a stylesheet or font from the internet.`);
}

// 5b. the optional model needs its engine files served from this site, or it cannot start offline
const hasModelEngine = files.some((f) => ON_DEMAND.test(f));
if (hasModelEngine) {
  const need = ['ort/ort-wasm-simd-threaded.asyncify.mjs', 'ort/ort-wasm-simd-threaded.asyncify.wasm'];
  const missing = need.filter((f) => !files.includes(f));
  if (missing.length) fail(`the optional model engine needs ${missing.join(', ')} in dist (run npm install, then build again).`);
  else ok.push('optional model: engine files are served from this site and saved when the model is downloaded');
}

// 6. size report (useful as evidence for low-resource devices)
const saved = [...precache].filter((f) => files.includes(f));
const sizes = saved.map((f) => {
  const buf = readFileSync(join(DIST, f));
  return { f, raw: buf.length, gz: gzipSync(buf).length };
});
const totalRaw = sizes.reduce((a, b) => a + b.raw, 0);
const totalGz = sizes.reduce((a, b) => a + b.gz, 0);
if (totalGz / 1024 > MAX_PRECACHE_GZIP_KB) fail(`saved files are ${(totalGz / 1024).toFixed(0)} KB gzipped, more than the ${MAX_PRECACHE_GZIP_KB} KB limit.`);

console.log('\nOffline readiness of the production build\n');
ok.forEach((m) => console.log('  ok    ' + m));
errors.forEach((m) => console.log('  FAIL  ' + m));
console.log('\nFiles saved for offline use (largest first):');
sizes.sort((a, b) => b.raw - a.raw).slice(0, 6).forEach((s) => console.log(`  ${s.f.padEnd(46)} ${(s.raw / 1024).toFixed(1).padStart(7)} KB   ${(s.gz / 1024).toFixed(1).padStart(6)} KB gzip`));
console.log(`  ${'TOTAL'.padEnd(46)} ${(totalRaw / 1024).toFixed(1).padStart(7)} KB   ${(totalGz / 1024).toFixed(1).padStart(6)} KB gzip\n`);
process.exit(errors.length ? 1 : 0);
