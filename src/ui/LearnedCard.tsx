import { calibrationSummary } from '@/core/engine';
import type { ExplanationStyle } from '@/core/types';
import { useSession } from '@/app/session';

/** Plain names for the teaching styles. */
const STYLE_NAME: Record<ExplanationStyle, string> = {
  plain: 'Plain explanation',
  'worked-example': 'Worked example',
  analogy: 'Real-life comparison',
  counterexample: 'Counterexample',
  socratic: 'Guiding questions',
};

/** "What NOVA has learned about you": how sure the student is versus how often they are right, and which teaching style helps. */
export function LearnedCard() {
  const { learner } = useSession();
  if (!learner) return null;
  const cal = calibrationSummary(learner);
  const styles = Object.entries(learner.strategies).filter(([, v]) => v && v.shown > 0) as [ExplanationStyle, { shown: number; helped: number }][];
  return (
    <section className="card" aria-labelledby="learned-h">
      <h3 id="learned-h" style={{ marginTop: 0 }}>What NOVA has learned about you</h3>
      <p>{cal.enoughData ? `You said "Sure" ${cal.sureCount} times and ${cal.sureWrong} of those answers were wrong.` : 'Not enough answers yet to check your confidence.'}</p>
      {styles.length ? (
        <ul className="learned-list">
          {styles.map(([s, v]) => <li key={s}><b>{STYLE_NAME[s] ?? s}</b>: helped {v.helped} of {v.shown} {v.shown === 1 ? 'time' : 'times'}</li>)}
        </ul>
      ) : <p className="mu">No teaching-style history yet. Practise a few questions and NOVA will find what helps you most.</p>}
    </section>
  );
}
