import type { GeneratorRegistry } from '../ports';
import type { MisconceptionId, Option, Question, QuestionBody, QuestionSpec } from '../types';
import { createRng, shuffle } from '../util/rng';

/** Turns a spec (static or generated) into a runtime question with stable option ids. */
export function materializeQuestion(
  spec: QuestionSpec,
  generators: GeneratorRegistry,
  seed: number,
  focus: MisconceptionId[] = [],
): Question {
  let body: QuestionBody;
  if (spec.kind === 'static') {
    body = spec;
  } else {
    const gen = generators.get(spec.generator);
    if (!gen) throw new Error(`Unknown question generator "${spec.generator}" (spec ${spec.id})`);
    body = gen.generate({ seed, focus, params: spec.params });
  }
  const drafts = spec.kind === 'static' ? shuffle(createRng(seed), body.options) : body.options;
  const options: Option[] = drafts.map((o, i) => ({ ...o, id: `o${i + 1}` }));
  return {
    id: `${spec.id}#${seed}`,
    specId: spec.id,
    concept: spec.concept,
    difficulty: spec.difficulty,
    seed,
    prompt: body.prompt,
    code: body.code,
    options,
    hints: body.hints,
    feedback: body.feedback,
  };
}
