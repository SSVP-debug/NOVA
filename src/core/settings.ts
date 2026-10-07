import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = { aiMode: 'auto', textScale: 1, highContrast: false, readAloud: false };

/** The text sizes a student can pick. Plain words, no jargon. */
export const TEXT_SIZES: readonly { label: string; value: number }[] = [
  { label: 'Normal', value: 1 },
  { label: 'Large', value: 1.25 },
  { label: 'Extra large', value: 1.5 },
];

export const MIN_TEXT_SCALE = 0.85;
export const MAX_TEXT_SCALE = 2;

export function clampTextScale(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 1;
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, v));
}

/** Fills gaps and fixes bad values (old profiles, imported files, hand-edited files). */
export function normalizeSettings(s: Partial<Settings> | null | undefined): Settings {
  return {
    aiMode: s?.aiMode === 'off' ? 'off' : 'auto',
    textScale: clampTextScale(s?.textScale),
    highContrast: s?.highContrast === true,
    readAloud: s?.readAloud === true,
  };
}
