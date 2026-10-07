import type { AttemptEvent, ContentPack, LearnerState } from '../types';

/** Mutates the (already cloned) state. */
export function updateMisconceptions(draft: LearnerState, ev: AttemptEvent, pack: ContentPack): void {
  if (!ev.correct && ev.misconception) {
    const m = draft.misconceptions[ev.misconception];
    if (m) {
      m.seen += 1;
      m.status = 'active';
      m.lastSeen = ev.at;
      delete m.resolvedAt;
    } else {
      draft.misconceptions[ev.misconception] = { seen: 1, status: 'active', firstSeen: ev.at, lastSeen: ev.at };
    }
    return;
  }
  if (!ev.correct) return;

  if (ev.isProbe && ev.probeFor) {
    const m = draft.misconceptions[ev.probeFor];
    if (m && m.status !== 'resolved') {
      m.status = 'resolved';
      m.resolvedAt = ev.at;
    }
    return;
  }
  // A correct normal answer: active mistakes in the same concept become "improving".
  for (const def of pack.misconceptions) {
    const m = draft.misconceptions[def.id];
    if (def.concept === ev.concept && m && m.status === 'active') m.status = 'improving';
  }
}
