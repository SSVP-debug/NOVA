# Change note: task D1 (offline proof), automated part

## What is new
1. **`npm run check:offline`** (run after `npm run build`). Fails if the service worker does not save a file the page needs, if there is no reload-offline fallback, if the manifest is incomplete, if anything loads from the internet, or if the saved app is bigger than 1 MB gzipped. Prints the saved size for your evidence. CI now runs it after the build.
2. **Offline badge** under the NOVA title (and on the profile screen): "Ready to work offline", "Offline mode: working from files saved on this device", "Not saved for offline use yet", or a warning if offline and not saved. Words carry the meaning, not just colour.
3. **Sub-path hosting:** `VITE_BASE=/NOVA/` builds the app for GitHub Pages project sites. The default is the site root.
4. **`docs/OFFLINE_TEST.md`:** the exact real-browser and real-device steps, and an evidence table.

## Files
New: `scripts/check-offline-build.ts`, `src/app/offline.ts`, `src/app/offline.test.ts`, `src/ui/OfflineBadge.tsx`, `src/ui/offline-badge.test.tsx`, `docs/OFFLINE_TEST.md`, `docs/changes/CHANGES_D1.md`
Changed: `package.json` (one new script), `vite.config.ts` (base), `.github/workflows/check.yml` (one new step), `src/main.tsx` (tells the badge when the app is saved), `src/ui/App.tsx` (shows the badge), `README.md`, `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`
NOT changed: `types.ts`, `ports.ts`, `config.ts`, no new dependencies.

## Honest limits
- **The real-browser test has not been run.** I have no browser in my environment. The automated check proves the build is set up correctly, not that your browser behaves. You must do `docs/OFFLINE_TEST.md` Part 2 and Part 3.
- The badge turns to "Ready" when the service worker reports the app is saved (or a service worker already controls the page). In `npm run dev` there is no service worker, so it correctly says "Not saved for offline use yet".
- I checked the checker by breaking the build on purpose (a font from the internet, a missing saved file, no service worker). It failed each time.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-D1-changes.zip -DestinationPath . -Force
npm run check
npm run build
npm run check:offline
npm run preview
```
Expected: 90 tests pass, 0 content errors, the offline check prints "ok" lines. Then follow `docs/OFFLINE_TEST.md`.
