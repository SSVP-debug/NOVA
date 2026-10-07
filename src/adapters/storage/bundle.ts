import type { ExportBundle, LearnerState, Profile } from '@/core/types';
import { normalizeSettings } from '@/core/settings';
import { newId } from '@/core/util/id';

/** Validates an imported file and returns it with a NEW profile id (never overwrites an existing profile). */
export function parseBundle(raw: unknown): ExportBundle {
  const b = raw as Partial<ExportBundle> | null;
  if (!b || b.format !== 'nova-export') throw new Error('Not a NOVA export file');
  if (b.version !== 1) throw new Error(`Unsupported export version ${String(b.version)}`);
  if (!b.profile?.id || !b.profile.name) throw new Error('Export has no profile');
  if (!Array.isArray(b.learners)) throw new Error('Export has no learner data');
  for (const l of b.learners as Partial<LearnerState>[]) {
    const fine = l && l.schemaVersion === 1 && typeof l.packId === 'string' && !!l.concepts && typeof l.concepts === 'object'
      && !!l.misconceptions && typeof l.misconceptions === 'object' && Array.isArray(l.history);
    if (!fine) throw new Error('Export has damaged learner data');
  }
  const id = newId();
  const profile: Profile = { ...b.profile, id, settings: normalizeSettings(b.profile.settings) };
  const learners: LearnerState[] = b.learners.map((l) => ({ ...l, profileId: id }));
  return { format: 'nova-export', version: 1, exportedAt: b.exportedAt ?? Date.now(), profile, learners };
}
