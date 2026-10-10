import { useEffect, useId, useState } from 'react';
import { isSpeechSupported, speak, stopSpeaking } from '@/app/speech';
import { useSession } from '@/app/session';
import { Icon } from './icons';

/**
 * "Listen" button. Reads the text out loud with the device's own voice (no internet needed).
 * Shows only when the student turned on read-aloud in Settings and the browser can speak.
 * Press again (it says "Stop") to stop.
 */
export function ListenButton({ text, label }: { text: string; label: string }) {
  const { profile } = useSession();
  const [talking, setTalking] = useState(false);
  const helpId = useId();
  useEffect(() => stopSpeaking, []); // stop talking when the text goes away
  useEffect(() => { setTalking(false); stopSpeaking(); }, [text]); // new text: stop reading the old one
  if (!profile?.settings.readAloud || !isSpeechSupported() || !text.trim()) return null;
  const press = () => {
    if (talking) { stopSpeaking(); setTalking(false); return; }
    setTalking(speak(text, 'en', () => setTalking(false)));
  };
  return (
    <span className="listen">
      <button type="button" onClick={press} aria-label={talking ? `Stop listening to ${label}` : `Listen to ${label}`} aria-describedby={helpId} title="Reads it out loud">
        <Icon name="listen" size={18} /> {talking ? 'Stop' : 'Listen'}
      </button>
      <span className="mu" id={helpId}>Reads {label} out loud.</span>
    </span>
  );
}
