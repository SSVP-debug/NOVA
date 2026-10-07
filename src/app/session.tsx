import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyAttempt } from '@/core/engine';
import type { AttemptEvent, LearnerState, Profile } from '@/core/types';
import { aaravLearner, freshLearner, makeProfile } from '@/seed/personas';
import { createLearner } from '@/core/engine';
import type { Services } from './container';

interface Session {
  services: Services;
  ready: boolean;
  profiles: Profile[];
  profile: Profile | null;
  learner: LearnerState | null;
  createProfile(name: string): Promise<void>;
  selectProfile(id: string | null): Promise<void>;
  seedDemoProfiles(): Promise<void>;
  recordAttempt(ev: AttemptEvent): Promise<LearnerState>;
  recordAttempts(evs: AttemptEvent[]): Promise<LearnerState>; // several answers at once, in order, saved once
  exportCurrent(): Promise<string>;
  importFile(text: string): Promise<void>;
  removeProfile(id: string): Promise<void>;
}

const Ctx = createContext<Session | null>(null);
export const useSession = (): Session => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used inside <SessionProvider>');
  return s;
};

export function SessionProvider({ services, children }: { services: Services; children: ReactNode }) {
  const { storage, pack, clock } = services;
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [learner, setLearner] = useState<LearnerState | null>(null);

  const refresh = useCallback(async () => setProfiles(await storage.listProfiles()), [storage]);
  useEffect(() => { refresh().finally(() => setReady(true)); }, [refresh]);

  const selectProfile = useCallback(async (id: string | null) => {
    if (!id) { setProfile(null); setLearner(null); return; }
    const p = await storage.getProfile(id);
    if (!p) return;
    const l = (await storage.loadLearner(id, pack.id)) ?? createLearner(id, pack, clock.now());
    setProfile(p); setLearner(l);
  }, [storage, pack, clock]);

  const createProfile = useCallback(async (name: string) => {
    const p = makeProfile(name.trim() || 'Student', clock.now());
    await storage.saveProfile(p);
    await storage.saveLearner(freshLearner(p.id, pack, clock.now()));
    await refresh(); await selectProfile(p.id);
  }, [storage, pack, clock, refresh, selectProfile]);

  const seedDemoProfiles = useCallback(async () => {
    const now = clock.now();
    const a = makeProfile('Fresh learner (demo)', now, true);
    const b = makeProfile('Aarav, 3 weeks of history (demo)', now + 1, true);
    await storage.saveProfile(a); await storage.saveLearner(freshLearner(a.id, pack, now));
    await storage.saveProfile(b); await storage.saveLearner(aaravLearner(b.id, pack, now));
    await refresh();
  }, [storage, pack, clock, refresh]);

  const recordAttempt = useCallback(async (ev: AttemptEvent) => {
    if (!learner) throw new Error('No active learner');
    const next = applyAttempt(learner, ev, pack);
    setLearner(next);
    await storage.saveLearner(next);
    return next;
  }, [learner, pack, storage]);

  const recordAttempts = useCallback(async (evs: AttemptEvent[]) => {
    if (!learner) throw new Error('No active learner');
    const next = evs.reduce((state, ev) => applyAttempt(state, ev, pack), learner);
    setLearner(next);
    await storage.saveLearner(next);
    return next;
  }, [learner, pack, storage]);

  const exportCurrent = useCallback(async () => {
    if (!profile) throw new Error('No active profile');
    return JSON.stringify(await storage.exportProfile(profile.id), null, 2);
  }, [profile, storage]);

  const importFile = useCallback(async (text: string) => {
    await storage.importBundle(JSON.parse(text));
    await refresh();
  }, [storage, refresh]);

  const removeProfile = useCallback(async (id: string) => {
    await storage.deleteProfile(id);
    if (profile?.id === id) { setProfile(null); setLearner(null); }
    await refresh();
  }, [storage, profile, refresh]);

  const value = useMemo<Session>(() => ({
    services, ready, profiles, profile, learner, createProfile, selectProfile, seedDemoProfiles, recordAttempt, recordAttempts, exportCurrent, importFile, removeProfile,
  }), [services, ready, profiles, profile, learner, createProfile, selectProfile, seedDemoProfiles, recordAttempt, recordAttempts, exportCurrent, importFile, removeProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
