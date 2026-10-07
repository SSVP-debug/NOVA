import type { LocalModelRuntime } from '@/core/ports';

/**
 * Example runtime: Ollama running on the same laptop (http://localhost:11434).
 * The laptop is the device. Note: this call appears in the network tab as a request to localhost.
 * To add WebLLM or Transformers.js, create another file here that implements LocalModelRuntime.
 */
export class OllamaRuntime implements LocalModelRuntime {
  readonly id: string;
  constructor(private model: string, private baseUrl = 'http://localhost:11434') { this.id = `ollama:${model}`; }

  async isReady() {
    try { return (await fetch(`${this.baseUrl}/api/tags`)).ok; } catch { return false; }
  }

  async generate(prompt: string, opts: { maxTokens?: number; signal?: AbortSignal } = {}) {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false, options: { num_predict: opts.maxTokens ?? 160, temperature: 0.3 } }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response ?? '';
  }
}
