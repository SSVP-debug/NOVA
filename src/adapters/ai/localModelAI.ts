import type { AIPort, ExplainRequest, LocalModelRuntime, TeachBackRequest } from '@/core/ports';
import type { TeachBackResult } from '@/core/types';
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
  constructor(private runtime: LocalModelRuntime) { this.id = `local:${runtime.id}`; }

  isAvailable() { return this.runtime.isReady(); }

  async explain(req: ExplainRequest) {
    const out = clean(await this.runtime.generate(buildExplainPrompt(req), { maxTokens: 160 }));
    if (out.length < 10) throw new Error('Model returned an empty answer');
    return out;
  }

  async evaluateTeachBack(req: TeachBackRequest): Promise<TeachBackResult> {
    const base = await this.template.evaluateTeachBack(req);
    const c = req.pack.concepts.find((x) => x.id === req.concept);
    const labels = (c?.teachBack ?? []).filter((i) => base.missing.includes(i.id)).map((i) => i.label);
    const msg = clean(await this.runtime.generate(buildTeachBackPrompt(c?.title ?? req.concept, req.answer, labels), { maxTokens: 120 }));
    return { ...base, message: msg.length >= 10 ? msg : base.message };
  }
}
