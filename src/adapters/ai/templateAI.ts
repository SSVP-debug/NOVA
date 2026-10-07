import type { AIPort, DoubtRequest, ExplainRequest, TeachBackRequest } from '@/core/ports';
import type { TeachBackResult } from '@/core/types';

/** The always-available, no-model implementation. It is also the safety net for every other AI. */
export class TemplateAI implements AIPort {
  readonly id = 'template';
  async isAvailable() { return true; }

  async explain(req: ExplainRequest) { return req.intervention.baseText; }

  async evaluateTeachBack({ pack, concept, answer }: TeachBackRequest): Promise<TeachBackResult> {
    const c = pack.concepts.find((x) => x.id === concept);
    const text = answer.toLowerCase();
    const items = c?.teachBack ?? [];
    const covered = items.filter((i) => i.keywords.some((k) => text.includes(k.toLowerCase()))).map((i) => i.id);
    const missing = items.filter((i) => !covered.includes(i.id)).map((i) => i.id);
    const score = items.length ? covered.length / items.length : 0;
    const miss = items.filter((i) => missing.includes(i.id)).map((i) => i.label);
    const message = !items.length
      ? 'Thanks for explaining it in your own words.'
      : miss.length === 0
        ? 'Great explanation. You covered every key idea.'
        : `Good start. Try to also mention: ${miss.join('; ')}.`;
    return { covered, missing, score, message };
  }

  async answerDoubt(req: DoubtRequest) {
    const c = req.pack.concepts.find((x) => x.id === req.concept);
    return c?.explanations.plain ?? c?.summary ?? '';
  }
}
