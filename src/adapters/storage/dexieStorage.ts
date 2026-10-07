import Dexie, { type Table } from 'dexie';
import type { StoragePort } from '@/core/ports';
import type { ExportBundle, LearnerState, Profile } from '@/core/types';
import { parseBundle } from './bundle';

class NovaDB extends Dexie {
  profiles!: Table<Profile, string>;
  learners!: Table<LearnerState, [string, string]>;
  constructor(name: string) {
    super(name);
    // Add new versions here when the schema changes. Never edit an old version.
    this.version(1).stores({ profiles: 'id,createdAt', learners: '[profileId+packId],profileId' });
  }
}

/** IndexedDB adapter (offline, on-device). */
export class DexieStorage implements StoragePort {
  private db: NovaDB;
  constructor(dbName = 'nova') { this.db = new NovaDB(dbName); }

  listProfiles() { return this.db.profiles.orderBy('createdAt').toArray(); }
  getProfile(id: string) { return this.db.profiles.get(id); }
  async saveProfile(p: Profile) { await this.db.profiles.put(p); }
  async deleteProfile(id: string) {
    await this.db.transaction('rw', this.db.profiles, this.db.learners, async () => {
      await this.db.profiles.delete(id);
      await this.db.learners.where('profileId').equals(id).delete();
    });
  }
  loadLearner(profileId: string, packId: string) { return this.db.learners.get([profileId, packId]); }
  async saveLearner(s: LearnerState) { await this.db.learners.put(s); }
  async exportProfile(id: string): Promise<ExportBundle> {
    const profile = await this.db.profiles.get(id);
    if (!profile) throw new Error('Profile not found');
    const learners = await this.db.learners.where('profileId').equals(id).toArray();
    return { format: 'nova-export', version: 1, exportedAt: Date.now(), profile, learners };
  }
  async importBundle(raw: unknown) {
    const b = parseBundle(raw);
    await this.saveProfile(b.profile);
    for (const l of b.learners) await this.saveLearner(l);
    return b.profile;
  }
}
