import type { LocalModelRuntime } from '@/core/ports';
import { CONFIG } from '@/core/config';

/** Messages between the page and the model worker. */
export type ToWorker =
  | { type: 'load'; model: string; dtype: string; wasmBase: string; allowDownload: boolean }
  | { type: 'generate'; id: number; prompt: string; maxTokens: number }
  | { type: 'interrupt' };
export type FromWorker =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'loaded' }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id?: number; message: string };

export interface WorkerLike {
  postMessage(msg: ToWorker): void;
  terminate(): void;
  onmessage: ((e: { data: FromWorker }) => void) | null;
  onerror: ((e: { message?: string }) => void) | null;
}
export interface KeyValue { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export type ModelStatus = 'not-downloaded' | 'downloading' | 'loading' | 'ready' | 'error';
export interface ModelState { status: ModelStatus; loaded: number; total: number; message?: string }

const MARKER = 'nova.browserModel';
const CACHE_NAME = 'transformers-cache'; // the cache Transformers.js uses for model files

/**
 * A small language model that runs inside the browser, on this device, in a Web Worker.
 * - Nothing is downloaded until the student presses "Download model" (one-time, needs internet).
 * - After that it loads from the browser cache with the network switched off (local_files_only).
 * - It is optional: every caller is wrapped by FallbackAI, and templates always work.
 */
export class BrowserModelRuntime implements LocalModelRuntime {
  readonly id: string;
  private worker: WorkerLike | null = null;
  private state: ModelState = { status: 'not-downloaded', loaded: 0, total: 0 };
  private listeners = new Set<() => void>();
  private pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
  private loading: Promise<void> | null = null;
  private loadDone: { resolve: () => void; reject: (e: Error) => void } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;

  constructor(
    private createWorker: () => WorkerLike,
    private store: KeyValue | null = typeof localStorage === 'undefined' ? null : localStorage,
    private model: string = CONFIG.ai.browserModelId,
    private dtype: string = CONFIG.ai.browserModelDtype,
    private wasmBase: string = '/ort/',
  ) {
    this.id = `browser:${model}`;
  }

  // ---- state for the Settings screen ----
  getState = (): ModelState => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(next: ModelState) { this.state = next; this.listeners.forEach((l) => l()); }

  /** True after a successful download on this device (the files are in the browser cache). */
  isDownloaded(): boolean {
    try { return this.store?.getItem(MARKER) === this.model; } catch { return false; }
  }
  async isReady() { return this.state.status === 'ready'; }
  ready(): boolean { return this.state.status === 'ready'; }

  private start(allowDownload: boolean): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = new Promise<void>((resolve, reject) => {
      this.loadDone = { resolve, reject };
      try {
        const w = this.createWorker();
        this.worker = w;
        w.onmessage = (e) => this.onMessage(e.data);
        w.onerror = (e) => this.fail(e.message ?? 'The model could not start.');
        w.postMessage({ type: 'load', model: this.model, dtype: this.dtype, wasmBase: this.wasmBase, allowDownload });
      } catch (err) {
        this.fail(err instanceof Error ? err.message : 'The model could not start.');
      }
    });
    this.loading.catch(() => { /* the error is in state */ });
    return this.loading;
  }

  /** Student pressed "Download model". Needs internet once. */
  download(): Promise<void> {
    if (this.state.status === 'downloading' || this.state.status === 'loading' || this.state.status === 'ready') return this.loading ?? Promise.resolve();
    this.set({ status: 'downloading', loaded: 0, total: 0 });
    return this.start(true);
  }

  /** On app start: if a model was downloaded before, load it from the cache. No network. */
  warmUp(): Promise<void> {
    if (!this.isDownloaded() || this.state.status !== 'not-downloaded') return Promise.resolve();
    this.set({ status: 'loading', loaded: 0, total: 0 });
    return this.start(false);
  }

  private onMessage(m: FromWorker) {
    if (m.type === 'progress') {
      if (this.state.status === 'downloading') this.set({ status: 'downloading', loaded: m.loaded, total: m.total });
    } else if (m.type === 'loaded') {
      try { this.store?.setItem(MARKER, this.model); } catch { /* private mode: works this session only */ }
      this.set({ status: 'ready', loaded: this.state.loaded, total: this.state.total });
      this.loadDone?.resolve(); this.loadDone = null;
    } else if (m.type === 'result') {
      this.pending.get(m.id)?.resolve(m.text); this.pending.delete(m.id);
    } else if (m.type === 'error') {
      if (m.id === undefined) this.fail(m.message);
      else { this.pending.get(m.id)?.reject(new Error(m.message)); this.pending.delete(m.id); }
    }
  }

  private fail(message: string) {
    this.worker?.terminate(); this.worker = null; this.loading = null;
    this.pending.forEach((p) => p.reject(new Error(message))); this.pending.clear();
    this.set({ status: 'error', loaded: 0, total: 0, message });
    this.loadDone?.reject(new Error(message)); this.loadDone = null;
  }

  /** One question at a time: a small device cannot run two generations together. */
  generate(prompt: string, opts: { maxTokens?: number; signal?: AbortSignal } = {}): Promise<string> {
    const run = () => new Promise<string>((resolve, reject) => {
      if (!this.worker || this.state.status !== 'ready') { reject(new Error('Model is not ready')); return; }
      if (opts.signal?.aborted) { reject(new Error('Cancelled')); return; }
      const id = this.nextId++;
      const onAbort = () => { this.worker?.postMessage({ type: 'interrupt' }); this.pending.delete(id); reject(new Error('Cancelled')); };
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      this.pending.set(id, {
        resolve: (t) => { opts.signal?.removeEventListener('abort', onAbort); resolve(t); },
        reject: (e) => { opts.signal?.removeEventListener('abort', onAbort); reject(e); },
      });
      this.worker.postMessage({ type: 'generate', id, prompt, maxTokens: opts.maxTokens ?? 160 });
    });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /** "Remove model": frees the storage and goes back to templates. */
  async remove(): Promise<void> {
    this.worker?.terminate(); this.worker = null; this.loading = null; this.loadDone = null;
    this.pending.forEach((p) => p.reject(new Error('Model removed'))); this.pending.clear();
    try { this.store?.removeItem(MARKER); } catch { /* ignore */ }
    try { if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME); } catch { /* ignore */ }
    this.set({ status: 'not-downloaded', loaded: 0, total: 0 });
  }
}

/** The one model for this page. The worker is created only when needed. */
export const browserModel = new BrowserModelRuntime(
  () => new Worker(new URL('./modelWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
  typeof localStorage === 'undefined' ? null : localStorage,
  CONFIG.ai.browserModelId,
  CONFIG.ai.browserModelDtype,
  typeof location === 'undefined' ? '/ort/' : new URL(`${import.meta.env?.BASE_URL ?? '/'}ort/`, location.href).href,
);
