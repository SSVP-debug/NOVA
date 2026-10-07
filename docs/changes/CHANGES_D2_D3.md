# Change note: tasks D2 (accessibility) and D3 (backup and restore)

## What a student sees
A new **Settings** tab.
- **Text size:** Normal, Large, Extra large. Everything scales (sizes now use rem, not pixels).
- **High contrast colours:** black on white, thicker borders. The palette is tested to WCAG AAA (7:1 for text, 3:1 for borders).
- **Read aloud:** shows a **Listen** button on lessons, questions and explanations. It uses the browser's own voice, preferring a voice installed on the device. If the browser has no voice, the option is greyed out with a note.
- **Backup and restore:** "Save a backup file" downloads `nova-backup-<name>-<date>.json` and says so. "Restore from a backup file" (also on the profile screen) adds a NEW profile, adds "(restored)" if the name already exists, and explains problems in plain words (not a NOVA file, unreadable file, different version, damaged file). A bad file changes nothing.
- Settings are saved per profile.

Keyboard and screen-reader basics: "Skip to main content" link, a `main` area, `aria-current` on the active tab, a labelled navigation, and focus moves to the new screen after changing tabs (unless a screen already placed focus somewhere better). Reduced-motion is respected.

## Bug found and fixed by the tests
Two quick setting changes could overwrite each other (the second started from an old copy of the profile). `updateSettings` now builds on the newest profile.

## Files
New: `src/core/settings.ts` (+ test), `src/app/speech.ts`, `src/app/download.ts`, `src/app/backup.ts` (+ test), `src/ui/theme.ts` (+ test), `src/ui/ListenButton.tsx`, `src/ui/BackupImport.tsx`, `src/ui/screens/Settings.tsx`, `src/ui/screens/settings.test.tsx`, `docs/ACCESSIBILITY_CHECK.md`, `docs/changes/CHANGES_D2_D3.md`
Changed: `src/app/session.tsx` (`updateSettings`; `importFile` returns the profile and avoids duplicate names), `src/adapters/storage/bundle.ts` (checks learner data, fills missing settings), `src/ui/App.tsx` (Settings tab, skip link, main area, focus, applies settings), `src/ui/screens/ProfilePicker.tsx`, `src/ui/screens/Learn.tsx`, `src/ui/screens/Diagnostic.tsx`, `src/ui/screens/practice/PracticeSession.tsx`, `src/ui/screens/practice/SessionSummaryView.tsx` (Listen buttons, rem sizes), `src/ui/styles.css`, `src/seed/personas.ts` (shared default settings), `README.md`, `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`
NOT changed: `types.ts`, `ports.ts`, `config.ts`, `package.json`.

## Honest limits
- Not tested in a real browser or with a real screen reader. The automated tests run in jsdom. `docs/ACCESSIBILITY_CHECK.md` lists what a person must check.
- Read aloud depends on the voices installed on the device. Some browsers use online voices that fail offline. Test it with Wi-Fi off.
- The "AI mode / lite mode" switch is NOT in Settings yet. It belongs to task C5 and needs the model work first.
- A backup file is not encrypted. It holds the learning history, so keep it private.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-D2-D3-changes.zip -DestinationPath . -Force
npm run check
npm run build
npm run check:offline
npm run dev
```
Expected: 125 tests pass, 0 content errors, offline check prints "ok". Then do `docs/ACCESSIBILITY_CHECK.md`.
