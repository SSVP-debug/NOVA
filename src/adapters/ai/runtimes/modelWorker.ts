/// <reference lib="webworker" />
// Runs the small language model OFF the main thread so lessons and buttons never freeze.
// Loaded only when the student presses "Download model" in Settings (or when a model was downloaded before).
import { env, InterruptableStoppingCriteria, pipeline } from '@huggingface/transformers';
import type { ToWorker, FromWorker } from './browserModel';

type Generator = (messages: { role: string; content: string }[], opts: Record<string, unknown>) => Promise<{ generated_text: { content: string }[] }[]>;

let generator: Generator | null = null;
const stop = new InterruptableStoppingCriteria();
const send = (m: FromWorker) => (self as unknown as { postMessage(m: unknown): void }).postMessage(m);

async function load(msg: Extract<ToWorker, { type: 'load' }>) {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  // Serve the engine from our own site (copied by scripts/copy-ort.ts) so it works offline.
  const onnx = env.backends.onnx as unknown as { wasm: { wasmPaths: unknown } };
  onnx.wasm.wasmPaths = {
    mjs: `${msg.wasmBase}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${msg.wasmBase}ort-wasm-simd-threaded.asyncify.wasm`,
  };
  const files = new Map<string, { loaded: number; total: number }>();
  const make = pipeline as unknown as (task: string, model: string, opts: Record<string, unknown>) => Promise<Generator>;
  generator = await make('text-generation', msg.model, {
    dtype: msg.dtype,
    device: 'wasm',
    local_files_only: !msg.allowDownload, // no network unless the student asked for the download
    progress_callback: (e: { status?: string; file?: string; loaded?: number; total?: number }) => {
      if (e.status !== 'progress' || !e.file) return;
      files.set(e.file, { loaded: e.loaded ?? 0, total: e.total ?? 0 });
      let loaded = 0; let total = 0;
      files.forEach((f) => { loaded += f.loaded; total += f.total; });
      send({ type: 'progress', loaded, total });
    },
  });
  send({ type: 'loaded' });
}

async function generate(msg: Extract<ToWorker, { type: 'generate' }>) {
  if (!generator) throw new Error('Model is not loaded');
  stop.reset();
  const out = await generator([{ role: 'user', content: msg.prompt }], {
    max_new_tokens: msg.maxTokens,
    do_sample: false,
    stopping_criteria: stop,
  });
  const text = out[0]?.generated_text.at(-1)?.content ?? '';
  send({ type: 'result', id: msg.id, text });
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === 'interrupt') { stop.interrupt(); return; }
  const run = msg.type === 'load' ? load(msg) : generate(msg);
  run.catch((err: unknown) => send({ type: 'error', id: msg.type === 'generate' ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) }));
};
