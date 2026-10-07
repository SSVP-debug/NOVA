import type { StoragePort } from '@/core/ports';
import type { ExportBundle, LearnerState, Profile } from '@/core/types';
import { parseBundle } from './bundle';

/** In-memory adapter. Used by tests and as a safe fallback if IndexedDB is unavailable. */
export class MemoryStorage implements StoragePort {
  private profiles = new Map<string, Profile>();
  private learners = new Map<string, LearnerState>();
  private key = (p: string, k: string) => `${p}::${k}`;

  async listProfiles() { return [...this.profiles.values()].sort((a, b) => a.createdAt - b.createdAt).map((p) => structuredClone(p)); }
  async getProfile(id: string) { const p = this.profiles.get(id); return p && structuredClone(p); }
  async saveProfile(p: Profile) { this.profiles.set(p.id, structuredClone(p)); }
  async deleteProfile(id: string) {
    this.profiles.delete(id);
    for (const k of [...this.learners.keys()]) if (k.startsWith(id + '::')) this.learners.delete(k);
  }
  async loadLearner(profileId: string, packId: string) { const l = this.learners.get(this.key(profileId, packId)); return l && structuredClone(l); }
  async saveLearner(s: LearnerState) { this.learners.set(this.key(s.profileId, s.packId), structuredClone(s)); }
  async exportProfile(id: string): Promise<ExportBundle> {
    const profile = this.profiles.get(id);
    if (!profile) throw new Error('Profile not found');
    const learners = [...this.learners.values()].filter((l) => l.profileId === id);
    return structuredClone({ format: 'nova-export', version: 1, exportedAt: Date.now(), profile, learners });
  }
  async importBundle(raw: unknown) {
    const b = parseBundle(raw);
    await this.saveProfile(b.profile);
    for (const l of b.learners) await this.saveLearner(l);
    return b.profile;
  }
}
