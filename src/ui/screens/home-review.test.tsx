// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createAdjustableClock } from '@/app/clock';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { applyAttempt, createLearner } from '@/core/engine';
import { makeProfile } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';
import { App } from '../App';

afterEach(() => { cleanup(); window.history.pushState({}, '', '/'); });

async function open(url: string) {
  window.history.pushState({}, '', url);
  const storage = new MemoryStorage();
  const p = makeProfile('Asha', NOW);
  await storage.saveProfile(p);
  await storage.saveLearner(applyAttempt(createLearner(p.id, pack, NOW), attempt({ concept: 'lists', correct: true, at: NOW }), pack));
  const clock = createAdjustableClock(() => NOW);
  const services = createServices({ storage, ai: new TemplateAI(), clock, demoClock: clock });
  render(<SessionProvider services={services}><App /></SessionProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Asha' }));
}

describe('Home review list and the demo time control', () => {
  it('shows the next review, then a due review after "+7 days", and Reset brings it back', async () => {
    await open('/?demo=1');
    expect(await screen.findByText('Nothing due for review')).toBeTruthy();
    expect(screen.getByText(/Next review: Lists, due in 3 days\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+7 days' }));
    expect(await screen.findByText('1 topic due for review')).toBeTruthy();
    expect(screen.getByText('due 4 days ago')).toBeTruthy();
    expect(screen.getByText('Review: Lists')).toBeTruthy(); // also a step in today's plan
    expect(screen.getByText(/7 days ahead of real time/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review Lists' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset time' }));
    expect(await screen.findByText('Nothing due for review')).toBeTruthy();
    expect(screen.getByText(/on real time/)).toBeTruthy();
  });

  it('keeps the demo tools hidden for a normal student (no ?demo)', async () => {
    await open('/');
    await screen.findByText('Nothing due for review');
    expect(screen.queryByRole('region', { name: 'Demo tools' })).toBeNull();
    expect(screen.queryByRole('button', { name: '+7 days' })).toBeNull();
  });
});
