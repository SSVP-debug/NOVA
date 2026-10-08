import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyAttempt } from '@/core/engine';
import type { AttemptEvent, LearnerState, Profile, Settings } from '@/core/types';
import { normalizeSettings } from '@/core/settings';
import { aaravLearner, DEMO_NAMES, freshLearner, makeProfile } from '@/seed/personas';
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
  seedDemoProfiles(): Promise<void>; // adds only the demo learners that are missing
  resetDemoProfiles(): Promise<void>; // deletes ONLY sample-data profiles, recreates both, resets demo time
  openDemoProfile(kind: 'fresh' | 'aarav'): Promise<void>;
  recordAttempt(ev: AttemptEvent): Promise<LearnerState>;
  canShiftTime: boolean; // the demo clock can be moved
  timeShiftDays: number;
  advanceDays(days: number): void;
  resetTime(): void;
  recordAttempts(evs: AttemptEvent[]): Promise<LearnerState>; // several answers at once, in order, saved once
  exportCurrent(): Promise<string>;
  importFile(text: string): Promise<Profile>; // throws; use describeImportError() for words
  updateSettings(patch: Partial<Settings>): Promise<void>;
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
  const profileRef = useRef<Profile | null>(null); // always the newest profile, even between renders
  profileRef.current = profile;
  const [learner, setLearner] = useState<LearnerState | null>(null);
  const [timeShiftDays, setTimeShiftDays] = useState(services.demoClock?.shiftDays ?? 0);
  const advanceDays = useCallback((days: number) => { services.demoClock?.advanceDays(days); setTimeShiftDays(services.demoClock?.shiftDays ?? 0); }, [services]);
  const resetTime = useCallback(() => { services.demoClock?.reset(); setTimeShiftDays(0); }, [services]);

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

  /** Makes sure both demo learners exist (never duplicates them) and returns them. */
  const ensureDemo = useCallback(async () => {
    const list = await storage.listProfiles();
    const now = clock.now();
    const make = async (name: string, build: typeof freshLearner, offset: number) => {
      const found = list.find((x) => x.seeded && x.name === name);
      if (found) return found;
      const p = makeProfile(name, now + offset, true);
      await storage.saveProfile(p);
      await storage.saveLearner(build(p.id, pack, now));
      return p;
    };
    const fresh = await make(DEMO_NAMES.fresh, freshLearner, 0);
    const aarav = await make(DEMO_NAMES.aarav, aaravLearner, 1);
    await refresh();
    return { fresh, aarav };
  }, [storage, pack, clock, refresh]);

  const seedDemoProfiles = useCallback(async () => { await ensureDemo(); }, [ensureDemo]);

  const resetDemoProfiles = useCallback(async () => {
    services.demoClock?.reset(); // seeded history is built from "now", so time goes back to real time first
    setTimeShiftDays(0);
    for (const p of await storage.listProfiles()) if (p.seeded) await storage.deleteProfile(p.id); // real profiles stay
    if (profileRef.current?.seeded) { setProfile(null); setLearner(null); }
    await ensureDemo();
  }, [services, storage, ensureDemo]);

  const openDemoProfile = useCallback(async (kind: 'fresh' | 'aarav') => {
    const d = await ensureDemo();
    await selectProfile((kind === 'fresh' ? d.fresh : d.aarav).id);
  }, [ensureDemo, selectProfile]);

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
    const raw: unknown = JSON.parse(text); // a SyntaxError here means "not a readable file"
    const before = await storage.listProfiles();
    let p = await storage.importBundle(raw);
    if (before.some((x) => x.name === p.name)) { // never leave two profiles with the same name
      p = { ...p, name: `${p.name} (restored)` };
      await storage.saveProfile(p);
    }
    await refresh();
    return p;
  }, [storage, refresh]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const current = profileRef.current;
    if (!current) return;
    const next: Profile = { ...current, settings: normalizeSettings({ ...current.settings, ...patch }) };
    profileRef.current = next; // so a second quick change builds on this one, not on the old profile
    setProfile(next);
    await storage.saveProfile(next);
    await refresh();
  }, [storage, refresh]);

  const removeProfile = useCallback(async (id: string) => {
    await storage.deleteProfile(id);
    if (profile?.id === id) { setProfile(null); setLearner(null); }
    await refresh();
  }, [storage, profile, refresh]);

  const value = useMemo<Session>(() => ({
    services, ready, profiles, profile, learner, canShiftTime: !!services.demoClock, timeShiftDays, advanceDays, resetTime, createProfile, selectProfile, seedDemoProfiles, resetDemoProfiles, openDemoProfile, recordAttempt, recordAttempts, exportCurrent, importFile, updateSettings, removeProfile,
  }), [services, ready, profiles, profile, learner, timeShiftDays, advanceDays, resetTime, createProfile, selectProfile, seedDemoProfiles, resetDemoProfiles, openDemoProfile, recordAttempt, recordAttempts, exportCurrent, importFile, updateSettings, removeProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
