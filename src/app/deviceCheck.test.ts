import { describe, expect, it } from 'vitest';
import { generators, pack } from '@/testkit';
import { formatDeviceCheck, runDeviceCheck } from './deviceCheck';

// a fake clock that moves 0.5 ms every time it is read
const fakePerf = (extra: object = {}) => { let t = 0; return { now: () => (t += 0.5), getEntriesByType: () => [], ...extra } as never; };

describe('device check', () => {
  it('times every engine step and copes with browsers that hide details', async () => {
    const r = await runDeviceCheck({ pack, generators }, { perf: fakePerf(), nav: {} }, 20);
    expect(r.engine.map((e) => e.name)).toEqual([
      'Save one answer (applyAttempt)', "Build today's plan", 'Pick the next question', 'Generate one question', 'Next quick-check question',
    ]);
    expect(r.engine.every((e) => e.micros > 0)).toBe(true);
    expect(r.memoryMB).toBeUndefined();
    expect(r.storageUsedMB).toBeUndefined();
    const text = formatDeviceCheck(r);
    expect(text).toMatch(/not available in this browser/);
    expect(text).toMatch(/microseconds/);
  });

  it('reports memory, storage, cores and page timing when the browser gives them', async () => {
    const perf = fakePerf({
      memory: { usedJSHeapSize: 20 * 1048576 },
      getEntriesByType: (t: string) => (t === 'navigation' ? [{ domContentLoadedEventEnd: 310, loadEventEnd: 420 }] : [{ name: 'first-contentful-paint', startTime: 250 }]),
    });
    const nav = { hardwareConcurrency: 4, deviceMemory: 2, onLine: false, userAgent: 'TestBrowser/1', storage: { estimate: async () => ({ usage: 3 * 1048576 }) } };
    const r = await runDeviceCheck({ pack, generators }, { perf, nav }, 20);
    expect(r).toMatchObject({ memoryMB: 20, storageUsedMB: 3, device: { cores: 4, memoryGB: 2, online: false } });
    const text = formatDeviceCheck(r);
    expect(text).toMatch(/DOM ready 310 ms; fully loaded 420 ms; first content 250 ms/);
    expect(text).toMatch(/JS memory in use: 20.0 MB/);
    expect(text).toMatch(/Storage used \(app \+ profiles\): 3.0 MB/);
    expect(text).toMatch(/CPU cores: 4 .*2 GB.*Online: no/);
  });

  it('survives a browser that refuses the storage estimate', async () => {
    const nav = { storage: { estimate: async () => { throw new Error('denied'); } } };
    const r = await runDeviceCheck({ pack, generators }, { perf: fakePerf(), nav }, 5);
    expect(r.storageUsedMB).toBeUndefined();
  });
});
