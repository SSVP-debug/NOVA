import { CONFIG } from '../config';
import type { AttemptEvent, ContentPack, LearnerState, ProfileId } from '../types';
import { nextMastery } from './mastery';
import { updateMisconceptions } from './misconceptions';
import { scheduleReview } from './review';

export function createLearner(profileId: ProfileId, pack: ContentPack, now = 0): LearnerState {
  return {
    schemaVersion: 1,
    profileId,
    packId: pack.id,
    concepts: {},
    misconceptions: {},
    strategies: {},
    calibration: { sure: { n: 0, wrong: 0 }, unsure: { n: 0, wrong: 0 }, guess: { n: 0, wrong: 0 } },
    pace: { avgMs: 0, samples: 0, avgHints: 0 },
    history: [],
    updatedAt: now,
  };
}

/**
 * THE single entry point that changes learner state. Pure: returns a new object.
 * Everything the twin knows is derived from AttemptEvents, so state can be rebuilt or replayed.
 */
export function applyAttempt(prev: LearnerState, ev: AttemptEvent, pack: ContentPack): LearnerState {
  const s = structuredClone(prev);

  const cs = (s.concepts[ev.concept] ??= {
    mastery: CONFIG.mastery.initial,
    attempts: 0,
    correct: 0,
    reviewStage: 0,
  });
  cs.mastery = nextMastery(cs.mastery, ev.correct, ev.confidence);
  cs.attempts += 1;
  if (ev.correct) cs.correct += 1;
  cs.lastSeen = ev.at;
  scheduleReview(cs, ev.correct, ev.at);

  updateMisconceptions(s, ev, pack);

  const cal = s.calibration[ev.confidence];
  cal.n += 1;
  if (!ev.correct) cal.wrong += 1;

  if (ev.isProbe && ev.afterStyle) {
    const st = (s.strategies[ev.afterStyle] ??= { shown: 0, helped: 0 });
    st.shown += 1;
    if (ev.correct) st.helped += 1;
  }

  const w = CONFIG.pace.emaWeight;
  s.pace.avgMs = s.pace.samples ? s.pace.avgMs * (1 - w) + ev.timeMs * w : ev.timeMs;
  s.pace.avgHints = s.pace.samples ? s.pace.avgHints * (1 - w) + ev.hintsUsed * w : ev.hintsUsed;
  s.pace.samples += 1;

  s.history.push(ev);
  if (s.history.length > CONFIG.history.cap) s.history.splice(0, s.history.length - CONFIG.history.cap);
  s.updatedAt = ev.at;
  return s;
}
