import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/app/session';
import type { ScriptedQuestion } from '@/seed/demoScript';
import { DemoTools } from './DemoTools';
import { OfflineBadge } from './OfflineBadge';
import { Diagnostic } from './screens/Diagnostic';
import { Dna } from './screens/Dna';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { Practice } from './screens/Practice';
import { Settings } from './screens/Settings';
import { TeachBack } from './screens/TeachBack';
import { Ask } from './screens/Ask';
import { ProfilePicker } from './screens/ProfilePicker';
import { DEFAULT_SETTINGS } from '@/core/settings';
import { applyDisplaySettings } from './theme';
import { useContrast } from '@/app/contrast';
import { ContrastToggle } from './ContrastToggle';
import { Icon, StarMark, type IconName } from './icons';

export type Route =
  | { name: 'home' }
  | { name: 'learn'; concept?: string }
  | { name: 'teach-back'; concept?: string }
  | { name: 'ask' }
  | { name: 'practice'; concept?: string; focus?: string; scripted?: ScriptedQuestion }
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
  const { on: highContrast } = useContrast(); // works on the profile page too, where there is no profile yet

  // A different learner always starts on Home (no half-finished screen from the previous learner).
  // Done while rendering (not in an effect) so it can never fire after the student's next click.
  const [seenProfileId, setSeenProfileId] = useState(profile?.id);
  if (profile?.id !== seenProfileId) { setSeenProfileId(profile?.id); setRoute({ name: 'home' }); }

  // Text size follows the active profile. High contrast follows the toggle next to the logo (device and profile).
  useEffect(() => { applyDisplaySettings({ textScale: display.textScale, highContrast }); }, [display.textScale, highContrast]);

  // Keyboard and screen-reader users land at the top of the new screen after changing it,
  // unless a screen already moved focus somewhere more specific.
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    const a = document.activeElement;
    if (!a || a === document.body || a.closest('nav')) main.current?.focus();
  }, [route.name]);
  if (!ready) return <div className="stage" role="status">Loading...</div>;
  // The demo tools sit in the same place on every screen, so their timer and messages survive switching screens.
  const demoSlot = <div className="demo-slot"><DemoTools go={setRoute} /></div>;
  if (!profile) return (<>{demoSlot}<ProfilePicker /></>);
  // `short` is the label that fits the phone tab bar; the full label stays the button's name.
  const tab = (name: Route['name'], label: string, icon: IconName, short?: string) => (
    <button className={route.name === name ? 'on' : ''} aria-current={route.name === name ? 'page' : undefined} aria-label={short ? label : undefined} onClick={() => setRoute({ name } as Route)}>
      <Icon name={icon} />
      {short ? <><span className="long">{label}</span><span className="short" aria-hidden="true">{short}</span></> : <span>{label}</span>}
    </button>
  );
  const title = PAGE_TITLE[route.name];
  return (
    <>
    {demoSlot}
    <div className="shell">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>Skip to main content</a>
      <aside className="side">
        <div className="brand"><StarMark /><span>NOVA</span><ContrastToggle /></div>
        <nav className="tabs" aria-label="Main">
          {tab('home', 'Home', 'home')}{tab('learn', 'Learn', 'learn')}{tab('teach-back', 'Teach-back', 'teach', 'Teach')}{tab('ask', 'Ask', 'ask')}{tab('practice', 'Practice', 'practice')}{tab('dna', 'My DNA', 'dna')}{tab('settings', 'Settings', 'settings')}
        </nav>
        <div className="who">
          <span className="avatar" aria-hidden="true" style={{ background: profile.color }}>{profile.name.trim().charAt(0).toUpperCase()}</span>
          <span className="name"><b>{profile.name}</b>{profile.seeded && <span className="mu">sample data</span>}</span>
          <button onClick={() => selectProfile(null)}>Switch</button>
        </div>
        <div className="net"><OfflineBadge /></div>
      </aside>
      <main id="main" className="stage" ref={main} tabIndex={-1}>
      {title && <h1 className="page-title">{title}</h1>}
      {route.name === 'home' && <Home go={setRoute} />}
      {route.name === 'learn' && <Learn concept={route.concept} go={setRoute} />}
      {route.name === 'teach-back' && <TeachBack concept={route.concept} go={setRoute} />}
      {route.name === 'ask' && <Ask go={setRoute} />}
      {route.name === 'practice' && <Practice key={`${route.concept}-${route.focus}-${route.scripted?.run ?? ''}`} concept={route.concept} focus={route.focus} scripted={route.scripted} go={setRoute} />}
      {route.name === 'diagnostic' && <Diagnostic go={setRoute} />}
      {route.name === 'dna' && <Dna />}
      {route.name === 'settings' && <Settings />}
      </main>
    </div>
    </>
  );
}

/** Screens with their own heading (Ask, Teach back, Practice, Quick check) are not listed here. */
const PAGE_TITLE: Partial<Record<Route['name'], string>> = { home: 'Today', learn: 'Learn', dna: 'My learning DNA', settings: 'Settings' };
