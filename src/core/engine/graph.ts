import { CONFIG } from '../config';
import type { ConceptId, ConceptStatus, ContentPack, LearnerState } from '../types';

export function getConcept(pack: ContentPack, id: ConceptId) {
  return pack.concepts.find((c) => c.id === id);
}

/** Concepts ordered so that prerequisites come first. Throws on a cycle. */
export function topoOrder(pack: ContentPack): ConceptId[] {
  const out: ConceptId[] = [];
  const state = new Map<ConceptId, 'visiting' | 'done'>();
  const byId = new Map(pack.concepts.map((c) => [c.id, c]));
  const visit = (id: ConceptId) => {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`Prerequisite cycle at concept "${id}"`);
    state.set(id, 'visiting');
    for (const p of byId.get(id)?.prerequisites ?? []) visit(p);
    state.set(id, 'done');
    out.push(id);
  };
  for (const c of pack.concepts) visit(c.id);
  return out;
}

export function masteryOf(state: LearnerState, id: ConceptId): number {
  return state.concepts[id]?.mastery ?? 0;
}

/** A concept can only be measured if the pack has at least one question for it. */
export function isTestable(pack: ContentPack, id: ConceptId): boolean {
  return pack.questions.some((q) => q.concept === id);
}

/**
 * Does this prerequisite allow its dependants to open?
 * A prerequisite with no questions cannot be measured, so it must not block anyone
 * (otherwise a student who answers correctly would still see "Locked" topics).
 */
export function prerequisiteMet(state: LearnerState, pack: ContentPack, id: ConceptId): boolean {
  return !isTestable(pack, id) || masteryOf(state, id) >= CONFIG.mastery.lockBelow;
}

export function isLocked(state: LearnerState, pack: ContentPack, id: ConceptId): boolean {
  const c = getConcept(pack, id);
  return !!c && c.prerequisites.some((p) => !prerequisiteMet(state, pack, p));
}

export function conceptStatus(state: LearnerState, pack: ContentPack, id: ConceptId): ConceptStatus {
  if (isLocked(state, pack, id)) return 'locked';
  const cs = state.concepts[id];
  if (!cs || cs.attempts === 0) return 'new';
  return cs.mastery >= CONFIG.mastery.solidFrom ? 'solid' : 'shaky';
}
