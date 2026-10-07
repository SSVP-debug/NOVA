import { describe, expect, it } from 'vitest';
import { clampTextScale, DEFAULT_SETTINGS, normalizeSettings, TEXT_SIZES } from './settings';

describe('settings', () => {
  it('fills gaps and fixes bad values', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ textScale: 99, highContrast: true })).toEqual({ aiMode: 'auto', textScale: 2, highContrast: true, readAloud: false });
    expect(normalizeSettings({ textScale: NaN as unknown as number, aiMode: 'weird' as never }).textScale).toBe(1);
    expect(normalizeSettings({ aiMode: 'off' }).aiMode).toBe('off');
  });
  it('keeps text size inside a safe range', () => {
    expect(clampTextScale(0.1)).toBe(0.85);
    expect(clampTextScale(5)).toBe(2);
    expect(clampTextScale('big')).toBe(1);
  });
  it('offers three plain text sizes, starting at normal', () => {
    expect(TEXT_SIZES.map((t) => t.label)).toEqual(['Normal', 'Large', 'Extra large']);
    expect(TEXT_SIZES[0]!.value).toBe(1);
  });
});
