/**
 * Read-aloud using the browser's built-in speech (works on the device, no server).
 * Prefers a voice that is installed locally, because online voices do not work offline.
 */
export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function speak(text: string, lang = 'en'): boolean {
  if (!isSpeechSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel(); // never talk over ourselves
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  const local = synth.getVoices().find((v) => v.localService && v.lang.toLowerCase().startsWith(lang));
  if (local) u.voice = local;
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
