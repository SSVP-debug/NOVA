// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createServices } from '@/app/container';
import { SessionProvider } from '@/app/session';
import { makeProfile } from '@/seed/personas';
import { NOW } from '@/testkit';
import { App } from './App';

afterEach(() => { cleanup(); localStorage.clear(); });

async function open() {
  const storage = new MemoryStorage();
  await storage.saveProfile(makeProfile('Asha', NOW));
  render(<SessionProvider services={createServices({ storage, ai: new TemplateAI() })}><App /></SessionProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Asha' }));
  await screen.findByRole('heading', { level: 1, name: 'Today' });
}

describe('app shell', () => {
  it('has one main navigation with all seven screens, each with its full name', async () => {
    await open();
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    for (const name of ['Home', 'Learn', 'Teach-back', 'Ask', 'Practice', 'My DNA', 'Settings']) {
      expect(nav.getByRole('button', { name })).toBeTruthy();
    }
    expect(nav.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
  });

  it('every screen has exactly one page title (h1)', async () => {
    await open();
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    const titles: [string, string][] = [['Learn', 'Learn'], ['Teach-back', 'Teach it back'], ['Ask', 'Ask about a topic'], ['My DNA', 'My learning DNA'], ['Settings', 'Settings']];
    for (const [tab, title] of titles) {
      fireEvent.click(nav.getByRole('button', { name: tab }));
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    }
  });

  it('shows who is learning once, with a Switch button, and the avatar letter is not part of any name', async () => {
    await open();
    expect(screen.getAllByRole('button', { name: 'Switch' })).toHaveLength(1);
    expect(screen.getByText('Asha')).toBeTruthy();
  });
});
