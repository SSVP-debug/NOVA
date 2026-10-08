import { useState } from 'react';
import type { Route } from '../App';
import type { ScriptedQuestion } from '@/seed/demoScript';
import { PracticeSession } from './practice/PracticeSession';

interface Props {
  concept?: string;
  focus?: string;
  scripted?: ScriptedQuestion; // demo only: a fixed first question
  go: (r: Route) => void;
}

/** Holds "which session is this" so a session can be restarted (or redirected) without leaving the screen. */
export function Practice({ concept, focus, scripted, go }: Props) {
  const [run, setRun] = useState({ id: 0, concept, focus, scripted });
  const restart = (next?: { concept?: string; focus?: string }) =>
    setRun((r) => ({ id: r.id + 1, concept: next ? next.concept : r.concept, focus: next ? next.focus : r.focus, scripted: undefined }));
  return <PracticeSession key={run.id} concept={run.concept} focus={run.focus} scripted={run.scripted} go={go} restart={restart} />;
}
