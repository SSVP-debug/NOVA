import { useState } from 'react';
import { useSession } from '@/app/session';
import { BackupImport } from '../BackupImport';

export function ProfilePicker() {
  const { profiles, createProfile, selectProfile, seedDemoProfiles, removeProfile } = useSession();
  const [name, setName] = useState('');
  return (
    <div className="wrap">
      <h1>NOVA</h1>
      <p className="mu">Your personal learning twin. Works offline. No account needed.</p>
      <div className="card">
        <b>Who is learning?</b>
        {profiles.map((p) => (
          <div className="row" key={p.id}>
            <button onClick={() => selectProfile(p.id)} style={{ borderLeft: `6px solid ${p.color}` }}>{p.name}</button>
            <button onClick={() => removeProfile(p.id)} aria-label={`Delete ${p.name}`}>Delete</button>
          </div>
        ))}
        {!profiles.length && <p className="mu">No profiles yet.</p>}
      </div>
      <div className="card">
        <b>New profile</b>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" />
          <button className="pri" onClick={() => { createProfile(name); setName(''); }}>Start</button>
        </div>
      </div>
      <div className="row">
        <button onClick={seedDemoProfiles}>Load demo learners</button>
      </div>
      <div style={{ marginTop: 8 }}><BackupImport label="Restore from a backup file" /></div>
    </div>
  );
}
