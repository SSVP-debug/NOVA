// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { PACKS } from '@/content';
import { makeProfile } from '@/seed/personas';
import { NOW } from '@/testkit';
import { App } from './App';

afterEach(() => { cleanup(); localStorage.clear(); window.history.pushState({}, '', '/'); });

async function open(storage = new MemoryStorage()) {
  if (!(await storage.listProfiles()).length) await storage.saveProfile(makeProfile('Asha', NOW));
  const services = createServices({ storage, ai: new TemplateAI() });
  render(<SessionProvider services={services}><App /></SessionProvider>);
  // On a repeat visit the same student is opened again (page refresh), so there is nothing to pick.
  const who = await screen.findByRole('button', { name: /^(Asha|Switch)$/ });
  if (who.textContent !== 'Switch') fireEvent.click(who);
  return storage;
}
const subject = () => screen.findByLabelText('Subject') as Promise<HTMLSelectElement>;
const topics = async () => { fireEvent.click(screen.getByRole('button', { name: 'Learn' })); return screen.findByRole('heading', { level: 2 }); };

describe('Subject picker', () => {
  it('lists every subject and starts on the default one', async () => {
    await open();
    const sel = await subject();
    expect([...sel.options].map((o) => o.text)).toEqual(PACKS.map((p) => p.title));
    expect(sel.value).toBe('programming-basics');
  });

  it('switching shows the other subject\'s topics and Learn uses them', async () => {
    await open();
    fireEvent.change(await subject(), { target: { value: 'everyday-math' } });
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('everyday-math'));
    expect((await topics()).textContent).toBe('Fractions');
    expect(screen.queryByRole('button', { name: 'Loops' })).toBeNull();
  });

  it('each subject keeps its own progress', async () => {
    const storage = await open();
    fireEvent.change(await subject(), { target: { value: 'everyday-math' } });
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('everyday-math'));
    // a brand-new subject starts with a quick check, whatever happened in the other subject
    expect(await screen.findByText(/Quick check: Fractions/)).toBeTruthy();
    expect(await storage.loadLearner((await storage.listProfiles())[0]!.id, 'programming-basics')).toBeUndefined(); // nothing saved until the student answers
  });

  it('remembers the last subject on this device', async () => {
    const storage = await open();
    fireEvent.change(await subject(), { target: { value: 'everyday-math' } });
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('everyday-math'));
    cleanup();
    await open(storage); // next visit, same device
    expect((await subject()).value).toBe('everyday-math');
  });

  it('the other subject really runs: its quick check starts and asks a question', async () => {
    await open();
    fireEvent.change(await subject(), { target: { value: 'everyday-math' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start the check' }));
    expect(await screen.findByText(/Question 1 of up to/)).toBeTruthy();
  });

  it('is hidden when a test or build offers only one subject', async () => {
    const storage = new MemoryStorage();
    await storage.saveProfile(makeProfile('Asha', NOW));
    const services = createServices({ storage, ai: new TemplateAI(), pack: PACKS[0]! });
    render(<SessionProvider services={services}><App /></SessionProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Asha' }));
    await screen.findByText(/Today's plan/);
    expect(screen.queryByLabelText('Subject')).toBeNull();
  });
});
