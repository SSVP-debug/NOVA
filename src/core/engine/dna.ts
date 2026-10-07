import { CONFIG } from '../config';
import type { ConceptId, ConceptStatus, ContentPack, LearnerState, MisconceptionId, MisconceptionStatus } from '../types';
import { conceptStatus, getConcept, masteryOf, topoOrder } from './graph';

/**
 * Data for the "My Learning DNA" screen (backlog A4). Pure: only reads the pack and the learner.
 * The screen must never need a colour to understand it, so everything here is words and numbers.
 */

export interface MapNeed {
  id: ConceptId;
  title: string;
  mastery: number;
  met: boolean; // mastery is high enough to unlock the concept that needs it
}

export interface MapNode {
  id: ConceptId;
  title: string;
  status: ConceptStatus;
  mastery: number; // 0..1
  depth: number; // 0 = no prerequisites. Used as the column in the map.
  row: number; // position inside its column
  needs: MapNeed[]; // direct prerequisites
  unlocks: { id: ConceptId; title: string }[]; // concepts that list this one as a prerequisite
  unlockBy: MapNeed[]; // only for locked concepts: the prerequisites that are still too low
}

export interface MapEdge {
  from: ConceptId; // prerequisite
  to: ConceptId; // dependant
  met: boolean;
}

export interface ConceptMap {
  nodes: MapNode[];
  edges: MapEdge[];
  columns: number;
  rows: number; // most nodes in one column
  lockBelow: number; // the mastery a prerequisite needs (CONFIG.mastery.lockBelow)
}

export function buildConceptMap(pack: ContentPack, state: LearnerState): ConceptMap {
  const order = topoOrder(pack);
  const depth = new Map<ConceptId, number>();
  for (const id of order) {
    const pre = getConcept(pack, id)?.prerequisites ?? [];
    depth.set(id, pre.length ? 1 + Math.max(...pre.map((p) => depth.get(p) ?? 0)) : 0);
  }
  const need = (id: ConceptId): MapNeed => ({
    id,
    title: getConcept(pack, id)?.title ?? id,
    mastery: masteryOf(state, id),
    met: masteryOf(state, id) >= CONFIG.mastery.lockBelow,
  });

  const rowsUsed = new Map<number, number>();
  const nodes: MapNode[] = order.map((id) => {
    const c = getConcept(pack, id)!;
    const d = depth.get(id)!;
    const row = rowsUsed.get(d) ?? 0;
    rowsUsed.set(d, row + 1);
    const status = conceptStatus(state, pack, id);
    const needs = c.prerequisites.map(need);
    return {
      id,
      title: c.title,
      status,
      mastery: masteryOf(state, id),
      depth: d,
      row,
      needs,
      unlocks: pack.concepts.filter((x) => x.prerequisites.includes(id)).map((x) => ({ id: x.id, title: x.title })),
      unlockBy: status === 'locked' ? needs.filter((n) => !n.met) : [],
    };
  });
  const edges: MapEdge[] = nodes.flatMap((n) => n.needs.map((p) => ({ from: p.id, to: n.id, met: p.met })));
  return {
    nodes,
    edges,
    columns: Math.max(0, ...nodes.map((n) => n.depth)) + 1,
    rows: Math.max(0, ...rowsUsed.values()),
    lockBelow: CONFIG.mastery.lockBelow,
  };
}

// ---------- misconception timeline ----------
export type TimelineKind = 'seen' | 'probe-missed' | 'fixed';

export interface TimelineEntry {
  at: number;
  kind: TimelineKind;
}

export interface MistakeTimeline {
  id: MisconceptionId;
  title: string;
  concept: ConceptId;
  status: MisconceptionStatus;
  seen: number; // total times seen (from the learner state, even if older history was trimmed)
  entries: TimelineEntry[]; // oldest first, from the attempt history
}

const STATUS_RANK: Record<MisconceptionStatus, number> = { active: 0, improving: 1, resolved: 2 };

/** One timeline per mistake the learner has shown: active first, then improving, then resolved. */
export function buildMistakeTimeline(pack: ContentPack, state: LearnerState): MistakeTimeline[] {
  return pack.misconceptions
    .filter((m) => state.misconceptions[m.id])
    .map((m) => {
      const st = state.misconceptions[m.id]!;
      const entries: TimelineEntry[] = [];
      for (const ev of state.history) {
        if (ev.probeFor === m.id) entries.push({ at: ev.at, kind: ev.correct ? 'fixed' : 'probe-missed' });
        else if (!ev.correct && ev.misconception === m.id) entries.push({ at: ev.at, kind: 'seen' });
      }
      entries.sort((a, b) => a.at - b.at);
      return { id: m.id, title: m.title, concept: m.concept, status: st.status, seen: st.seen, entries };
    })
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.seen - a.seen);
}
