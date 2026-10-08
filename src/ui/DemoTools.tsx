import { useState } from 'react';
import { formatDeviceCheck, runDeviceCheck } from '@/app/deviceCheck';
import { useSession } from '@/app/session';

/** True when the page was opened with ?demo=1 (the tools stay hidden for normal students). */
export const demoToolsRequested = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

/** Moves the app clock forward so the review schedule can be shown without waiting days. */
export function DemoTools() {
  const { canShiftTime, timeShiftDays, advanceDays, resetTime, services } = useSession();
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!canShiftTime || !demoToolsRequested()) return null;
  const check = async () => {
    setBusy(true); setCopied(false);
    try { setReport(formatDeviceCheck(await runDeviceCheck(services))); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(report ?? ''); setCopied(true); } catch { setCopied(false); } };
  return (
    <section className="card" role="region" aria-label="Demo tools" style={{ padding: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="mu" aria-live="polite">
          Demo tools: the app clock is {timeShiftDays === 0 ? 'on real time' : `${timeShiftDays} day${timeShiftDays === 1 ? '' : 's'} ahead of real time`}.
        </span>
        <span className="row" style={{ margin: 0 }}>
          <button onClick={() => advanceDays(1)}>+1 day</button>
          <button onClick={() => advanceDays(7)}>+7 days</button>
          <button onClick={resetTime} disabled={timeShiftDays === 0}>Reset time</button>
          <button onClick={check} disabled={busy}>{busy ? 'Measuring...' : 'Run device check'}</button>
        </span>
      </div>
      {report && (
        <div aria-live="polite">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{report}</pre>
          <button onClick={copy}>{copied ? 'Copied' : 'Copy these numbers'}</button>
        </div>
      )}
    </section>
  );
}
