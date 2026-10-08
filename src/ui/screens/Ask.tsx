import { useState } from 'react';
import { matchConcepts } from '@/core/engine';
import { useSession } from '@/app/session';
import type { Route } from '../App';

export function Ask({ go }: { go: (route: Route) => void }) {
  const { services } = useSession();
  const { pack } = services;
  const [question, setQuestion] = useState('');
  const [matches, setMatches] = useState<ReturnType<typeof matchConcepts>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = matchConcepts(question, pack);
    setMatches(found);
    setSelected(found.length === 1 || (found[0] && found[0].score > (found[1]?.score ?? 0)) ? found[0]!.concept : null);
    setSearched(true);
  };

  const concept = pack.concepts.find((item) => item.id === selected);
  return (
    <div>
      <section className="card" aria-labelledby="ask-heading">
        <h2 id="ask-heading" style={{ marginTop: 0 }}>Ask about a topic</h2>
        <p>Describe what is confusing. NOVA finds a topic in this lesson pack and answers with its verified lesson text.</p>
        <form onSubmit={submit}>
          <label htmlFor="ask-question">What are you stuck on?</label>
          <textarea
            id="ask-question"
            rows={3}
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setMatches([]);
              setSelected(null);
              setSearched(false);
            }}
            placeholder="For example: I don't get loops"
          />
          <div className="row"><button className="pri" type="submit" disabled={!question.trim()}>Find my topic</button></div>
        </form>
        {searched && matches.length === 0 && (
          <p className="box tip" role="status">I couldn't match that to a topic in this lesson pack. Try a topic name such as loops or lists.</p>
        )}
        {matches.length > 0 && (
          <div>
            <p>{selected ? 'Matched topic:' : 'Which topic did you mean?'}</p>
            <div className="row" role="group" aria-label="Matched topics">
              {matches.map((match) => {
                const title = pack.concepts.find((item) => item.id === match.concept)?.title ?? match.concept;
                return (
                  <button
                    key={match.concept}
                    className={selected === match.concept ? 'on' : ''}
                    aria-pressed={selected === match.concept}
                    onClick={() => setSelected(match.concept)}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
      {concept && (
        <section className="card" aria-labelledby="ask-answer-heading" aria-live="polite">
          <h3 id="ask-answer-heading" style={{ marginTop: 0 }}>{concept.title}</h3>
          <p>{concept.explanations.plain ?? concept.summary}</p>
          <p className="mu">This answer comes from the verified lesson text and works without a model.</p>
          <div className="row">
            <button onClick={() => go({ name: 'learn', concept: concept.id })}>Open this lesson</button>
            <button className="pri" onClick={() => go({ name: 'practice', concept: concept.id })}>Try a short quiz</button>
          </div>
        </section>
      )}
    </div>
  );
}
