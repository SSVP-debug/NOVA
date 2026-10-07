import { useState } from 'react';
import { useSession } from '@/app/session';
import { Diagnostic } from './screens/Diagnostic';
import { Dna } from './screens/Dna';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { Practice } from './screens/Practice';
import { ProfilePicker } from './screens/ProfilePicker';

export type Route =
  | { name: 'home' }
  | { name: 'learn'; concept?: string }
  | { name: 'practice'; concept?: string; focus?: string }
  | { name: 'diagnostic' }
  | { name: 'dna' };

/** Minimal state router (no extra dependency). Replace with a router library if URLs are needed. */
export function App() {
  const { ready, profile, selectProfile } = useSession();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  if (!ready) return <div className="wrap">Loading...</div>;
  if (!profile) return <ProfilePicker />;
  const tab = (name: Route['name'], label: string) => (
    <button className={route.name === name ? 'on' : ''} onClick={() => setRoute({ name } as Route)}>{label}</button>
  );
  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b style={{ fontSize: 24 }}>NOVA</b>
        <span className="mu">{profile.name} {profile.seeded ? '(sample data)' : ''} <button onClick={() => selectProfile(null)}>Switch</button></span>
      </div>
      <nav>{tab('home', 'Home')}{tab('learn', 'Learn')}{tab('practice', 'Practice')}{tab('dna', 'My DNA')}</nav>
      {route.name === 'home' && <Home go={setRoute} />}
      {route.name === 'learn' && <Learn concept={route.concept} go={setRoute} />}
      {route.name === 'practice' && <Practice key={`${route.concept}-${route.focus}`} concept={route.concept} focus={route.focus} go={setRoute} />}
      {route.name === 'diagnostic' && <Diagnostic go={setRoute} />}
      {route.name === 'dna' && <Dna />}
    </div>
  );
}
