import type { ContentPack, Question } from '../types';
import { getConcept } from './graph';

/**
 * The right answer for a question, with a short explanation. Pure and verified:
 * the answer comes from the option marked correct, and the explanation is the pack's own text for the topic
 * (worked example first, then the plain explanation, then the one-line summary). Nothing is invented.
 */
export interface Solution {
  answer: string; // text of the correct option
  why: string; // why it works, from the pack ('' only if the pack has no text for the topic)
  hint?: string; // the last hint of the question, if there is one
}

export function buildSolution(pack: ContentPack, q: Question): Solution | undefined {
  const right = q.options.find((o) => o.correct);
  if (!right) return undefined;
  const c = getConcept(pack, q.concept);
  const why = c?.explanations['worked-example'] ?? c?.explanations.plain ?? c?.summary ?? '';
  return { answer: right.text.trim(), why, hint: q.hints.length ? q.hints[q.hints.length - 1] : undefined };
}
