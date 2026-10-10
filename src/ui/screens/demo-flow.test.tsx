// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createAdjustableClock } from '@/app/clock';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { DEMO_QUESTION } from '@/seed/demoScript';
import { DEMO_NAMES, makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import { App } from '../App';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); window.history.pushState({}, '', '/'); });

async function openDemo(storage = new MemoryStorage()) {
  window.history.pushState({}, '', '/?demo=1');
  const clock = createAdjustableClock(() => NOW);
  render(<SessionProvider services={createServices({ storage, ai: new TemplateAI(), clock, demoClock: clock })}><App /></SessionProvider>);
  await screen.findByRole('region', { name: 'Demo tools' });
  return storage;
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const nav = () => screen.findByRole('navigation', { name: 'Main' });
const code = () => screen.getByText(/nums = \[/).textContent!;
const timerStatus = () => within(screen.getByRole('region', { name: 'Demo tools' })).getByRole('status').textContent;
const optionButtons = () => within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');

/** Works out the true answer of a generated question from what is on screen (so the test needs no inside knowledge). */
function solve(): string {
  const text = code();
  if (/Which loop header/.test(screen.getByRole('heading', { level: 3 }).textContent ?? '')) return 'for i in range(0, len(nums)):';
  const nums = /nums = \[([^\]]+)\]/.exec(text)![1]!.split(',').map(Number);
  const [, s, e] = /range\((\d+), (\d+)\)/.exec(text)!.map(Number) as [number, number, number];
  return nums.slice(s, e).join('  ');
}
const answerWith = async (optionText: string) => {
  click('sure');
  fireEvent.click(optionButtons().find((b) => b.textContent === optionText)!);
  click('Check answer');
};

describe('the whole 3-minute demo, played through the real screens', () => {
  it('fresh learner then Aarav: same question, same wrong answer, different teaching; probe fixes it; reviews; reset', async () => {
    const storage = new MemoryStorage();
    const real = makeProfile('Asha', NOW); // a real student's profile must survive the demo reset
    await storage.saveProfile(real);
    await openDemo(storage);

    // 1. Fresh learner: the demo question with the mistake
    click('Open Fresh learner');
    await nav();
    expect(screen.getByText(/Fresh learner \(demo\)/)).toBeTruthy();
    click('Start demo question');
    const helper = (await screen.findByTestId('demo-helper')).textContent!;
    const wrongText = /pick "([^"]+)"/.exec(helper)![1]!;
    const freshCode = code();
    await answerWith(wrongText);
    expect(await screen.findByText(/Not quite\./)).toBeTruthy();
    expect(screen.getByText('plain')).toBeTruthy();
    expect(screen.getByText(/no history of what works for you yet/)).toBeTruthy();

    // 2. Switch to Aarav: back on Home, then the SAME question and the SAME wrong answer
    click('Open Aarav');
    await waitFor(() => expect(screen.getByText(/Aarav, 3 weeks of history \(demo\)/)).toBeTruthy());
    expect(screen.getByText("Today's plan")).toBeTruthy();
    click('Start demo question');
    expect(code()).toBe(freshCode);
    expect((await screen.findByTestId('demo-helper')).textContent).toBe(helper);
    await answerWith(wrongText);
    expect(await screen.findByText(/Not quite\./)).toBeTruthy();
    expect(screen.getByText('counterexample')).toBeTruthy();
    expect(screen.getByText(/counterexample helped you before \(2 of 2 follow-up questions correct\)/)).toBeTruthy();

    // 3. See the right solution, then the next question checks the fix: answer it correctly, the mistake is fixed
    click('Show the right solution');
    expect(await screen.findByTestId('solution')).toBeTruthy();
    click('Next question');
    await screen.findByText(/Probe: checking that this mistake is fixed/);
    await answerWith(solve());
    expect(await screen.findByText('Correct.')).toBeTruthy();
    click('End session');
    expect(await screen.findByText('Session summary')).toBeTruthy();
    expect(screen.getByText('Fixed in this session')).toBeTruthy();
    expect(screen.getAllByText('Off-by-one (loop start)').length).toBeGreaterThan(0);

    // 4. Home shows reviews waiting
    click('Back to Home');
    expect(await screen.findByRole('heading', { name: /topics? due for review/ })).toBeTruthy();

    // 5. Reset: asks first, recreates the two demo learners, never touches the real profile
    click('Reset demo data');
    expect(screen.getByRole('alert').textContent).toMatch(/Only sample-data profiles change/);
    click('Yes, reset');
    expect(await screen.findByText(/Demo learners reset\. Real profiles were not touched\./)).toBeTruthy();
    const names = (await storage.listProfiles()).map((p) => p.name).sort();
    expect(names).toEqual(['Asha', DEMO_NAMES.aarav, DEMO_NAMES.fresh].sort());
    const aarav = (await storage.listProfiles()).find((p) => p.name === DEMO_NAMES.aarav)!;
    const back = (await storage.loadLearner(aarav.id, pack.id))!;
    expect(back.misconceptions[DEMO_QUESTION.focus]!.status).toBe('active'); // back to the start of the story
    expect(back.history).toHaveLength(15);
    expect((await storage.loadLearner(real.id, pack.id)) ?? null).toBeNull(); // Asha had no data and was left alone
    expect((await storage.getProfile(real.id))!.name).toBe('Asha');
  });

  it('opening the demo learners twice never creates duplicates', async () => {
    const storage = await openDemo();
    click('Open Fresh learner');
    await nav();
    click('Switch');
    await screen.findByRole('region', { name: 'Demo tools' });
    click('Open Fresh learner');
    await nav();
    click('Open Aarav');
    await waitFor(() => expect(screen.getByText(/Aarav, 3 weeks/)).toBeTruthy());
    expect((await storage.listProfiles()).map((p) => p.name).sort()).toEqual([DEMO_NAMES.aarav, DEMO_NAMES.fresh].sort());
  });

  it('Cancel leaves everything as it was', async () => {
    const storage = await openDemo();
    click('Open Fresh learner');
    await nav();
    const before = (await storage.listProfiles()).map((p) => p.id);
    click('Reset demo data');
    click('Cancel');
    expect(screen.queryByRole('alert')).toBeNull();
    expect((await storage.listProfiles()).map((p) => p.id)).toEqual(before);
  });

  it('the demo tools are hidden for a normal student', async () => {
    const storage = new MemoryStorage();
    window.history.pushState({}, '', '/');
    const clock = createAdjustableClock(() => NOW);
    render(<SessionProvider services={createServices({ storage, ai: new TemplateAI(), clock, demoClock: clock })}><App /></SessionProvider>);
    await screen.findByText('Who is learning?');
    expect(screen.queryByRole('region', { name: 'Demo tools' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset demo data' })).toBeNull();
  });
});

describe('rehearsal timer', () => {
  it('keeps running when the screen changes (switching profile must not reset it)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let t = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    await openDemo();
    click('Start timer');
    click('Open Fresh learner');
    await nav();
    t += 30_000;
    click('Switch'); // back to the profile screen
    await screen.findByText('Who is learning?');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByLabelText('Rehearsal timer').textContent).toBe('0:30');
  });

  it('shows the running time and says whether the run was under 3 minutes', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let t = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    await openDemo();
    click('Start timer');
    t += 65_000;
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByLabelText('Rehearsal timer').textContent).toBe('1:05');
    click('Stop timer');
    expect(timerStatus()).toBe('Run time 1:05 (under 3:00)');

    click('Start timer');
    t += 200_000;
    click('Stop timer');
    expect(timerStatus()).toBe('Run time 3:20 (over 3:00: trim the script)');
  });
});
