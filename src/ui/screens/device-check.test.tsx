// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createAdjustableClock } from '@/app/clock';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { createLearner } from '@/core/engine';
import { makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import { App } from '../App';

afterEach(() => { cleanup(); window.history.pushState({}, '', '/'); });

async function open(url: string) {
  window.history.pushState({}, '', url);
  const storage = new MemoryStorage();
  const p = makeProfile('Asha', NOW);
  await storage.saveProfile(p);
  await storage.saveLearner(createLearner(p.id, pack, NOW));
  const clock = createAdjustableClock(() => NOW);
  render(<SessionProvider services={createServices({ storage, ai: new TemplateAI(), clock, demoClock: clock })}><App /></SessionProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Asha' }));
  await screen.findByRole('navigation', { name: 'Main' }); // the demo tools also show on the profile screen, so wait for the main screen
}

describe('device check button (demo tools)', () => {
  it('measures on this device and shows numbers to copy', async () => {
    await open('/?demo=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Run device check' }));
    expect(await screen.findByText(/Engine \(mean per call\)/)).toBeTruthy();
    expect(screen.getByText(/Save one answer \(applyAttempt\): [\d.]+ microseconds/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy these numbers' })).toBeTruthy();
  });
  it('is hidden for a normal student', async () => {
    await open('/');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(screen.queryByRole('button', { name: 'Run device check' })).toBeNull();
  });
});
