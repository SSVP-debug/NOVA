import { useState } from 'react';
import { useSession } from '@/app/session';
import type { Route } from '../App';

export function TeachBack({ concept, go }: { concept?: string; go: (route: Route) => void }) {
  const { services, ai } = useSession();
  const { pack } = services;
  const [activeConcept, setActiveConcept] = useState(concept ?? pack.concepts[0]?.id ?? '');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof ai.evaluateTeachBack>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = pack.concepts.find((item) => item.id === activeConcept);
  if (!current) return <div className="card">There are no topics to explain yet.</div>;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await ai.evaluateTeachBack({ pack, concept: current.id, answer: answer.trim() }));
    } catch {
      setError('The feedback could not be checked. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const covered = new Set(result?.covered ?? []);
  return (
    <div>
      <section className="card" aria-labelledby="teach-back-heading">
        <h1 id="teach-back-heading" className="page-title">Teach it back</h1>
        <p>Explain the topic in your own words. NOVA checks your explanation against the key ideas.</p>
        <label className="field" htmlFor="teach-back-topic">Topic</label>
        <select
          className="wide"
          id="teach-back-topic"
          value={current.id}
          disabled={busy}
          onChange={(event) => {
            setActiveConcept(event.target.value);
            setAnswer('');
            setResult(null);
            setError(null);
          }}
        >
          {pack.concepts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <form onSubmit={submit}>
          <label className="field" htmlFor="teach-back-answer">Your explanation</label>
          <textarea
            className="wide"
            id="teach-back-answer"
            rows={5}
            value={answer}
            disabled={busy}
            onChange={(event) => {
              setAnswer(event.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder={`Explain ${current.title} in your own words`}
          />
          <div className="row">
            <button className="pri" type="submit" disabled={!answer.trim() || busy}>
              {busy ? 'Checking…' : 'Check my explanation'}
            </button>
          </div>
        </form>
        {error && <p className="box bad" role="alert">{error}</p>}
      </section>
      {result && (
        <section className="card" aria-labelledby="teach-back-result" aria-live="polite">
          <h3 id="teach-back-result" style={{ marginTop: 0 }}>
            {current.teachBack.length
              ? `Key ideas: ${result.covered.length} of ${current.teachBack.length} covered (${Math.round(result.score * 100)}%)`
              : 'No checklist items are available for this topic yet.'}
          </h3>
          {!!current.teachBack.length && (
            <ul>
              {current.teachBack.map((item) => (
                <li key={item.id}>
                  <b>{covered.has(item.id) ? 'Covered' : 'Still to mention'}:</b> {item.label}
                </li>
              ))}
            </ul>
          )}
          <p>{result.message}</p>
          <div className="row">
            <button onClick={() => go({ name: 'learn', concept: current.id })}>Review the lesson</button>
            <button onClick={() => go({ name: 'practice', concept: current.id })}>Practice this topic</button>
          </div>
        </section>
      )}
    </div>
  );
}
