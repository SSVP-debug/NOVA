import type { AIPort } from '@/core/ports';
import { CONFIG } from '@/core/config';
import { FallbackAI } from './fallbackAI';
import { LocalModelAI } from './localModelAI';
import { OllamaRuntime } from './runtimes/ollama';
import { TemplateAI } from './templateAI';

/**
 * Picks the AI for this device. Lite mode (aiMode 'off') or no configured runtime = templates only.
 * Configure with VITE_AI_RUNTIME=ollama and VITE_OLLAMA_MODEL=<model name> in .env.local.
 */
export function createAI(aiMode: 'auto' | 'off' = 'auto'): AIPort {
  const template = new TemplateAI();
  if (aiMode === 'off') return template;
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_AI_RUNTIME === 'ollama') {
    const runtime = new OllamaRuntime(env.VITE_OLLAMA_MODEL ?? 'gemma3:1b');
    return new FallbackAI(new LocalModelAI(runtime), template, CONFIG.ai.timeoutMs);
  }
  return template;
}
export { TemplateAI, FallbackAI, LocalModelAI };
