import { useEffect, useRef, useState } from 'react';
import { diagnosticLength, nextDiagnosticQuestion, summarizeDiagnostic, type DiagnosticLevel, type DiagnosticSummary } from '@/core/engine';
import type { AttemptEvent, Confidence, PlanStep, Question } from '@/core/types';
import { useSession } from '@/app/session';
import type { Route } from '../App';
import { ListenButton } from '../ListenButton';

const LEVEL_TEXT: Record<DiagnosticLevel, string> = { 'needs-work': 'Needs work', building: 'Building', solid: 'Solid' };
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Quick check for a new profile. Answers are kept in memory while the student answers
 * and are saved together (through applyAttempt) only when the check is finished.
 * Leaving early saves nothing, so a half-finished check never leaves half-known data.
 */
export function Diagnostic({ go }: { go: (r: Route) => void }) {
  const { services, learner, recordAttempts } = useSession();
  const { pack, generators, clock } = services;
  const { min, max } = diagnosticLength(pack);

  const [before] = useState(learner); // snapshot for the "before and after" plan
  const [seed] = useState(() => clock.now() % 100000);
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState<AttemptEvent[]>([]);
  const [q, setQ] = useState<Question | null>(() => nextDiagnosticQuestion({ pack, generators, events: [], seed }));
  const [conf, setConf] = useState<Confidence | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [t0, setT0] = useState(() => clock.now());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<DiagnosticSummary | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new heading, so keyboard and screen-reader users are not left on a button that disappeared.
  useEffect(() => { heading.current?.focus(); }, [q?.id, started, saving, result]);

  if (!learner || !before) return null;
  const conceptTitle = (id: string) => pack.concepts.find((c) => c.id === id)?.title ?? id;

  if (!q) {
    return <div className="card">There are no check questions for this subject yet. <button onClick={() => go({ name: 'home' })}>Back to Home</button></div>;
  }

  const save = async (all: AttemptEvent[]) => {
    setSaving(true);
    setFailed(false);
    try {
      const after = await recordAttempts(all);
      setResult(summarizeDiagnostic(all, pack, before, after, clock.now()));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!conf || !picked || saving) return;
    const o = q.options.find((x) => x.id === picked)!;
    const ev: AttemptEvent = {
      type: 'attempt', at: clock.now(), questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id,
      correct: !!o.correct, misconception: o.misconception, confidence: conf, timeMs: clock.now() - t0, hintsUsed: 0, isProbe: false,
    };
    const all = [...events, ev];
    setEvents(all);
    const nq = nextDiagnosticQuestion({ pack, generators, events: all, seed });
    if (nq) { setQ(nq); setConf(null); setPicked(null); setT0(clock.now()); return; }
    void save(all);
  };

  // ---------- results ----------
  if (result) {
    const step = result.planAfter.steps[0];
    const startStep = (s: PlanStep) =>
      go(s.kind === 'learn-new' ? { name: 'learn', concept: s.concept } : { name: 'practice', concept: s.concept, focus: s.misconception });
    return (
      <div>
        <div className="card">
          <div className="mu">Quick check done</div>
          <h2 ref={heading} tabIndex={-1} style={{ margin: '4px 0' }}>Your starting point</h2>
          <p style={{ fontSize: '1.25rem', margin: '4px 0' }}><b>{result.correct} of {result.total}</b> correct</p>
          {result.sureWrong > 0 && (
            <p className="mu">You marked {result.sureWrong} wrong {result.sureWrong === 1 ? 'answer' : 'answers'} as "sure". Noticing this helps you double-check next time.</p>
          )}
        </div>

        <div className="card"><h3>Where you are, topic by topic</h3>
          {result.concepts.map((c) => (
            <div key={c.id} style={{ margin: '8px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{c.title}</b>
                <span className="mu">{c.correct} of {c.asked} right. {LEVEL_TEXT[c.level]} ({pct(c.mastery)})</span>
              </div>
              <div className="bar" role="img" aria-label={`${c.title}: ${LEVEL_TEXT[c.level]}, ${pct(c.mastery)}`}><i style={{ width: pct(c.mastery) }} /></div>
            </div>
          ))}
          <p className="mu">Topics without check questions yet are not placed.</p>
        </div>

        <div className="card"><h3>Mistakes NOVA found</h3>
          {result.mistakes.length === 0 && <p className="mu">No named mistakes this time.</p>}
          {result.mistakes.map((m) => (
            <div className="row" key={m.id} style={{ justifyContent: 'space-between' }}>
              <span>{m.title}</span><span className="tag">{m.count} time{m.count > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="mu">Your plan changed</div>
          <p className="mu" style={{ margin: '2px 0' }}>Before: {result.planBefore.headline}</p>
          <h3 style={{ margin: '4px 0' }}>Now: {result.planAfter.headline}</h3>
          {result.planAfter.steps.map((s, i) => (
            <div key={i} style={{ margin: '6px 0' }}>
              <b>{s.kind.replace('-', ' ')}: {conceptTitle(s.concept)}</b>
              <div className="mu">{s.reason} About {s.estMinutes} min.</div>
            </div>
          ))}
          <div className="row">
            {step && <button className="pri" onClick={() => startStep(step)}>Start the first step</button>}
            <button onClick={() => go({ name: 'home' })}>Back to Home</button>
            <button onClick={() => go({ name: 'dna' })}>See my DNA</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- intro ----------
  if (!started) {
    return (
      <div className="card">
        <h2 ref={heading} tabIndex={-1} style={{ marginTop: 0 }}>Quick check</h2>
        <p>{min === max ? `${max} questions` : `${min} to ${max} questions`}, a few minutes. NOVA uses your answers to see what you already know and where to start.</p>
        <ul>
          <li>For each question, first say how sure you are, then pick an answer.</li>
          <li>You will not see right or wrong marks during the check. The results come at the end.</li>
          <li>Your answers are saved on this device only when you finish.</li>
        </ul>
        <div className="row">
          <button className="pri" onClick={() => { setStarted(true); setT0(clock.now()); }}>Start the check</button>
          <button onClick={() => go({ name: 'home' })}>Not now</button>
        </div>
      </div>
    );
  }

  // ---------- saving ----------
  if (saving || failed) {
    return (
      <div className="card" aria-live="polite">
        <h2 ref={heading} tabIndex={-1} style={{ marginTop: 0 }}>{failed ? 'Could not save' : 'Saving your results'}</h2>
        {failed && (
          <>
            <p>Your answers are still here. Nothing was lost.</p>
            <button className="pri" onClick={() => void save(events)}>Try saving again</button>
          </>
        )}
      </div>
    );
  }

  // ---------- question ----------
  const done = events.length;
  return (
    <div>
      <div className="card" style={{ padding: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>Quick check</b>
          <span className="mu">Question {done + 1} of up to {max}</span>
          <button onClick={() => go({ name: 'home' })}>Leave</button>
        </div>
        <div className="bar" role="progressbar" aria-label="Quick check progress" aria-valuemin={0} aria-valuemax={max} aria-valuenow={done}>
          <i style={{ width: `${(done / max) * 100}%` }} />
        </div>
        <div className="mu">Leaving now saves nothing.</div>
      </div>

      <div className="card">
        <h3 ref={heading} tabIndex={-1} style={{ marginTop: 4 }}>{q.prompt}</h3>
        {q.code && <pre>{q.code}</pre>}
        <ListenButton label="the question" text={`${q.prompt} ${q.options.map((o, i) => `Option ${i + 1}: ${o.text}.`).join(' ')}`} />
        <p className="mu" id="dx-conf-label">How sure are you?</p>
        <div className="row" role="group" aria-labelledby="dx-conf-label">
          {(['sure', 'unsure', 'guess'] as Confidence[]).map((c) => (
            <button key={c} aria-pressed={conf === c} className={conf === c ? 'on' : ''} onClick={() => setConf(c)}>{c}</button>
          ))}
        </div>
        <div className="opts" role="group" aria-label="Answer choices">
          {q.options.map((o) => (
            <button key={o.id} aria-pressed={picked === o.id} className={`opt ${picked === o.id ? 'on' : ''}`} onClick={() => setPicked(o.id)}>{o.text}</button>
          ))}
        </div>
        <div className="row">
          <button className="pri" disabled={!conf || !picked} onClick={next}>Next</button>
        </div>
      </div>
    </div>
  );
}
