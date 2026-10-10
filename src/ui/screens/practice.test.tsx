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
      const nextBtn = await screen.findByRole('button', { name: /Next question|Show the right solution|See my summary/ });
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(String(i));
      const wasWrong = /Show the right solution/.test(nextBtn.textContent ?? '');
      fireEvent.click(nextBtn);
      if (wasWrong) { // wrong answer: read the solution, then go on
        fireEvent.click(await screen.findByRole('button', { name: /Next question|See my summary/ }));
      }
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
    await screen.findByRole('button', { name: /Next question|Show the right solution/ });
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    await screen.findByText('Session summary');
    fireEvent.click(await screen.findByRole('button', { name: 'Practice again' }));
    expect(await screen.findByText('Question 1 of 5')).toBeTruthy();
  });
});

describe('Practice screen: after a wrong answer', () => {
  /** Renders a fresh session and answers with the first option that turns out to be wrong. */
  async function wrongAnswer() {
    for (let k = 0; k < 4; k++) {
      const storage = new MemoryStorage();
      const p = makeProfile('Aarav', NOW, true);
      await storage.saveProfile(p);
      await storage.saveLearner(aaravLearner(p.id, pack, NOW));
      const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
      render(<SessionProvider services={services}><Harness profileId={p.id} /></SessionProvider>);
      await screen.findByText('Question 1 of 5');
      fireEvent.click(screen.getByRole('button', { name: 'sure' }));
      fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[k]!);
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
      await screen.findByRole('button', { name: /Next question|Show the right solution/ });
      if (screen.queryByText(/Not quite\./)) return;
      cleanup();
    }
    throw new Error('no wrong option found');
  }

  it('offers exactly two clear choices: see the right solution, or skip to the next question', async () => {
    await wrongAnswer();
    expect(screen.getByRole('button', { name: 'Show the right solution' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip to next question' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /probe/i })).toBeNull();
    expect(screen.queryByTestId('solution')).toBeNull();
  });

  it('Show the right solution displays the correct answer with an explanation, then Next question follows', async () => {
    await wrongAnswer();
    fireEvent.click(screen.getByRole('button', { name: 'Show the right solution' }));
    const box = await screen.findByTestId('solution');
    expect(box.textContent).toMatch(/The right answer: .+/);
    expect(screen.queryByRole('button', { name: 'Skip to next question' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(await screen.findByText('Question 2 of 5')).toBeTruthy();
    expect(screen.queryByTestId('solution')).toBeNull(); // the next question starts clean
  });

  it('Skip to next question goes straight on, without showing the solution', async () => {
    await wrongAnswer();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to next question' }));
    expect(await screen.findByText('Question 2 of 5')).toBeTruthy();
    expect(screen.queryByTestId('solution')).toBeNull();
  });
});
