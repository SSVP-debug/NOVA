import { useState } from 'react';
import { buildIntervention, materializeQuestion, planToday, selectQuestion, summarizeSession } from '@/core/engine';
import { CONFIG } from '@/core/config';
import type { AttemptEvent, Confidence, ExplanationStyle, Intervention, MisconceptionId, Option, Question } from '@/core/types';
import { useSession } from '@/app/session';
import type { ScriptedQuestion } from '@/seed/demoScript';
import { demoToolsRequested } from '../../DemoTools';
import type { Route } from '../../App';
import { ListenButton } from '../../ListenButton';
import { SessionSummaryView } from './SessionSummaryView';

interface Result { option: Option; intervention?: Intervention; text?: string }
interface Props {
  concept?: string;
  focus?: string;
  scripted?: ScriptedQuestion;
  go: (r: Route) => void;
  restart: (next?: { concept?: string; focus?: string }) => void;
}

/** One practice session of CONFIG.session.length questions, then a summary. */
export function PracticeSession({ concept, focus, scripted, go, restart }: Props) {
  const { services, ai, learner, recordAttempt } = useSession();
  const { pack, generators, clock } = services;
  const length = CONFIG.session.length;

  const [before] = useState(learner); // snapshot for "before and after"
  const [startConcept] = useState(() => concept ?? (learner ? planToday(learner, pack, clock.now()).steps[0]?.concept : undefined) ?? pack.concepts[0]!.id);
  const [seed, setSeed] = useState(() => scripted?.seed ?? clock.now() % 100000);
  const [events, setEvents] = useState<AttemptEvent[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [probeFor, setProbeFor] = useState<MisconceptionId | undefined>();
  const [afterStyle, setAfterStyle] = useState<ExplanationStyle | undefined>();
  const [q, setQ] = useState<Question | null>(() => {
    if (!learner) return null;
    const spec = scripted ? pack.questions.find((x) => x.id === scripted.specId) : undefined;
    if (scripted && spec) return materializeQuestion(spec, generators, scripted.seed, [scripted.focus]); // demo: the same question for everyone
    return selectQuestion({ pack, state: learner, generators, concept: startConcept, seed, focus: focus ? [focus] : [] });
  });
  const [conf, setConf] = useState<Confidence | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [t0, setT0] = useState(() => clock.now());
  const [res, setRes] = useState<Result | null>(null);
  const [finished, setFinished] = useState(false);

  if (!learner || !before) return null;
  if (!q) return <div className="card">No questions for this topic yet. <button onClick={() => go({ name: 'home' })}>Back to Home</button></div>;

  if (finished) {
    const summary = summarizeSession(events, pack, before, learner, clock.now());
    return <SessionSummaryView summary={summary} go={go} restart={restart} />;
  }

  const conceptTitle = pack.concepts.find((c) => c.id === q.concept)?.title ?? q.concept;
  const done = events.length;
  const isLast = done >= length;

  const check = async () => {
    const o = q.options.find((x) => x.id === picked)!;
    const ev: AttemptEvent = {
      type: 'attempt', at: clock.now(), questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id,
      correct: !!o.correct, misconception: o.misconception, confidence: conf!, timeMs: clock.now() - t0, hintsUsed: hints,
      isProbe: !!probeFor, probeFor, afterStyle: probeFor ? afterStyle : undefined,
    };
    const next = await recordAttempt(ev);
    setEvents((e) => [...e, ev]);
    if (o.correct) { setRes({ option: o }); return; }
    const iv = buildIntervention(pack, next, q, o);
    setRes({ option: o, intervention: iv });
    setAfterStyle(iv.style);
    try { setRes({ option: o, intervention: iv, text: await ai.explain({ intervention: iv, learnerLevel: 'beginner' }) }); } catch { /* the template text is already on screen */ }
  };

  const nextQuestion = (asProbe: boolean) => {
    const s = seed + 1;
    const fb = asProbe ? res?.option.misconception : undefined;
    const nq = selectQuestion({ pack, state: learner, generators, concept: q.concept, seed: s, focus: fb ? [fb] : [], recentSpecIds: [...recent, q.specId] });
    if (!nq) { setFinished(true); return; }
    setSeed(s); setRecent((r) => [...r, q.specId]); setProbeFor(fb); if (!asProbe) setAfterStyle(undefined);
    setQ(nq); setConf(null); setPicked(null); setHints(0); setRes(null); setT0(clock.now());
  };

  return (
    <div>
      <div className="card" style={{ padding: 16 }}>
        <div className="qhead">
          <b>{conceptTitle}</b>
          <span className="mu">Question {Math.min(done + (res ? 0 : 1), length)} of {length}</span>
          <button onClick={() => (done > 0 ? setFinished(true) : go({ name: 'home' }))}>{done > 0 ? 'End session' : 'Leave'}</button>
        </div>
        <div className="bar" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={length} aria-valuenow={done}>
          <i style={{ width: `${(done / length) * 100}%` }} />
        </div>
      </div>

      <div className="card">
        {probeFor && <div className="mu">Probe: checking that this mistake is fixed</div>}
        <h3 style={{ marginTop: 4 }}>{q.prompt}</h3>
        {q.code && <pre>{q.code}</pre>}
        {!res && scripted && events.length === 0 && demoToolsRequested() && (
          <div className="box tip" data-testid="demo-helper">Demo helper: to show the mistake, pick "{q.options.find((o) => o.misconception === scripted.focus)?.text}".</div>
        )}
        {!res && <ListenButton label="the question" text={`${q.prompt} ${q.options.map((o, i) => `Option ${i + 1}: ${o.text}.`).join(' ')}`} />}

        {!res ? (
          <>
            <p className="mu" id="conf-label">How sure are you?</p>
            <div className="seg" role="group" aria-labelledby="conf-label">
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
              <button disabled={hints >= q.hints.length} onClick={() => setHints(hints + 1)}>Hint {q.hints.length ? `(${hints}/${q.hints.length})` : ''}</button>
              <button className="pri" disabled={!conf || !picked} onClick={check}>Check answer</button>
            </div>
            <div aria-live="polite">{q.hints.slice(0, hints).map((h, i) => <div className="box tip" key={i}>{h}</div>)}</div>
          </>
        ) : (
          <div aria-live="polite">
            {res.option.correct ? (
              <div className="box good"><b>Correct.</b></div>
            ) : (
              <>
                <div className="box bad"><b>Not quite.</b> {res.intervention?.evidence}</div>
                <div className="box tip">
                  <b>{res.intervention?.style}</b><br />{res.text ?? res.intervention?.baseText}
                  <details><summary>Why this?</summary>{res.intervention?.reason}</details>
                  <ListenButton label="the explanation" text={res.text ?? res.intervention?.baseText ?? ''} />
                </div>
              </>
            )}
            <div className="row">
              {isLast ? (
                <button className="pri" onClick={() => setFinished(true)}>See my summary</button>
              ) : res.option.correct ? (
                <button className="pri" onClick={() => nextQuestion(false)}>Next question</button>
              ) : (
                <>
                  <button className="pri" onClick={() => nextQuestion(true)}>Take the probe</button>
                  <button onClick={() => nextQuestion(false)}>Skip the probe</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
