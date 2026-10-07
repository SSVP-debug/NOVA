import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/app/session';
import { DemoTools } from './DemoTools';
import { OfflineBadge } from './OfflineBadge';
import { Diagnostic } from './screens/Diagnostic';
import { Dna } from './screens/Dna';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { Practice } from './screens/Practice';
import { Settings } from './screens/Settings';
import { ProfilePicker } from './screens/ProfilePicker';
import { DEFAULT_SETTINGS } from '@/core/settings';
import { applyDisplaySettings } from './theme';

export type Route =
  | { name: 'home' }
  | { name: 'learn'; concept?: string }
  | { name: 'practice'; concept?: string; focus?: string }
  | { name: 'diagnostic' }
  | { name: 'dna' }
  | { name: 'settings' };

/** Minimal state router (no extra dependency). Replace with a router library if URLs are needed. */
export function App() {
  const { ready, profile, selectProfile } = useSession();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const main = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);
  const display = profile?.settings ?? DEFAULT_SETTINGS;

  // Text size and high contrast follow the active profile.
  useEffect(() => { applyDisplaySettings(display); }, [display.textScale, display.highContrast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard and screen-reader users land at the top of the new screen after changing it,
  // unless a screen already moved focus somewhere more specific.
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    const a = document.activeElement;
    if (!a || a === document.body || a.closest('nav')) main.current?.focus();
  }, [route.name]);
  if (!ready) return <div className="wrap">Loading...</div>;
  if (!profile) return (<><ProfilePicker /><div className="wrap"><OfflineBadge /></div></>);
  const tab = (name: Route['name'], label: string) => (
    <button className={route.name === name ? 'on' : ''} aria-current={route.name === name ? 'page' : undefined} onClick={() => setRoute({ name } as Route)}>{label}</button>
  );
  return (
    <div className="wrap">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>Skip to main content</a>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b style={{ fontSize: '1.5rem' }}>NOVA</b>
        <span className="mu">{profile.name} {profile.seeded ? '(sample data)' : ''} <button onClick={() => selectProfile(null)}>Switch</button></span>
      </div>
      <div style={{ margin: '2px 0 6px' }}><OfflineBadge /></div>
      <DemoTools />
      <nav aria-label="Main">{tab('home', 'Home')}{tab('learn', 'Learn')}{tab('practice', 'Practice')}{tab('dna', 'My DNA')}{tab('settings', 'Settings')}</nav>
      <main id="main" ref={main} tabIndex={-1}>
      {route.name === 'home' && <Home go={setRoute} />}
      {route.name === 'learn' && <Learn concept={route.concept} go={setRoute} />}
      {route.name === 'practice' && <Practice key={`${route.concept}-${route.focus}`} concept={route.concept} focus={route.focus} go={setRoute} />}
      {route.name === 'diagnostic' && <Diagnostic go={setRoute} />}
      {route.name === 'dna' && <Dna />}
      {route.name === 'settings' && <Settings />}
      </main>
    </div>
  );
}
