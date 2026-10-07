import { planToday, reviewSchedule } from '@/core/engine';
import { useSession } from '@/app/session';
import type { Route } from '../App';

export function Home({ go }: { go: (r: Route) => void }) {
  const { services, learner } = useSession();
  if (!learner) return null;
  const now = services.clock.now();
  const plan = planToday(learner, services.pack, now);
  const reviews = reviewSchedule(learner, services.pack, now);
  const due = reviews.filter((r) => r.due);
  const upcoming = reviews.find((r) => !r.due);
  return (
    <div>
      <div className="card"><div className="mu">Today's plan</div><h2 style={{ margin: '4px 0' }}>{plan.headline}</h2>
        {plan.steps.map((s, i) => (
          <div className="row" key={i}>
            <div style={{ flex: 1 }}><b>{s.kind.replace('-', ' ')}: {services.pack.concepts.find((c) => c.id === s.concept)?.title}</b><div className="mu">{s.reason} About {s.estMinutes} min.</div></div>
            <button className="pri" onClick={() => go(s.kind === 'diagnostic' ? { name: 'diagnostic' } : s.kind === 'learn-new' ? { name: 'learn', concept: s.concept } : { name: 'practice', concept: s.concept, focus: s.misconception })}>Start</button>
          </div>
        ))}
        {!plan.steps.length && <p className="mu">Nothing urgent. Pick any topic in Learn.</p>}
      </div>
      {reviews.length > 0 && (
        <section className="card" aria-label="Review schedule">
          <div className="mu">Review</div>
          <h3 style={{ margin: '4px 0' }}>{due.length ? `${due.length} topic${due.length > 1 ? 's' : ''} due for review` : 'Nothing due for review'}</h3>
          {due.map((r) => (
            <div className="row" key={r.concept} style={{ justifyContent: 'space-between' }}>
              <span><b>{r.title}</b> <span className="mu">{r.label}</span></span>
              <button onClick={() => go({ name: 'practice', concept: r.concept })} aria-label={`Review ${r.title}`}>Review</button>
            </div>
          ))}
          {!due.length && upcoming && <p className="mu">Next review: {upcoming.title}, {upcoming.label}.</p>}
        </section>
      )}
    </div>
  );
}
