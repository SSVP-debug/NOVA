import type { ContentPack, ExplanationStyle, Intervention, LearnerState, Option, Question } from '../types';
import { getConcept } from './graph';
import { chooseStyle } from './strategy';

/** Styles we actually have verified text for, for this mistake in this question. */
function textFor(pack: ContentPack, q: Question, o: Option, style: ExplanationStyle): string | undefined {
  const mid = o.misconception;
  const fb = mid ? q.feedback?.[mid] : undefined;
  if (style === 'counterexample' && fb?.counter) return fb.counter;
  if (style === 'plain' && fb?.plain) return fb.plain;
  const def = mid ? pack.misconceptions.find((m) => m.id === mid) : undefined;
  return def?.explanations[style] ?? getConcept(pack, q.concept)?.explanations[style];
}

const STYLE_ORDER: ExplanationStyle[] = ['plain', 'counterexample', 'worked-example', 'analogy', 'socratic'];

/** Builds the decision "what to say and why" for a wrong answer. The AI only rephrases baseText. */
export function buildIntervention(
  pack: ContentPack,
  state: LearnerState,
  q: Question,
  chosen: Option,
): Intervention {
  const available = STYLE_ORDER.filter((s) => textFor(pack, q, chosen, s));
  const mState = chosen.misconception ? state.misconceptions[chosen.misconception] : undefined;
  const { style, reason } = chooseStyle(state, available, mState);
  const def = chosen.misconception ? pack.misconceptions.find((m) => m.id === chosen.misconception) : undefined;
  const concept = getConcept(pack, q.concept);
  return {
    concept: q.concept,
    misconception: chosen.misconception,
    style,
    evidence: def
      ? `You chose "${chosen.text.trim()}". That matches the mistake "${def.title}": ${def.description}`
      : `You chose "${chosen.text.trim()}".`,
    reason,
    baseText: textFor(pack, q, chosen, style) ?? concept?.summary ?? '',
  };
}
