import { useState } from 'react';
import { backupFileName } from '@/app/backup';
import { downloadTextFile } from '@/app/download';
import { useSession } from '@/app/session';
import { isSpeechSupported } from '@/app/speech';
import { TEXT_SIZES } from '@/core/settings';
import { isLowResourceDevice } from '@/adapters/ai';
import { BackupImport } from '../BackupImport';

export function Settings() {
  const { profile, services, updateSettings, exportCurrent } = useSession();
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;
  const s = profile.settings;
  const speech = isSpeechSupported();

  const saveBackup = async () => {
    try {
      const text = await exportCurrent();
      const name = backupFileName(profile.name, services.clock.now());
      downloadTextFile(name, text);
      setError(null);
      setSaved(`Saved "${name}" in your downloads. Keep it somewhere safe, for example a USB stick. It holds your learning history.`);
    } catch {
      setSaved(null);
      setError('The backup could not be saved. Please try again.');
    }
  };

  return (
    <div>
      <section className="card" aria-labelledby="set-read">
        <h2 id="set-read" style={{ marginTop: 0 }}>Reading and display</h2>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><b>Text size</b></legend>
          {TEXT_SIZES.map((t) => (
            <label className="choice" key={t.value}>
              <input type="radio" name="textsize" checked={s.textScale === t.value} onChange={() => updateSettings({ textScale: t.value })} />
              {t.label}
            </label>
          ))}
        </fieldset>
        <label className="choice">
          <input type="checkbox" checked={s.highContrast} onChange={(e) => updateSettings({ highContrast: e.target.checked })} />
          High contrast colours (black text on white, thicker borders)
        </label>
        <label className="choice">
          <input type="checkbox" checked={s.readAloud && speech} disabled={!speech} onChange={(e) => updateSettings({ readAloud: e.target.checked })} />
          Read aloud: show a "Listen" button on questions and explanations
        </label>
        {!speech && <p className="mu">This browser has no read-aloud voice, so this option is off.</p>}
        <p className="mu">These choices are saved for {profile.name} on this device.</p>
      </section>

      <section className="card" aria-labelledby="set-ai">
        <h2 id="set-ai" style={{ marginTop: 0 }}>AI and lite mode</h2>
        <label className="choice">
          <input
            type="checkbox"
            checked={s.aiMode === 'off'}
            onChange={(e) => updateSettings({ aiMode: e.target.checked ? 'off' : 'auto' })}
          />
          Lite mode: use verified templates only (no model)
        </label>
        <p className="mu">
          {isLowResourceDevice()
            ? 'This device has limited memory or CPU, so NOVA automatically uses templates even when lite mode is off.'
            : 'In Auto mode, NOVA uses a configured local model when available and otherwise uses verified templates.'}
          {' '}Learning features work with the model off.
        </p>
      </section>

      <section className="card" aria-labelledby="set-backup">
        <h2 id="set-backup" style={{ marginTop: 0 }}>Backup and restore</h2>
        <p>Your learning stays on this device. If the browser data is cleared, it is gone. A backup file keeps it safe and lets you move to another device.</p>
        <div className="row"><button className="pri" type="button" onClick={saveBackup}>Save a backup file</button></div>
        <div aria-live="polite">
          {saved && <div className="box good">{saved}</div>}
          {error && <div className="box bad" role="alert">{error}</div>}
        </div>
        <p className="mu">Restoring adds a new profile. It never replaces an existing one.</p>
        <BackupImport />
      </section>
    </div>
  );
}
