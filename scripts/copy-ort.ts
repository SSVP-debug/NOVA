/**
 * Copies the model engine (ONNX Runtime, WASM) into public/ort so NOVA serves it from its own site.
 * Without this the engine would load from a CDN and the model could not start offline.
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILES = ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'] as const;

// The package hides package.json behind "exports", so look in node_modules directly.
const candidates = [
  join('node_modules', 'onnxruntime-web', 'dist'),
  join('node_modules', '@huggingface', 'transformers', 'node_modules', 'onnxruntime-web', 'dist'),
];
const dist = candidates.find((d) => existsSync(join(d, FILES[1])));
if (!dist) {
  console.warn('copy-ort: onnxruntime-web is not installed. The optional on-device model will not work. Run npm install.');
  process.exit(0);
}
mkdirSync('public/ort', { recursive: true });
for (const f of FILES) copyFileSync(join(dist, f), join('public/ort', f));
console.log(`copy-ort: copied ${FILES.length} engine files to public/ort`);
