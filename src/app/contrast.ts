import { useSyncExternalStore } from 'react';
import { useSession } from './session';

/**
 * High contrast is a device choice as well as a profile choice.
 * Before anyone has a profile (the "Who is learning?" page) there is no profile to read it from,
 * so the choice is also kept on this device. Once a profile is open, the profile value is used too.
 */
const KEY = 'nova.contrast';
const listeners = new Set<() => void>();

function read(): boolean {
  try { return localStorage.getItem(KEY) === 'high'; } catch { return false; }
}
let current = read();

function setDevice(on: boolean): void {
  current = on;
  try { if (on) localStorage.setItem(KEY, 'high'); else localStorage.removeItem(KEY); } catch { /* private mode: not remembered */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Test helper: forget the device choice. */
export function resetDeviceContrast(): void { setDevice(false); }

export function useContrast(): { on: boolean; toggle: () => void } {
  const { profile, updateSettings } = useSession();
  const device = useSyncExternalStore(subscribe, () => current, () => false);
  const on = device || !!profile?.settings.highContrast;
  const toggle = () => {
    const next = !on;
    setDevice(next);
    if (profile && profile.settings.highContrast !== next) void updateSettings({ highContrast: next });
  };
  return { on, toggle };
}
