import type { AIPort } from '@/core/ports';
import { CONFIG } from '@/core/config';
import { FallbackAI } from './fallbackAI';
import { LocalModelAI } from './localModelAI';
import { OllamaRuntime } from './runtimes/ollama';
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
  return template;
}
export { TemplateAI, FallbackAI, LocalModelAI };
