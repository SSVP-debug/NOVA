/**
 * Tiny store that tells the UI whether the app is saved for offline use and whether the device is online.
 * No React and no virtual modules here, so it can be tested. main.tsx calls markOfflineReady()
 * when the service worker says the app is saved.
 */
export interface OfflineState {
  cached: boolean; // the service worker has saved the app on this device
  online: boolean; // the browser thinks it has a connection
}

export interface OfflineEnv {
  online: boolean;
  hasServiceWorkerController: boolean; // a service worker already controls this page (saved on an earlier visit)
}

export function createOfflineStore(env: OfflineEnv) {
  let state: OfflineState = { cached: env.hasServiceWorkerController, online: env.online };
  const listeners = new Set<() => void>();
  const set = (next: Partial<OfflineState>) => {
    const merged = { ...state, ...next };
    if (merged.cached === state.cached && merged.online === state.online) return;
    state = merged; // a new object each change, so React notices
    listeners.forEach((l) => l());
  };
  return {
    getSnapshot: () => state,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    markCached: () => set({ cached: true }),
    setOnline: (online: boolean) => set({ online }),
  };
}

/** Plain-words status for a screen reader and for the badge. */
export function describeOffline(s: OfflineState): { text: string; tone: 'good' | 'warn' | 'info' } {
  if (s.cached && s.online) return { text: 'Ready to work offline', tone: 'good' };
  if (s.cached && !s.online) return { text: 'Offline mode: working from files saved on this device', tone: 'good' };
  if (!s.cached && !s.online) return { text: 'Offline, and this device has not saved the app yet', tone: 'warn' };
  return { text: 'Not saved for offline use yet', tone: 'info' };
}

const browserEnv = (): OfflineEnv => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  hasServiceWorkerController: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
});

/** The one store the app uses. */
export const offlineStore = createOfflineStore(browserEnv());
export const markOfflineReady = () => offlineStore.markCached();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => offlineStore.setOnline(true));
  window.addEventListener('offline', () => offlineStore.setOnline(false));
}
