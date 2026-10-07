// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { downloadTextFile } from '@/app/download';
import { applyAttempt, createLearner } from '@/core/engine';
import { aaravLearner, makeProfile } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';
import { App } from '../App';
import { applyDisplaySettings } from '../theme';

vi.mock('@/app/download', () => ({ downloadTextFile: vi.fn() }));

const speak = vi.fn();
const cancel = vi.fn();

beforeEach(() => { vi.mocked(downloadTextFile).mockClear(); speak.mockClear(); cancel.mockClear(); });
afterEach(() => {
  cleanup();
  applyDisplaySettings({ textScale: 1, highContrast: false });
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
});

function fakeSpeech() {
  Object.defineProperty(window, 'speechSynthesis', { value: { speak, cancel, getVoices: () => [] }, configurable: true });
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
}

async function openApp(opts: { profileName?: string; storage?: MemoryStorage } = {}) {
  const storage = opts.storage ?? new MemoryStorage();
  const name = opts.profileName ?? 'Asha';
  if (!opts.storage) {
    const p = makeProfile(name, NOW);
    await storage.saveProfile(p);
    await storage.saveLearner(applyAttempt(createLearner(p.id, pack, NOW), attempt({ concept: 'lists', correct: true, at: NOW }), pack));
  }
  const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW }, demoClock: undefined });
  render(<SessionProvider services={services}><App /></SessionProvider>);
  fireEvent.click(await screen.findByRole('button', { name }));
  await screen.findByRole('navigation', { name: 'Main' });
  return { storage, services };
}
const goSettings = async () => { fireEvent.click(screen.getByRole('button', { name: 'Settings' })); await screen.findByText('Reading and display'); };

describe('keyboard and screen-reader basics', () => {
  it('has a skip link, a labelled main area, and marks the current tab', async () => {
    await openApp();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'My DNA' }));
    expect(screen.getByRole('button', { name: 'My DNA' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });

  it('moves focus to the new screen after using the tabs, so a keyboard user is not left behind', async () => {
    await openApp();
    const tab = screen.getByRole('button', { name: 'Settings' });
    tab.focus();
    fireEvent.click(tab);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('main')));
  });

  it('skip link jumps focus to the main area', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to main content' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });
});

describe('Settings: reading and display', () => {
  it('text size and high contrast change the page and are saved for the profile', async () => {
    const { storage } = await openApp();
    await goSettings();
    fireEvent.click(screen.getByLabelText('Large'));
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe('125%'));
    fireEvent.click(screen.getByLabelText(/High contrast colours/));
    await waitFor(() => expect(document.documentElement.dataset.contrast).toBe('high'));
    const saved = (await storage.listProfiles())[0]!;
    expect(saved.settings).toMatchObject({ textScale: 1.25, highContrast: true });
    fireEvent.click(screen.getByLabelText('Normal'));
    fireEvent.click(screen.getByLabelText(/High contrast colours/));
    await waitFor(() => expect(document.documentElement.dataset.contrast).toBeUndefined());
    expect(document.documentElement.style.fontSize).toBe('100%');
  });

  it('read aloud is switched off with a clear note when the browser cannot speak', async () => {
    await openApp();
    await goSettings();
    expect((screen.getByLabelText(/Read aloud/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/no read-aloud voice/)).toBeTruthy();
  });

  it('read aloud adds Listen buttons that speak the lesson, and stops speaking when they go away', async () => {
    fakeSpeech();
    await openApp();
    await goSettings();
    const box = screen.getByLabelText(/Read aloud/) as HTMLInputElement;
    expect(box.disabled).toBe(false);
    fireEvent.click(box);
    await waitFor(() => expect((screen.getByLabelText(/Read aloud/) as HTMLInputElement).checked).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    const listen = await screen.findByRole('button', { name: 'Listen to the lesson' });
    fireEvent.click(listen);
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0]![0] as { text: string }).text).toMatch(/Variables|Lists|Loops/);

    fireEvent.click(screen.getByRole('button', { name: 'My DNA' }));
    expect(cancel).toHaveBeenCalled();
  });

  it('without read aloud there is no Listen button', async () => {
    fakeSpeech();
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText(/Explained as/);
    expect(screen.queryByRole('button', { name: /^Listen/ })).toBeNull();
  });
});

