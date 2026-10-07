import type { GeneratorRegistry, QuestionGenerator } from '@/core/ports';

export class MapGeneratorRegistry implements GeneratorRegistry {
  private map = new Map<string, QuestionGenerator>();
  constructor(gens: QuestionGenerator[] = []) { gens.forEach((g) => this.register(g)); }
  register(g: QuestionGenerator): this {
    if (this.map.has(g.id)) throw new Error(`Generator "${g.id}" is already registered`);
    this.map.set(g.id, g);
    return this;
  }
  get(id: string) { return this.map.get(id); }
  ids() { return [...this.map.keys()]; }
}
