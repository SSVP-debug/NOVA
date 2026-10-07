import { planToday } from '@/core/engine';
import { useSession } from '@/app/session';
import type { Route } from '../App';

export function Home({ go }: { go: (r: Route) => void }) {
  const { services, learner } = useSession();
  if (!learner) return null;
  const plan = planToday(learner, services.pack, services.clock.now());
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
    </div>
  );
}
