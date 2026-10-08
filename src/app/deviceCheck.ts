/**
 * "Device check" for task D4: measures real numbers on the device it runs on (use it on the weakest device).
 * It times the engine, reads the page load timing and (where the browser allows it) memory and storage use.
 * Nothing leaves the device. Results can be copied as text into docs/EVIDENCE.md.
 */
import { applyAttempt, createLearner, materializeQuestion, nextDiagnosticQuestion, planToday, selectQuestion } from '@/core/engine';
import type { GeneratorRegistry } from '@/core/ports';
import type { AttemptEvent, ContentPack } from '@/core/types';

export interface DeviceCheckResult {
  engine: { name: string; micros: number }[]; // mean microseconds per call
  page: { domContentLoadedMs?: number; loadMs?: number; firstContentfulPaintMs?: number };
  memoryMB?: number; // JS heap in use (Chrome only)
  storageUsedMB?: number; // saved app + profiles (browsers that report it)
  device: { cores?: number; memoryGB?: number; online: boolean; userAgent: string };
}

interface Env {
  perf: Pick<Performance, 'now' | 'getEntriesByType'> & { memory?: { usedJSHeapSize: number } };
  nav: { hardwareConcurrency?: number; deviceMemory?: number; onLine?: boolean; userAgent?: string; storage?: { estimate?: () => Promise<{ usage?: number }> } };
}

const sampleEvent = (concept: string): AttemptEvent => ({
  type: 'attempt', at: 1, questionId: 'q#1', specId: 'q', concept, chosenOptionId: 'o1', correct: false, misconception: undefined,
  confidence: 'sure', timeMs: 5000, hintsUsed: 0, isProbe: false,
});

export async function runDeviceCheck(
  i: { pack: ContentPack; generators: GeneratorRegistry },
  env: Env = { perf: performance, nav: typeof navigator === 'undefined' ? {} : navigator },
  iterations = 300,
): Promise<DeviceCheckResult> {
  const { pack, generators } = i;
  const concept = pack.questions[0]?.concept ?? pack.concepts[0]!.id;
  const gen = pack.questions.find((q) => q.kind === 'generated') ?? pack.questions[0]!;
  let state = createLearner('check', pack, 0);
  for (let k = 0; k < 60; k++) state = applyAttempt(state, { ...sampleEvent(concept), at: k, correct: k % 3 !== 0 }, pack); // a learner with history
  const ev = sampleEvent(concept);
  let seed = 1;

  const time = (name: string, fn: () => void) => {
    for (let k = 0; k < 20; k++) fn(); // warm up
    const t = env.perf.now();
    for (let k = 0; k < iterations; k++) fn();
    return { name, micros: ((env.perf.now() - t) * 1000) / iterations };
  };
  const engine = [
    time('Save one answer (applyAttempt)', () => applyAttempt(state, ev, pack)),
    time("Build today's plan", () => planToday(state, pack, 100)),
    time('Pick the next question', () => selectQuestion({ pack, state, generators, concept, seed: seed++ })),
    time('Generate one question', () => materializeQuestion(gen, generators, seed++, [])),
    time('Next quick-check question', () => nextDiagnosticQuestion({ pack, generators, events: [], seed: seed++ })),
  ];

  const nav = env.perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const fcp = env.perf.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint');
  let storageUsedMB: number | undefined;
  try {
    const est = await env.nav.storage?.estimate?.();
    if (est?.usage !== undefined) storageUsedMB = est.usage / 1048576;
  } catch { /* some browsers refuse; leave it out */ }

  return {
    engine,
    page: { domContentLoadedMs: nav?.domContentLoadedEventEnd, loadMs: nav?.loadEventEnd, firstContentfulPaintMs: fcp?.startTime },
    memoryMB: env.perf.memory ? env.perf.memory.usedJSHeapSize / 1048576 : undefined,
    storageUsedMB,
    device: { cores: env.nav.hardwareConcurrency, memoryGB: env.nav.deviceMemory, online: env.nav.onLine ?? true, userAgent: env.nav.userAgent ?? 'unknown' },
  };
}

const f = (n: number | undefined, unit: string, d = 0) => (n === undefined || !Number.isFinite(n) ? 'not available in this browser' : `${n.toFixed(d)} ${unit}`);

/** Plain text to paste into docs/EVIDENCE.md. */
export function formatDeviceCheck(r: DeviceCheckResult): string {
  return [
    'Device check',
    `Browser: ${r.device.userAgent}`,
    `CPU cores: ${r.device.cores ?? 'unknown'}   Memory (rounded by the browser): ${r.device.memoryGB !== undefined ? r.device.memoryGB + ' GB' : 'unknown'}   Online: ${r.device.online ? 'yes' : 'no'}`,
    `Page: DOM ready ${f(r.page.domContentLoadedMs, 'ms')}; fully loaded ${f(r.page.loadMs, 'ms')}; first content ${f(r.page.firstContentfulPaintMs, 'ms')}`,
    `JS memory in use: ${f(r.memoryMB, 'MB', 1)}   Storage used (app + profiles): ${f(r.storageUsedMB, 'MB', 1)}`,
    'Engine (mean per call):',
    ...r.engine.map((e) => `  ${e.name}: ${e.micros.toFixed(1)} microseconds`),
  ].join('\n');
}
