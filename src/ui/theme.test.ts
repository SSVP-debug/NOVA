// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyDisplaySettings, contrastRatio, HIGH_CONTRAST_VARS as C } from './theme';

describe('contrast maths', () => {
  it('matches the WCAG definition', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#767676')).toBeGreaterThan(4.5); // the well-known AA boundary grey
  });
});

describe('high-contrast palette meets WCAG AAA (7:1) for text and 3:1 for borders', () => {
  const text: [string, string, string][] = [
    ['text on page', C['--tx'], C['--bg']],
    ['text on cards', C['--tx'], C['--card']],
    ['secondary text on page', C['--mu'], C['--bg']],
    ['secondary text on cards', C['--mu'], C['--card']],
    ['text on tip boxes', C['--tx'], C['--acb']],
    ['selected button text', C['--ac'], C['--acb']],
    ['button text on page', C['--ac'], C['--bg']],
    ['white on primary button', '#ffffff', C['--ac']],
    ['correct message', C['--ok'], C['--okb']],
    ['warning message', C['--wn'], C['--wnb']],
    ['wrong message', C['--bd'], C['--bdb']],
  ];
  for (const [name, fg, bg] of text) {
    it(`${name}: ${fg} on ${bg}`, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7));
  }
  it('borders stand out from the background', () => {
    expect(contrastRatio(C['--ln'], C['--bg'])).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(C['--ln'], C['--card'])).toBeGreaterThanOrEqual(3);
  });
});

describe('applyDisplaySettings', () => {
  it('sets and clears text size and high contrast on the page', () => {
    const root = document.createElement('div');
    applyDisplaySettings({ textScale: 1.25, highContrast: true }, root);
    expect(root.style.fontSize).toBe('125%');
    expect(root.dataset.contrast).toBe('high');
    expect(root.style.getPropertyValue('--tx')).toBe('#000000');
    applyDisplaySettings({ textScale: 1, highContrast: false }, root);
    expect(root.style.fontSize).toBe('100%');
    expect(root.dataset.contrast).toBeUndefined();
    expect(root.style.getPropertyValue('--tx')).toBe('');
  });
  it('refuses silly sizes', () => {
    const root = document.createElement('div');
    applyDisplaySettings({ textScale: 50, highContrast: false }, root);
    expect(root.style.fontSize).toBe('200%');
  });
});
