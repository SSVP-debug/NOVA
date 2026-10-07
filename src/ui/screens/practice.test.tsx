// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { createServices } from '@/app/container';
import { SessionProvider, useSession } from '@/app/session';
import { aaravLearner, makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import { Practice } from './Practice';

afterEach(cleanup);

function Harness({ profileId, onGo = () => {} }: { profileId: string; onGo?: (r: unknown) => void }) {
  const { profile, selectProfile } = useSession();
  useEffect(() => { void selectProfile(profileId); }, [profileId, selectProfile]);
  return profile ? <Practice concept="loop-bounds" go={onGo} /> : <div>loading</div>;
}

describe('Practice screen: a full session', () => {
  it('shows progress, runs 5 questions, then a summary with a next step', async () => {
    const storage = new MemoryStorage();
    const p = makeProfile('Aarav', NOW, true);
    await storage.saveProfile(p);
    await storage.saveLearner(aaravLearner(p.id, pack, NOW));
    const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
    render(<SessionProvider services={services}><Harness profileId={p.id} /></SessionProvider>);

    expect(await screen.findByText('Question 1 of 5')).toBeTruthy();

    for (let i = 1; i <= 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'sure' }));
      const opts = within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
      fireEvent.click(opts[0]!);
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
      const nextBtn = await screen.findByRole('button', { name: /Next question|Take the probe|See my summary/ });
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(String(i));
      fireEvent.click(nextBtn);
    }

    expect(await screen.findByText('Session summary')).toBeTruthy();
    expect(screen.getByText(/of 5/)).toBeTruthy();
    expect(screen.getByText('Your next step')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Practice again' })).toBeTruthy());
  });

  it('Leave goes home before answering; End session summarizes after answering; Practice again restarts', async () => {
    const storage = new MemoryStorage();
    const p = makeProfile('Asha', NOW);
    await storage.saveProfile(p);
    const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
    const routes: unknown[] = [];
    render(<SessionProvider services={services}><Harness profileId={p.id} onGo={(r) => routes.push(r)} /></SessionProvider>);
    await screen.findByText('Question 1 of 5');
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(routes).toEqual([{ name: 'home' }]);
    fireEvent.click(screen.getByRole('button', { name: 'sure' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByRole('button', { name: /Next question|Take the probe/ });
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    await screen.findByText('Session summary');
    fireEvent.click(await screen.findByRole('button', { name: 'Practice again' }));
    expect(await screen.findByText('Question 1 of 5')).toBeTruthy();
  });
});
