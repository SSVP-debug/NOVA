import { clampTextScale } from '@/core/settings';
import type { Settings } from '@/core/types';

/**
 * High-contrast colours. Every text pair below is checked in theme.test.ts to reach WCAG AAA (7:1),
 * and borders reach 3:1 or more. They replace the normal colours (also in dark mode) when the student asks.
 */
export const HIGH_CONTRAST_VARS = {
  '--bg': '#ffffff', '--card': '#ffffff', '--tx': '#000000', '--mu': '#1f2933', '--ln': '#000000',
  '--ac': '#00386b', '--acb': '#e6f0fa', '--ok': '#005a1a', '--okb': '#e6f4ea',
  '--wn': '#6b3d00', '--wnb': '#fff3d6', '--bd': '#8a0000', '--bdb': '#fde8e8',
} as const;

// ---- WCAG contrast ratio
const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Applies display settings to the page. Safe to call again and again. */
export function applyDisplaySettings(s: Pick<Settings, 'textScale' | 'highContrast'>, root: HTMLElement = document.documentElement): void {
  root.style.fontSize = `${Math.round(clampTextScale(s.textScale) * 100)}%`;
  for (const [k, v] of Object.entries(HIGH_CONTRAST_VARS)) {
    if (s.highContrast) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (s.highContrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
}
