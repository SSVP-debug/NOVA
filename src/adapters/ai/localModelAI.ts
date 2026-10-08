import type { AIPort, ExplainRequest, LocalModelRuntime, TeachBackRequest } from '@/core/ports';
import type { TeachBackResult } from '@/core/types';
import { CONFIG } from '@/core/config';
import { buildExplainPrompt, buildTeachBackPrompt } from './prompts';
import { TemplateAI } from './templateAI';

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * On-device model voice. Correctness stays in code:
 *  - explain(): the model rephrases verified text (never invents it).
 *  - evaluateTeachBack(): scoring comes from the checklist; the model only writes the friendly message.
 * Wrap with FallbackAI so any failure or slowness falls back to TemplateAI.
 */
export class LocalModelAI implements AIPort {
  readonly id: string;
  private template = new TemplateAI();
  constructor(private runtime: LocalModelRuntime, private timeoutMs: number = CONFIG.ai.timeoutMs) { this.id = `local:${runtime.id}`; }

  isAvailable() { return this.runtime.isReady(); }

  private async generate(prompt: string, maxTokens: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.runtime.generate(prompt, { maxTokens, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async explain(req: ExplainRequest) {
    const out = clean(await this.generate(buildExplainPrompt(req), 160));
    if (out.length < 10) throw new Error('Model returned an empty answer');
    return out;
  }

  async evaluateTeachBack(req: TeachBackRequest): Promise<TeachBackResult> {
    const base = await this.template.evaluateTeachBack(req);
    const c = req.pack.concepts.find((x) => x.id === req.concept);
    const labels = (c?.teachBack ?? []).filter((i) => base.missing.includes(i.id)).map((i) => i.label);
    const msg = clean(await this.generate(buildTeachBackPrompt(c?.title ?? req.concept, req.answer, labels), 120));
    return { ...base, message: msg.length >= 10 ? msg : base.message };
  }
}