describe('Settings: backup and restore (round trip through the screen)', () => {
  const fileOf = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' });
  const pick = async (f: File) => { await act(async () => { fireEvent.change(screen.getByLabelText('Choose a NOVA backup file'), { target: { files: [f] } }); }); };

  it('saves a backup with a clear file name and message', async () => {
    await openApp({ profileName: 'Asha' });
    await goSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Save a backup file' }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const [name, text] = vi.mocked(downloadTextFile).mock.calls[0]!;
    expect(name).toMatch(/^nova-backup-asha-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text)).toMatchObject({ format: 'nova-export', version: 1, profile: { name: 'Asha' } });
    expect(await screen.findByText(/Saved "nova-backup-asha-/)).toBeTruthy();
  });

  it('restores that backup on another device as a new profile with the same learning', async () => {
    // device 1: Aarav with history
    const s1 = new MemoryStorage();
    const p = makeProfile('Aarav', NOW, true);
    await s1.saveProfile(p);
    const learner = aaravLearner(p.id, pack, NOW);
    await s1.saveLearner(learner);
    await openApp({ profileName: 'Aarav', storage: s1 });
    await goSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Save a backup file' }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());
    const exported = vi.mocked(downloadTextFile).mock.calls[0]![1];
    cleanup();

    // device 2: empty, with a profile called Mia
    const s2 = new MemoryStorage();
    const mia = makeProfile('Mia', NOW);
    await s2.saveProfile(mia);
    await s2.saveLearner(createLearner(mia.id, pack, NOW));
    await openApp({ profileName: 'Mia', storage: s2 });
    await goSettings();
    await pick(fileOf(exported));
    expect(await screen.findByText(/Restored "Aarav" as a new profile/)).toBeTruthy();

    const all = await s2.listProfiles();
    expect(all.map((x) => x.name).sort()).toEqual(['Aarav', 'Mia']);
    const restored = all.find((x) => x.name === 'Aarav')!;
    const back = (await s2.loadLearner(restored.id, pack.id))!;
    expect({ ...back, profileId: p.id }).toEqual(learner);
    expect((await s2.loadLearner(mia.id, pack.id))!.history).toHaveLength(0); // Mia untouched
  });

  it('adds "(restored)" when a profile with that name already exists', async () => {
    const { storage } = await openApp({ profileName: 'Asha' });
    await goSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Save a backup file' }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());
    await pick(fileOf(vi.mocked(downloadTextFile).mock.calls[0]![1]));
    expect(await screen.findByText(/Restored "Asha \(restored\)"/)).toBeTruthy();
    expect((await storage.listProfiles()).map((x) => x.name).sort()).toEqual(['Asha', 'Asha (restored)']);
  });

  it('explains a wrong file in plain words and changes nothing', async () => {
    const { storage } = await openApp();
    await goSettings();
    await pick(fileOf('this is not json'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be read/);
    await pick(fileOf(JSON.stringify({ hello: 'world' })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/not a NOVA backup/));
    await pick(fileOf(JSON.stringify({ format: 'nova-export', version: 1, profile: { id: 'x', name: 'Z' }, learners: [{ bad: 1 }] })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/damaged or incomplete/));
    expect(await storage.listProfiles()).toHaveLength(1);
  });

  it('the profile screen has the same clear restore message', async () => {
    const storage = new MemoryStorage();
    const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW }, demoClock: undefined });
    render(<SessionProvider services={services}><App /></SessionProvider>);
    const btn = await screen.findByRole('button', { name: 'Restore from a backup file' });
    expect(btn).toBeTruthy();
    await pick(fileOf('nope'));
    expect(within(await screen.findByRole('alert')).getByText(/could not be read/)).toBeTruthy();
  });
});
