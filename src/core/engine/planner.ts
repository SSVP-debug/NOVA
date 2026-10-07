import { CONFIG } from '../config';
import type { ConceptId, ContentPack, LearnerState, Plan, PlanStep } from '../types';
import { conceptStatus, getConcept, topoOrder } from './graph';
import { dueConcepts } from './review';

/**
 * "Today's plan": what should the student do next, and why. Order of priority:
 *  1. active mistakes (most repeated first)   2. reviews that are due
 *  3. a new or shaky unlocked concept         4. a diagnostic if nothing is known yet.
 */
export function planToday(state: LearnerState, pack: ContentPack, now: number): Plan {
  const steps: PlanStep[] = [];
  const mins = CONFIG.planner.minutes;
  const used = new Set<ConceptId>();

  const active = pack.misconceptions
    .map((def) => ({ def, st: state.misconceptions[def.id] }))
    .filter((x) => x.st?.status === 'active')
    .sort((a, b) => b.st!.seen - a.st!.seen);
  for (const { def, st } of active) {
    steps.push({
      kind: 'fix-misconception',
      concept: def.concept,
      misconception: def.id,
      reason: `You have made the mistake "${def.title}" ${st!.seen} time${st!.seen > 1 ? 's' : ''}. A short probe will check if it is fixed.`,
      estMinutes: mins.fix,
    });
    used.add(def.concept);
  }

  for (const id of dueConcepts(state, now)) {
    if (used.has(id)) continue;
    const title = getConcept(pack, id)?.title ?? id;
    steps.push({ kind: 'review', concept: id, reason: `${title} is due for review, so it does not fade.`, estMinutes: mins.review });
    used.add(id);
  }

  const noHistory = Object.values(state.concepts).every((c) => c.attempts === 0) || Object.keys(state.concepts).length === 0;
  if (noHistory) {
    const first = topoOrder(pack)[0];
    if (first) steps.push({ kind: 'diagnostic', concept: first, reason: 'NOVA does not know your level yet, so it starts with a short check.', estMinutes: mins.diagnostic });
  } else {
    for (const id of topoOrder(pack)) {
      if (used.has(id)) continue;
      const status = conceptStatus(state, pack, id);
      if (status === 'new' || status === 'shaky') {
        const title = getConcept(pack, id)?.title ?? id;
        steps.push({
          kind: 'learn-new',
          concept: id,
          reason: status === 'new' ? `${title} is next, and you are ready for it.` : `${title} is still shaky. A little more practice will help.`,
          estMinutes: mins.learn,
        });
        break;
      }
    }
  }

  const top = steps.slice(0, CONFIG.planner.maxSteps);
  const headline = top[0]
    ? top[0].kind === 'fix-misconception'
      ? 'Fix a repeating mistake first'
      : top[0].kind === 'review'
        ? 'Quick review, then move on'
        : top[0].kind === 'diagnostic'
          ? 'Start with a quick check'
          : 'Keep learning'
    : 'You are all caught up';
  return { headline, steps: top };
}
