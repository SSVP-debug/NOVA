import { buildConceptMap } from '@/core/engine';
import { useSession } from '@/app/session';
import { Icon } from './icons';
import type { Route } from './App';

/** Points the student at the next thing to do in their chosen subject: learn the topic, then practise it, then teach it back. */
export function NextStepCard({ go }: { go: (r: Route) => void }) {
  const { services, learner } = useSession();
  if (!learner) return null;
  const { pack } = services;
  const map = buildConceptMap(pack, learner);
  const next = map.nodes.find((n) => n.status === 'new') ?? map.nodes.find((n) => n.status === 'shaky');
  const allSolid = !next;
  return (
    <section className="card next-step" aria-labelledby="next-h">
      <div className="mu">Your next step in {pack.title}</div>
      {next ? (
        <>
          <h3 id="next-h" style={{ margin: '4px 0' }}>Learn {next.title}</h3>
          <p className="mu" style={{ marginTop: 0 }}>{next.status === 'new' ? 'This is the next new topic for you.' : 'This topic is still shaky. Read it once more, then practise.'}</p>
          <ol className="path">
            <li><button className="pri" onClick={() => go({ name: 'learn', concept: next.id })}><Icon name="learn" size={18} /> Learn {next.title}</button></li>
            <li><button onClick={() => go({ name: 'practice', concept: next.id })}><Icon name="practice" size={18} /> Practise {next.title}</button></li>
            <li><button onClick={() => go({ name: 'teach-back', concept: next.id })}><Icon name="teach" size={18} /> Teach it back</button></li>
          </ol>
        </>
      ) : (
        <>
          <h3 id="next-h" style={{ margin: '4px 0' }}>{allSolid && map.nodes.some((n) => n.status === 'locked') ? 'Keep practising to open the locked topics' : 'All topics are solid'}</h3>
          <p className="mu" style={{ marginTop: 0 }}>Pick any topic in Learn to go deeper, or explain one in your own words.</p>
          <div className="row">
            <button className="pri" onClick={() => go({ name: 'learn' })}><Icon name="learn" size={18} /> Go to Learn</button>
            <button onClick={() => go({ name: 'teach-back' })}><Icon name="teach" size={18} /> Teach it back</button>
          </div>
        </>
      )}
    </section>
  );
}
