import { EXPLANATION_STYLES } from '../types';
import type { ConceptId, ExplanationStyle, LearnerState, MisconceptionState, ContentPack } from '../types';
import { getConcept } from './graph';
import { chooseStyle } from './strategy';

/** Styles this concept has authored text for, in the standard order. */
export function lessonStyles(pack: ContentPack, id: ConceptId): ExplanationStyle[] {
  const c = getConcept(pack, id);
  return EXPLANATION_STYLES.filter((s) => !!c?.explanations[s]);
}

/** Verified text of a concept in one style. Falls back to the summary if the style has no text. */
export function lessonText(pack: ContentPack, id: ConceptId, style: ExplanationStyle): string {
  const c = getConcept(pack, id);
  return c?.explanations[style] ?? c?.summary ?? '';
}

export interface Lesson {
  concept: ConceptId;
  title: string;
  style: ExplanationStyle; // chosen by code (chooseStyle), never by AI
  reason: string; // the "Why this?" text
  text: string; // verified text
  styles: ExplanationStyle[]; // every style available for this concept
}

/**
 * The lesson for one concept, in the style that fits THIS learner.
 * Same rules as the practice feedback (chooseStyle): a style that helped before wins;
 * a repeating mistake in this concept tries a new style; otherwise plain.
 * Pure. Returns undefined for an unknown concept.
 */
export function buildLesson(pack: ContentPack, state: LearnerState, id: ConceptId): Lesson | undefined {
  const c = getConcept(pack, id);
  if (!c) return undefined;
  const styles = lessonStyles(pack, id);

  const worst: MisconceptionState | undefined = pack.misconceptions
    .filter((m) => m.concept === id)
    .map((m) => state.misconceptions[m.id])
    .filter((m): m is MisconceptionState => m?.status === 'active')
    .sort((a, b) => b.seen - a.seen)[0];

  const { style, reason } = chooseStyle(state, styles, worst);
  return { concept: id, title: c.title, style, reason, text: lessonText(pack, id, style), styles };
}
