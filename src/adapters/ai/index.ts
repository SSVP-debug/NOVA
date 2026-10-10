import type { AIPort, DoubtRequest, ExplainRequest, TeachBackRequest } from '@/core/ports';
import { CONFIG } from '@/core/config';
import { FallbackAI } from './fallbackAI';
import { LocalModelAI } from './localModelAI';
import { OllamaRuntime } from './runtimes/ollama';
import { browserModel } from './runtimes/browserModel';
import { TemplateAI } from './templateAI';

export interface DeviceResources {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

/** Prefer the reliable template path when the browser reports a low-resource device. */
export function isLowResourceDevice(
  device: DeviceResources = typeof navigator === 'undefined' ? {} : navigator,
): boolean {
  return (device.hardwareConcurrency !== undefined && device.hardwareConcurrency <= CONFIG.ai.liteModeMaxCores)
    || (device.deviceMemory !== undefined && device.deviceMemory <= CONFIG.ai.liteModeMaxMemoryGB);
}

/**
 * Picks the AI for this device. Lite mode (aiMode 'off') or no configured runtime = templates only.
 * Configure with VITE_AI_RUNTIME=ollama and VITE_OLLAMA_MODEL=<model name> in .env.local.
 * Otherwise the optional in-browser model (Settings > On-device AI model) is used once downloaded.
 */
export function createAI(aiMode: 'auto' | 'off' = 'auto'): AIPort {
  const template = new TemplateAI();
  if (aiMode === 'off') return template;
  if (isLowResourceDevice()) return template;
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_AI_RUNTIME === 'ollama') {
    const runtime = new OllamaRuntime(env.VITE_OLLAMA_MODEL ?? 'gemma3:1b');
    return new FallbackAI(new LocalModelAI(runtime), template, CONFIG.ai.timeoutMs);
  }
  if (typeof Worker === 'undefined') return template;
  void browserModel.warmUp(); // only does something if the student downloaded the model before
  return new AutoAI(template);
}

/**
 * Uses the in-browser model only while it is loaded; otherwise (not downloaded, still loading,
 * or failed) it answers with verified templates straight away. Never waits for a model that is not there.
 */
class AutoAI implements AIPort {
  readonly id = 'auto';
  private withModel: AIPort;
  constructor(private template: AIPort) {
    this.withModel = new FallbackAI(new LocalModelAI(browserModel, CONFIG.ai.browserModelTimeoutMs), template, CONFIG.ai.browserModelTimeoutMs);
  }
  async isAvailable() { return true; }
  private pick(): AIPort { return browserModel.ready() ? this.withModel : this.template; }
  explain(req: ExplainRequest) { return this.pick().explain(req); }
  evaluateTeachBack(req: TeachBackRequest) { return this.pick().evaluateTeachBack(req); }
  answerDoubt(req: DoubtRequest) {
    const ai = this.pick();
    return ai.answerDoubt ? ai.answerDoubt(req) : Promise.reject(new Error('unsupported'));
  }
}
export { browserModel };
export { TemplateAI, FallbackAI, LocalModelAI };
