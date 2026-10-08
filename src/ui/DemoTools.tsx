import { useEffect, useRef, useState } from 'react';
import { formatDeviceCheck, runDeviceCheck } from '@/app/deviceCheck';
import { useSession } from '@/app/session';
import { DEMO_CONCEPT, DEMO_QUESTION } from '@/seed/demoScript';
import type { Route } from './App';

/** True when the page was opened with ?demo=1 (the tools stay hidden for normal students). */
export const demoToolsRequested = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/**
 * Demo tools (task D5), hidden unless the page is opened with ?demo=1:
 * time controls, one-click demo learners, the fixed demo question, a reset that never touches real
 * profiles, a rehearsal timer for the 3-minute run, and the device check.
 */
export function DemoTools({ go }: { go: (r: Route) => void }) {
  const { canShiftTime, timeShiftDays, advanceDays, resetTime, services, profile, openDemoProfile, resetDemoProfiles } = useSession();
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [note, setNote] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const runs = useRef(0);

  useEffect(() => { // tick the rehearsal timer (real time, not the demo clock)
    if (startedAt === null) return;
    const id = setInterval(() => setElapsed(performance.now() - startedAt), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!canShiftTime || !demoToolsRequested()) return null;

  const check = async () => {
    setBusy(true); setCopied(false);
    try { setReport(formatDeviceCheck(await runDeviceCheck(services))); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(report ?? ''); setCopied(true); } catch { setCopied(false); } };
  const open = async (kind: 'fresh' | 'aarav') => { setNote(''); await openDemoProfile(kind); };
  const startQuestion = () => {
    runs.current += 1;
    go({ name: 'practice', concept: DEMO_CONCEPT, focus: DEMO_QUESTION.focus, scripted: { ...DEMO_QUESTION, run: runs.current } });
  };
  const reset = async () => {
    await resetDemoProfiles();
    setConfirmReset(false);
    setNote('Demo learners reset. Real profiles were not touched.');
  };
  const toggleTimer = () => {
    if (startedAt === null) { setStartedAt(performance.now()); setElapsed(0); return; }
    setLastRun(performance.now() - startedAt); setStartedAt(null);
  };

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
        </span>
      </div>

      <div className="row" role="group" aria-label="Demo learners">
        <button onClick={() => open('fresh')}>Open Fresh learner</button>
        <button onClick={() => open('aarav')}>Open Aarav</button>
        <button onClick={startQuestion} disabled={!profile}>Start demo question</button>
        {!confirmReset
          ? <button onClick={() => setConfirmReset(true)}>Reset demo data</button>
          : (<span role="alert" className="row" style={{ margin: 0 }}>
              <span>Recreate the two demo learners? Only sample-data profiles change.</span>
              <button className="pri" onClick={reset}>Yes, reset</button>
              <button onClick={() => setConfirmReset(false)}>Cancel</button>
            </span>)}
      </div>
      <div aria-live="polite" className="mu">{note}</div>

      <div className="row">
        <button onClick={toggleTimer}>{startedAt === null ? 'Start timer' : 'Stop timer'}</button>
        <span aria-label="Rehearsal timer">{startedAt !== null ? mmss(elapsed) : '0:00'}</span>
        {lastRun !== null && <span role="status">Run time {mmss(lastRun)} {lastRun < 180000 ? '(under 3:00)' : '(over 3:00: trim the script)'}</span>}
        <button onClick={check} disabled={busy}>{busy ? 'Measuring...' : 'Run device check'}</button>
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
