import { useState } from 'react';
import { useSession } from '@/app/session';
import { BackupImport } from '../BackupImport';
import { OfflineBadge } from '../OfflineBadge';
import { StarMark } from '../icons';

export function ProfilePicker() {
  const { profiles, createProfile, selectProfile, seedDemoProfiles, removeProfile } = useSession();
  const [name, setName] = useState('');
  return (
    <div className="welcome">
      <main>
        <div className="hero-mark"><StarMark size={48} /><h1>NOVA</h1></div>
        <p style={{ fontSize: '1.125rem', margin: '0 0 1.5rem' }}>Your personal learning twin. Works offline. No account needed.</p>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem' }}>Who is learning?</h2>
          {profiles.map((p) => (
            <div className="row" key={p.id} style={{ flexWrap: 'nowrap' }}>
              <button className="who-btn" onClick={() => selectProfile(p.id)} style={{ flex: 1, margin: 0 }}>
                <span className="avatar" aria-hidden="true" style={{ background: p.color }}>{p.name.trim().charAt(0).toUpperCase()}</span>{p.name}
              </button>
              <button onClick={() => removeProfile(p.id)} aria-label={`Delete ${p.name}`}>Delete</button>
            </div>
          ))}
          {!profiles.length && <p className="mu">No profiles yet. Add yours below.</p>}
        </div>
        <div className="card">
          <h2 style={{ fontSize: '1.125rem' }}>New profile</h2>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input style={{ flex: 1, minWidth: 0 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" />
            <button className="pri" onClick={() => { createProfile(name); setName(''); }}>Start</button>
          </div>
        </div>
        <div className="row">
          <button onClick={seedDemoProfiles}>Load demo learners</button>
          <BackupImport label="Restore from a backup file" />
        </div>
        <div className="net" style={{ marginTop: '1rem' }}><OfflineBadge /></div>
      </main>
    </div>
  );
}
