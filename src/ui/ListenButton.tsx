import { useEffect } from 'react';
import { isSpeechSupported, speak, stopSpeaking } from '@/app/speech';
import { useSession } from '@/app/session';

/** "Listen" button. Shows only when the student turned on read-aloud and the browser can speak. */
export function ListenButton({ text, label }: { text: string; label: string }) {
  const { profile } = useSession();
  useEffect(() => stopSpeaking, []); // stop talking when the text goes away
  if (!profile?.settings.readAloud || !isSpeechSupported() || !text.trim()) return null;
  return <button type="button" onClick={() => speak(text)} aria-label={`Listen to ${label}`}>Listen</button>;
}
