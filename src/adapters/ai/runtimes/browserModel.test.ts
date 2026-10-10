import { describe, expect, it } from 'vitest';
import { BrowserModelRuntime, type FromWorker, type KeyValue, type ToWorker, type WorkerLike } from './browserModel';
import { FallbackAI } from '../fallbackAI';
import { LocalModelAI } from '../localModelAI';
import { TemplateAI } from '../templateAI';



/** A pretend model worker: the real one needs a download, so tests drive the same messages by hand. */
class FakeWorker implements WorkerLike {
  sent: ToWorker[] = [];
  terminated = false;
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  autoLoad = true;
  reply = 'A variable is a named box that holds a value.';
  postMessage(m: ToWorker) {
    this.sent.push(m);
    if (m.type === 'load' && this.autoLoad) queueMicrotask(() => { this.emit({ type: 'progress', loaded: 50, total: 100 }); this.emit({ type: 'loaded' }); });
    if (m.type === 'generate') queueMicrotask(() => this.emit({ type: 'result', id: m.id, text: this.reply }));
  }
  emit(m: FromWorker) { this.onmessage?.({ data: m }); }
  terminate() { this.terminated = true; }
}
const memory = (): KeyValue & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
};
const make = (store = memory(), autoLoad = true) => {
  const workers: FakeWorker[] = [];
  const rt = new BrowserModelRuntime(() => { const w = new FakeWorker(); w.autoLoad = autoLoad; workers.push(w); return w; }, store, 'm1', 'q4', '/ort/');
  return { rt, workers, store };
};

describe('BrowserModelRuntime', () => {
  it('starts not downloaded and does nothing until the student asks', () => {
    const { rt, workers } = make();
    expect(rt.getState().status).toBe('not-downloaded');
    expect(rt.isDownloaded()).toBe(false);
    void rt.warmUp();
    expect(workers).toHaveLength(0); // no worker, no network
  });

  it('download asks the worker to fetch, reports progress, then is ready and remembered', async () => {
    const { rt, workers, store } = make();
    const seen: string[] = [];
    rt.subscribe(() => seen.push(rt.getState().status));
    await rt.download();
    expect(workers[0]!.sent[0]).toMatchObject({ type: 'load', model: 'm1', allowDownload: true, wasmBase: '/ort/' });
    expect(seen).toContain('downloading');
    expect(rt.getState().status).toBe('ready');
    expect(rt.ready()).toBe(true);
    expect(store.data.get('nova.browserModel')).toBe('m1');
  });

  it('warmUp after a download loads from the cache with the network switched off', async () => {
    const store = memory();
    await make(store).rt.download();
    const second = make(store);
    expect(second.rt.isDownloaded()).toBe(true);
    await second.rt.warmUp();
    expect(second.workers[0]!.sent[0]).toMatchObject({ type: 'load', allowDownload: false });
    expect(second.rt.ready()).toBe(true);
  });

  it('a failed load goes to the error state and forgets nothing it did not save', async () => {
    const { rt, workers, store } = make(memory(), false);
    const p = rt.download();
    workers[0]!.emit({ type: 'error', message: 'no network' });
    await expect(p).rejects.toThrow('no network');
    expect(rt.getState()).toMatchObject({ status: 'error', message: 'no network' });
    expect(workers[0]!.terminated).toBe(true);
    expect(store.data.size).toBe(0);
    await expect(rt.generate('hi')).rejects.toThrow('not ready');
  });

  it('generate returns the worker text and runs one question at a time', async () => {
    const { rt, workers } = make();
    await rt.download();
    const a = rt.generate('one', { maxTokens: 50 });
    const b = rt.generate('two');
    expect(await a).toContain('named box');
    expect(await b).toContain('named box');
    const gens = workers[0]!.sent.filter((m) => m.type === 'generate');
    expect(gens).toHaveLength(2);
    expect(gens[0]).toMatchObject({ prompt: 'one', maxTokens: 50 });
  });

  it('an abort interrupts the worker and rejects', async () => {
    const { rt, workers } = make();
    await rt.download();
    workers[0]!.reply = 'x'; workers[0]!.postMessage = function (this: FakeWorker, m: ToWorker) { this.sent.push(m); }; // never answers
    const c = new AbortController();
    const p = rt.generate('slow', { signal: c.signal });
    await Promise.resolve();
    c.abort();
    await expect(p).rejects.toThrow('Cancelled');
    expect(workers[0]!.sent.some((m) => m.type === 'interrupt')).toBe(true);
  });

  it('remove forgets the download and goes back to templates', async () => {
    const { rt, workers, store } = make();
    await rt.download();
    await rt.remove();
    expect(workers[0]!.terminated).toBe(true);
    expect(rt.getState().status).toBe('not-downloaded');
    expect(rt.isDownloaded()).toBe(false);
    expect(store.data.size).toBe(0);
  });

  it('works under LocalModelAI and falls back to templates when the model is silent', async () => {
    const { rt, workers } = make();
    await rt.download();
    const req = { intervention: { style: 'plain', evidence: 'e', baseText: 'A variable is a name that points to a value.' }, learnerLevel: 'beginner' } as never;
    const ok = new FallbackAI(new LocalModelAI(rt, 200), new TemplateAI(), 200);
    expect(await ok.explain(req)).toContain('named box');
    workers[0]!.postMessage = function (this: FakeWorker, m: ToWorker) { this.sent.push(m); }; // model stops answering
    expect(await ok.explain(req)).toContain('A variable is a name'); // template text, no throw
  });
});
