import type { AIPort, DoubtRequest, ExplainRequest, TeachBackRequest } from '@/core/ports';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`AI timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Tries the primary AI with a time limit; on any failure returns the fallback's answer. Never throws. */
export class FallbackAI implements AIPort {
  readonly id: string;
  constructor(private primary: AIPort, private fallback: AIPort, private timeoutMs: number) {
    this.id = `${primary.id}+${fallback.id}`;
  }
  async isAvailable() { return true; }

  private async run<T>(use: (ai: AIPort) => Promise<T>): Promise<T> {
    try {
      return await withTimeout(use(this.primary), this.timeoutMs);
    } catch {
      return use(this.fallback);
    }
  }
  explain(req: ExplainRequest) { return this.run((ai) => ai.explain(req)); }
  evaluateTeachBack(req: TeachBackRequest) { return this.run((ai) => ai.evaluateTeachBack(req)); }
  answerDoubt(req: DoubtRequest) {
    return this.run((ai) => (ai.answerDoubt ? ai.answerDoubt(req) : Promise.reject(new Error('unsupported'))));
  }
}
