/** Helpers for the backup file (export/import). No browser APIs except Intl, so they are easy to test. */

export function backupFileName(profileName: string, now: number): string {
  const slug = profileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'profile';
  const day = new Intl.DateTimeFormat('en-CA').format(now); // 2026-10-07 (the clock decides "now", not Date.now)
  return `nova-backup-${slug}-${day}.json`;
}

export const MAX_BACKUP_BYTES = 5_000_000;

/** Turns a technical import error into words a student understands. Never blames the student. */
export function describeImportError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof SyntaxError) return 'This file could not be read. Choose a NOVA backup file (.json) that you saved earlier.';
  if (/Not a NOVA export file/i.test(msg)) return 'This is not a NOVA backup file. Choose a file that was saved with "Save a backup file".';
  if (/Unsupported export version/i.test(msg)) return 'This backup was made by a different version of NOVA, so it cannot be opened here.';
  if (/no profile/i.test(msg)) return 'This backup has no profile in it.';
  if (/no learner data|damaged/i.test(msg)) return 'This backup looks damaged or incomplete, so it was not restored.';
  if (/too large/i.test(msg)) return 'This file is too large to be a NOVA backup.';
  return 'Something went wrong while restoring. Your current profiles were not changed.';
}
