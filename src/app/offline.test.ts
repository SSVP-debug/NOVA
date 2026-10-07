import { describe, expect, it } from 'vitest';
import { createOfflineStore, describeOffline } from './offline';

describe('offline store', () => {
  it('starts from the environment and notifies on change only', () => {
    const st = createOfflineStore({ online: true, hasServiceWorkerController: false });
    let calls = 0;
    const off = st.subscribe(() => calls++);
    expect(st.getSnapshot()).toEqual({ cached: false, online: true });
    st.setOnline(true); // no change
    expect(calls).toBe(0);
    st.markCached();
    st.setOnline(false);
    expect(calls).toBe(2);
    expect(st.getSnapshot()).toEqual({ cached: true, online: false });
    off(); st.setOnline(true);
    expect(calls).toBe(2);
  });

  it('treats a page already controlled by a service worker as saved (a later visit)', () => {
    expect(createOfflineStore({ online: false, hasServiceWorkerController: true }).getSnapshot().cached).toBe(true);
  });

  it('gives a new object per change (needed by React)', () => {
    const st = createOfflineStore({ online: true, hasServiceWorkerController: false });
    const a = st.getSnapshot(); st.markCached();
    expect(st.getSnapshot()).not.toBe(a);
  });

  it('describes all four situations in plain words', () => {
    expect(describeOffline({ cached: true, online: true })).toMatchObject({ text: 'Ready to work offline', tone: 'good' });
    expect(describeOffline({ cached: true, online: false }).text).toMatch(/Offline mode/);
    expect(describeOffline({ cached: false, online: false }).tone).toBe('warn');
    expect(describeOffline({ cached: false, online: true }).text).toBe('Not saved for offline use yet');
  });
});
