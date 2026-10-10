# E1: optional on-device model in the browser

## What the student sees
Settings > **On-device AI model (optional)**. Button **Download model** (one-time, needs internet), a progress bar, then "Model ready". **Remove model** frees the storage. Without it NOVA works exactly as before.

## What the code does
- `runtimes/browserModel.ts`: `BrowserModelRuntime` implements `LocalModelRuntime`. Runs one question at a time, supports abort, remembers the download in `localStorage`, loads from cache with `local_files_only` (no network) on the next visit.
- `runtimes/modelWorker.ts`: Web Worker with Transformers.js, so the page never freezes while the model thinks.
- `adapters/ai/index.ts`: `AutoAI` uses the model only while it is loaded; otherwise templates answer at once. `FallbackAI` still covers timeouts and errors. Ollama via `.env.local` still works and has priority.
- `ui/ModelSettings.tsx`: the Settings card. Disabled on low-resource devices and when offline.
- `config.ts`: `browserModelId` (SmolLM2-360M-Instruct, q4), `browserModelTimeoutMs` (15 s).
- Build: `scripts/copy-ort.ts` (runs before `dev` and `build`) copies the engine into `public/ort` (git-ignored). `vite.config.ts` keeps the big worker (`assets/ai-model-*.js`) out of the app's saved files and saves it when it is first used. `check:offline` knows about this.

## Rule 5 in AGENTS.md (needs your OK)
"No network calls in the core learning loop... local model runtimes are the only exception, and only on the same device."
The model files come from the internet **once**, only after the student presses Download. After that nothing leaves the device. If you want a stricter reading, the answer is to host the model files on your own site (set `env.remoteHost` in `modelWorker.ts`). The learning loop itself still makes no calls.

## Honest status
- `npm run check` passes (183 tests) and `npm run build` + `npm run check:offline` pass. The saved app is still 465 KB (142 KB gzip).
- Tested with a **pretend worker**. The real download was **not** run (no access to the model host from the build machine). The model size, speed, answer quality and the offline reload after download are **not measured**.
- The engine file (about 27 MB) is the asyncify build. Old Safari (below 26) may need another file. If the model fails, the student sees a plain message and templates keep working.
- Model answers are still only a rewording of verified text. Code decides.

## Commands
```
npm install
npm run check
npm run build
npm run check:offline
npm run dev
```
