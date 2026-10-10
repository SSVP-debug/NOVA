import { planToday, reviewSchedule } from '@/core/engine';
import { useSession } from '@/app/session';
import { PackPicker } from '../PackPicker';
import { Icon, type IconName } from '../icons';
import { LearnedCard } from '../LearnedCard';
import { NextStepCard } from '../NextStepCard';
import type { Route } from '../App';

const STEP_LABEL: Record<string, string> = {
  diagnostic: 'Quick check',
  'fix-misconception': 'Fix a mistake',
  review: 'Review',
  'learn-new': 'Learn',
};

const STEP_ICON: Record<string, IconName> = { diagnostic: 'check', 'fix-misconception': 'fix', review: 'review', 'learn-new': 'learn' };
const STEP_CLASS: Record<string, string> = { 'fix-misconception': 'fix', review: 'review' };

export function Home({ go }: { go: (r: Route) => void }) {
  const { services, learner } = useSession();
  if (!learner) return null;
  const now = services.clock.now();
  const plan = planToday(learner, services.pack, now);
  const reviews = reviewSchedule(learner, services.pack, now);
  const due = reviews.filter((r) => r.due);
  const upcoming = reviews.find((r) => !r.due);
  return (
    <div className="home-grid">
      <div className="home-left">
      <PackPicker />
      <section className="card" aria-label="Today's plan">
        <div className="mu">Today's plan</div><h2 style={{ margin: '4px 0' }}>{plan.headline}</h2>
        <div className="steps">
          {plan.steps.map((s, i) => (
            <div className={`step ${STEP_CLASS[s.kind] ?? ''}`} key={i}>
              <span className="badge"><Icon name={STEP_ICON[s.kind] ?? 'learn'} /></span>
              <div><b>{STEP_LABEL[s.kind] ?? s.kind}: {services.pack.concepts.find((c) => c.id === s.concept)?.title}</b><div className="mu">{s.reason} About {s.estMinutes} min.</div></div>
              <button className="pri" onClick={() => go(s.kind === 'diagnostic' ? { name: 'diagnostic' } : s.kind === 'learn-new' ? { name: 'learn', concept: s.concept } : { name: 'practice', concept: s.concept, focus: s.misconception })}>Start</button>
            </div>
          ))}
        </div>
        {!plan.steps.length && <p className="mu">Nothing urgent. Pick any topic in Learn.</p>}
      </section>
      {reviews.length > 0 && (
        <section className="card" aria-label="Review schedule">
          <div className="mu">Review</div>
          <h3 style={{ margin: '4px 0' }}>{due.length ? `${due.length} topic${due.length > 1 ? 's' : ''} due for review` : 'Nothing due for review'}</h3>
          {due.map((r) => (
            <div className="due" key={r.concept}>
              <span><b>{r.title}</b> <span className="mu">{r.label}</span></span>
              <button onClick={() => go({ name: 'practice', concept: r.concept })} aria-label={`Review ${r.title}`}>Review</button>
            </div>
          ))}
          {!due.length && upcoming && <p className="mu">Next review: {upcoming.title}, {upcoming.label}.</p>}
        </section>
      )}
      </div>
      <aside className="home-right" aria-label="About you and your next step">
        <LearnedCard />
        <NextStepCard go={go} />
      </aside>
    </div>
  );
}
