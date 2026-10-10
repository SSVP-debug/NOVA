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

afterEach(() => { cleanup(); localStorage.clear(); window.history.pushState({}, '', '/'); });

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

describe('Home: two parts', () => {
  it('keeps the plan on the left and puts what NOVA learned plus the next step on the right', async () => {
    await open('/');
    await screen.findByText('Nothing due for review');
    const right = screen.getByRole('complementary', { name: 'About you and your next step' });
    expect(right.textContent).toMatch(/What NOVA has learned about you/);
    expect(right.textContent).toMatch(/Your next step in /);
    const plan = screen.getByRole('region', { name: "Today's plan" });
    expect(right.contains(plan)).toBe(false);
    const learned = right.querySelector('#learned-h')!;
    const next = right.querySelector('#next-h')!;
    expect(learned.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // learned first, next step below it
  });

  it('the next step sends the student to Learn for a topic of their chosen subject', async () => {
    await open('/');
    await screen.findByText('Nothing due for review');
    const right = screen.getByRole('complementary', { name: 'About you and your next step' });
    const learnBtn = Array.from(right.querySelectorAll('button')).find((b) => /^Learn /.test((b.textContent ?? '').trim()))!;
    fireEvent.click(learnBtn);
    expect(await screen.findByRole('heading', { name: 'Learn' })).toBeTruthy();
  });

  it('the learned card is no longer on the DNA screen', async () => {
    await open('/');
    fireEvent.click(await screen.findByRole('button', { name: 'My DNA' }));
    await screen.findByText('Topic by topic');
    expect(screen.queryByText('What NOVA has learned about you')).toBeNull();
  });
});

describe('Page refresh', () => {
  it('opens the same student again instead of the profile page', async () => {
    const storage = new MemoryStorage();
    const p = makeProfile('Asha', NOW);
    await storage.saveProfile(p);
    const make = () => createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
    render(<SessionProvider services={make()}><App /></SessionProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Asha' }));
    await screen.findByRole('button', { name: 'Switch' });
    cleanup(); // same as refreshing the page: new React tree, same storage and localStorage
    render(<SessionProvider services={make()}><App /></SessionProvider>);
    expect(await screen.findByRole('button', { name: 'Switch' })).toBeTruthy();
    expect(screen.queryByText('Who is learning?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch' })); // Switch really leaves the profile
    await screen.findByText('Who is learning?');
    cleanup();
    render(<SessionProvider services={make()}><App /></SessionProvider>);
    expect(await screen.findByText('Who is learning?')).toBeTruthy(); // and a refresh after Switch stays on the profile page
  });
});
