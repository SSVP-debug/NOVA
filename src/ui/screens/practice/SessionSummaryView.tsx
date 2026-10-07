import { useSession } from '@/app/session';
import type { SessionSummary } from '@/core/engine';
import type { Route } from '../../App';

interface Props {
  summary: SessionSummary;
  go: (r: Route) => void;
  restart: (next?: { concept?: string; focus?: string }) => void;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function SessionSummaryView({ summary: s, go, restart }: Props) {
  const { services } = useSession();
  const conceptTitle = (id: string) => services.pack.concepts.find((c) => c.id === id)?.title ?? id;
  return (
    <div>
      <div className="card">
        <div className="mu">Session summary</div>
        <h2 style={{ margin: '4px 0' }}>{s.headline}</h2>
        <p style={{ fontSize: '1.25rem', margin: '4px 0' }}><b>{s.correct} of {s.total}</b> correct ({pct(s.accuracy)})</p>
        {s.sureWrong > 0 && (
          <p className="mu">You marked {s.sureWrong} wrong {s.sureWrong === 1 ? 'answer' : 'answers'} as "sure". Noticing this helps you double-check next time.</p>
        )}
      </div>

      {s.resolved.length > 0 && (
        <div className="card"><h3>Fixed in this session</h3>
          {s.resolved.map((r) => <div key={r.id} className="box good">{r.title}</div>)}
        </div>
      )}

      <div className="card"><h3>Mistakes NOVA found</h3>
        {s.mistakes.length === 0 && <p className="mu">No mistakes this time. Nice work.</p>}
        {s.mistakes.map((m) => (
          <div className="row" key={m.id} style={{ justifyContent: 'space-between' }}>
            <span>{m.title}</span><span className="tag">{m.count} time{m.count > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {s.concepts.length > 0 && (
        <div className="card"><h3>How your understanding moved</h3>
          {s.concepts.map((c) => (
            <div key={c.id} style={{ margin: '8px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{c.title}</b><span className="mu">{pct(c.before)} to {pct(c.after)}</span>
              </div>
              <div className="bar" role="img" aria-label={`${c.title}: ${pct(c.before)} before, ${pct(c.after)} after`}><i style={{ width: pct(c.after) }} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="mu">Your next step</div>
        {s.nextStep ? (
          <>
            <h3 style={{ margin: '4px 0' }}>{s.nextStep.kind.replace('-', ' ')}: {conceptTitle(s.nextStep.concept)}</h3>
            <p>{s.nextStep.reason} About {s.nextStep.estMinutes} min.</p>
            <button className="pri" onClick={() => restart({ concept: s.nextStep!.concept, focus: s.nextStep!.misconception })}>Start this step</button>
          </>
        ) : (
          <p>You are all caught up. Explore a topic in Learn, or come back tomorrow for a review.</p>
        )}
        <div className="row">
          <button onClick={() => restart()}>Practice again</button>
          <button onClick={() => go({ name: 'home' })}>Back to Home</button>
          <button onClick={() => go({ name: 'dna' })}>See my DNA</button>
        </div>
      </div>
    </div>
  );
}
