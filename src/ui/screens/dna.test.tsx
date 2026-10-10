// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { createServices } from '@/app/container';
import { SessionProvider, useSession } from '@/app/session';
import { aaravLearner, freshLearner, makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import { Dna } from './Dna';

afterEach(cleanup);

function Harness({ profileId }: { profileId: string }) {
  const { profile, selectProfile } = useSession();
  useEffect(() => { void selectProfile(profileId); }, [profileId, selectProfile]);
  return profile ? <Dna /> : <div>loading</div>;
}

async function show(kind: 'fresh' | 'aarav') {
  const storage = new MemoryStorage();
  const p = makeProfile(kind, NOW, true);
  await storage.saveProfile(p);
  await storage.saveLearner(kind === 'aarav' ? aaravLearner(p.id, pack, NOW) : freshLearner(p.id, pack, NOW));
  const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
  render(<SessionProvider services={services}><Harness profileId={p.id} /></SessionProvider>);
}

describe('DNA screen', () => {
  it('shows the map with a text description, and a legend that does not rely on colour', async () => {
    await show('fresh');
    expect(await screen.findByRole('img', { name: /Concept map/ })).toBeTruthy();
    expect(screen.getByText(/Star styles: Solid is a full star/)).toBeTruthy();
    expect(screen.getByText('Mistake timeline')).toBeTruthy();
    expect(screen.getByText('None yet.')).toBeTruthy();
  });

  it('a locked topic says what unlocks it, and every topic says what it needs and unlocks', async () => {
    await show('fresh');
    await screen.findByText('Topic by topic');
    expect(screen.getAllByText(/To unlock:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reach 35% in Loops \(now not started\)/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Unlocks: .*Lists.*Loops.*Hashing/)).toBeTruthy();
    expect(screen.getAllByText(/Needs: /).some((node) => /Variables \(not started, needs 35%\)/.test(node.textContent ?? ''))).toBe(true);
  });

  it('each topic has a text status, not only a colour', async () => {
    await show('aarav');
    const bar = await screen.findByRole('img', { name: /^Loop bounds: / });
    expect(bar.getAttribute('aria-label')).toMatch(/Loop bounds: (Solid|Shaky|New|Locked)(, \d+%)?$/);
  });

  it('shows no tick marks or other symbols, and no score for a topic that was never answered', async () => {
    await show('fresh');
    await screen.findByText('Topic by topic');
    expect(document.body.textContent ?? '').not.toMatch(/[\u2714\u2716\u25D0\u25CB\u2298\u25CF]/);
    expect(screen.getByRole('img', { name: 'Variables: New' })).toBeTruthy(); // no "0%" for an untouched topic
  });

  it('a topic just below the Solid line is not shown as 75%', async () => {
    const storage = new MemoryStorage();
    const p = makeProfile('edge', NOW, true);
    await storage.saveProfile(p);
    const l = freshLearner(p.id, pack, NOW);
    l.concepts['variables'] = { mastery: 0.746, attempts: 4, correct: 3, reviewStage: 0 };
    await storage.saveLearner(l);
    const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
    render(<SessionProvider services={services}><Harness profileId={p.id} /></SessionProvider>);
    expect(await screen.findByRole('img', { name: 'Variables: Shaky, 74%' })).toBeTruthy();
  });

  it("shows Aarav's mistake timeline in order with dates in words", async () => {
    await show('aarav');
    await screen.findByText('Mistake timeline');
    expect(screen.getByText('Off-by-one (loop start)')).toBeTruthy();
    expect(screen.getByText(/Active, seen 7 times/)).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(9);
    expect(within(items[0]!).getByText(/10 days ago/)).toBeTruthy();
    expect(within(items[0]!).getByText(/Made this mistake/)).toBeTruthy();
    expect(within(items[1]!).getByText(/Missed the follow-up check/)).toBeTruthy();
    expect(within(items[5]!).getByText(/Passed the follow-up check \(fixed\)/)).toBeTruthy();
    expect(within(items[8]!).getByText(/yesterday/)).toBeTruthy();
  });
});
