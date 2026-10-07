import { useSyncExternalStore } from 'react';
import { describeOffline, offlineStore } from '@/app/offline';

/** Shows, in plain words, whether the app is saved for offline use. Useful as live proof in the demo. */
export function OfflineBadge() {
  const s = useSyncExternalStore(offlineStore.subscribe, offlineStore.getSnapshot, offlineStore.getSnapshot);
  const d = describeOffline(s);
  // The words carry the meaning; the dot is only decoration (never colour alone).
  const dot = d.tone === 'good' ? '\u25CF' : d.tone === 'warn' ? '\u25B2' : '\u25CB';
  return (
    <span role="status" className="mu" data-testid="offline-badge">
      <span aria-hidden="true" style={{ color: d.tone === 'good' ? 'var(--ok)' : d.tone === 'warn' ? 'var(--wn)' : 'var(--mu)' }}>{dot} </span>
      {d.text}
    </span>
  );
}
