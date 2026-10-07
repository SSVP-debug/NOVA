import { useRef, useState } from 'react';
import { describeImportError, MAX_BACKUP_BYTES } from '@/app/backup';
import { useSession } from '@/app/session';

/** "Restore from a backup file" with clear messages. Used on the profile screen and in Settings. */
export function BackupImport({ label = 'Restore from a backup file' }: { label?: string }) {
  const { importFile } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('too large');
      const p = await importFile(await file.text());
      setMsg({ ok: true, text: `Restored "${p.name}" as a new profile. Your other profiles were not changed. Use "Switch" to open it.` });
    } catch (e) {
      setMsg({ ok: false, text: describeImportError(e) });
    }
  };

  return (
    <div>
      <button type="button" onClick={() => input.current?.click()}>{label}</button>
      <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Choose a NOVA backup file"
        onChange={async (e) => { await onPick(e.target.files?.[0]); e.target.value = ''; }} />
      <div aria-live="polite" role={msg && !msg.ok ? 'alert' : 'status'}>
        {msg && <div className={`box ${msg.ok ? 'good' : 'bad'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
