import { useState } from 'react';
import { buildLesson, lessonText } from '@/core/engine';
import type { ExplanationStyle } from '@/core/types';
import { useSession } from '@/app/session';
import { ListenButton } from '../ListenButton';
import type { Route } from '../App';

const STYLE_LABEL: Record<ExplanationStyle, string> = {
  plain: 'Plain explanation',
  'worked-example': 'Worked example',
  analogy: 'Analogy',
  counterexample: 'Counterexample',
  socratic: 'Questions to think about',
};

/** The lesson is shown in the style NOVA chose for this student. The student may look at other styles. */
export function Learn({ concept, go }: { concept?: string; go: (r: Route) => void }) {
  const { services, learner } = useSession();
  const { pack } = services;
  const [alt, setAlt] = useState<{ concept: string; style: ExplanationStyle } | null>(null);
  const c = pack.concepts.find((x) => x.id === concept) ?? pack.concepts[0];
  if (!c || !learner) return null;
  const lesson = buildLesson(pack, learner, c.id);
  if (!lesson) return null;

  const shown = alt && alt.concept === c.id ? alt.style : lesson.style;
  const picked = shown !== lesson.style;
  const others = lesson.styles.filter((s) => s !== shown);

  return (
    <div>
      <div className="chips" role="group" aria-label="Topics">{pack.concepts.map((x) => <button key={x.id} className={x.id === c.id ? 'on' : ''} aria-pressed={x.id === c.id} onClick={() => go({ name: 'learn', concept: x.id })}>{x.title}</button>)}</div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{c.title}</h2>
        <div className="mu">Explained as: <b>{STYLE_LABEL[shown]}</b>{picked ? ' (your choice)' : ''}</div>
        <p className="lesson-text" aria-live="polite">{lessonText(pack, c.id, shown)}</p>
        <ListenButton label="the lesson" text={`${c.title}. ${lessonText(pack, c.id, shown)}`} />
        <details>
          <summary>Why this?</summary>
          <p>{picked ? `You picked this style yourself. NOVA would have chosen "${STYLE_LABEL[lesson.style]}". ${lesson.reason}` : lesson.reason}</p>
        </details>
        {others.length > 0 && (
          <div className="row" role="group" aria-label="Other ways to explain this">
            <span className="mu">Other styles:</span>
            {others.map((s) => <button key={s} onClick={() => setAlt({ concept: c.id, style: s })}>{STYLE_LABEL[s]}</button>)}
          </div>
        )}
        <div className="row">
          <button className="pri" onClick={() => go({ name: 'practice', concept: c.id })}>Practice this</button>
          <button onClick={() => go({ name: 'teach-back', concept: c.id })}>Teach this back</button>
        </div>
      </div>
    </div>
  );
}
