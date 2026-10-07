import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { applyAttempt, createLearner } from '@/core/engine';
import { aaravLearner, makeProfile } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';
import { backupFileName, describeImportError } from './backup';

describe('backup file name', () => {
  it('is readable and safe', () => {
    expect(backupFileName('Asha K.', Date.UTC(2026, 9, 7, 12))).toBe('nova-backup-asha-k-2026-10-07.json');
    expect(backupFileName('???', Date.UTC(2026, 9, 7, 12))).toBe('nova-backup-profile-2026-10-07.json');
    expect(backupFileName('A'.repeat(80), Date.UTC(2026, 9, 7, 12)).length).toBeLessThan(60);
  });
});

describe('import errors are explained in plain words', () => {
  it('maps each known problem', () => {
    expect(describeImportError(new SyntaxError('bad json'))).toMatch(/could not be read/);
    expect(describeImportError(new Error('Not a NOVA export file'))).toMatch(/not a NOVA backup/);
    expect(describeImportError(new Error('Unsupported export version 9'))).toMatch(/different version/);
    expect(describeImportError(new Error('Export has no profile'))).toMatch(/no profile/);
    expect(describeImportError(new Error('Export has damaged learner data'))).toMatch(/damaged/);
    expect(describeImportError(new Error('boom'))).toMatch(/current profiles were not changed/);
  });
});

describe('round trip: export then import restores everything', () => {
  it('keeps the learning history, mistakes, strategy stats and settings, under a new id', async () => {
    const a = new MemoryStorage();
    const p = { ...makeProfile('Aarav', NOW, true), settings: { aiMode: 'off' as const, textScale: 1.5, highContrast: true, readAloud: true } };
    await a.saveProfile(p);
    const learner = aaravLearner(p.id, pack, NOW);
    await a.saveLearner(learner);

    const text = JSON.stringify(await a.exportProfile(p.id));
    const b = new MemoryStorage(); // a different device
    const restored = await b.importBundle(JSON.parse(text));

    expect(restored.id).not.toBe(p.id);
    expect(restored.settings).toEqual(p.settings);
    const back = (await b.loadLearner(restored.id, pack.id))!;
    expect(back.profileId).toBe(restored.id);
    expect({ ...back, profileId: p.id }).toEqual(learner); // identical apart from the new id
    expect(back.misconceptions['off-by-one-start']!.status).toBe('active');
    expect(back.strategies.counterexample).toEqual(learner.strategies.counterexample);
  });

  it('fills missing settings in an older or hand-made file', async () => {
    const a = new MemoryStorage();
    const p = makeProfile('Old', NOW);
    await a.saveProfile(p);
    await a.saveLearner(createLearner(p.id, pack, NOW));
    const bundle = JSON.parse(JSON.stringify(await a.exportProfile(p.id)));
    delete bundle.profile.settings;
    const restored = await new MemoryStorage().importBundle(bundle);
    expect(restored.settings).toEqual({ aiMode: 'auto', textScale: 1, highContrast: false, readAloud: false });
  });

  it('rejects damaged and foreign files without changing anything', async () => {
    const b = new MemoryStorage();
    const p = makeProfile('X', NOW);
    const ok = { format: 'nova-export', version: 1, exportedAt: NOW, profile: p, learners: [applyAttempt(createLearner(p.id, pack, NOW), attempt(), pack)] };
    await expect(b.importBundle({ ...ok, learners: [{ nonsense: true }] })).rejects.toThrow(/damaged/);
    await expect(b.importBundle({ ...ok, learners: [{ ...ok.learners[0], history: 'nope' }] })).rejects.toThrow(/damaged/);
    await expect(b.importBundle({ hello: 'world' })).rejects.toThrow(/NOVA export/);
    await expect(b.importBundle({ ...ok, version: 2 })).rejects.toThrow(/Unsupported/);
    expect(await b.listProfiles()).toEqual([]);
  });
});
