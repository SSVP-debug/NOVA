# Change note: task D5 (demo mode)

## What is new (all hidden unless the page is opened with `?demo=1`)
- **Open Fresh learner / Open Aarav:** one click, creates the demo learner if missing (never duplicates), and starts on Home.
- **Start demo question:** the same fixed question for both learners (`loop-bounds-print`, seed 7). A **Demo helper** line names the answer to pick to show the mistake.
- **Reset demo data:** asks first. Deletes only profiles marked "sample data", recreates both demo learners as at the start, and puts the demo clock back to real time. Real profiles are never touched.
- **Rehearsal timer:** Start, Stop, and it says "Run time 2:41 (under 3:00)" or "(over 3:00: trim the script)". It keeps running when you switch screens.
- **`docs/DEMO_SCRIPT.md`:** minute-by-minute script, who does what, before-you-start checklist, what to do when something breaks, backup recording steps, a rehearsal log and likely judge questions with honest answers.
- The demo tools now show on the profile screen too, and stay in the same place on every screen.

## Bugs found by the tests and fixed
1. Resetting while viewing a demo learner lost the confirmation message, and switching between the profile screen and a learner reset the timer. The demo tools are now kept in one stable place.
2. "Load demo learners" created duplicates if pressed twice. It now adds only what is missing.
3. A different learner could inherit the previous learner's half-finished screen. A new learner now always starts on Home.

## Protection for the demo
`src/seed/demoScript.test.ts` fails if content edits remove the demo question, remove the demo mistake from its answers, or change what Aarav sees (counterexample with the history reason) or what the fresh learner sees (plain explanation). `demo-flow.test.tsx` plays the whole demo through the real screens: both learners, same wrong answer, different teaching, the probe, the fixed mistake, reviews, the reset, and that a real profile survives.

## Files
New: `src/seed/demoScript.ts`, `src/seed/demoScript.test.ts`, `src/ui/screens/demo-flow.test.tsx`, `docs/DEMO_SCRIPT.md`, `docs/changes/CHANGES_D5.md`
Changed: `src/ui/DemoTools.tsx` (rewritten), `src/ui/App.tsx` (stable demo slot, route reset on profile change, scripted question route), `src/ui/styles.css`, `src/ui/screens/Practice.tsx`, `src/ui/screens/practice/PracticeSession.tsx` (optional fixed first question and the helper line), `src/app/session.tsx` (`openDemoProfile`, `resetDemoProfiles`, no duplicate demo learners), `src/seed/personas.ts` (demo names), `README.md`, `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`
NOT changed: `types.ts`, `ports.ts`, `config.ts`, the engine, `package.json`.

## Honest limits
- **I cannot time a human.** The script's times are a plan (2:45 target). Only a rehearsal with the in-app timer shows real time. Do three runs and fill in the log.
- A restored backup of a demo learner keeps its "sample data" mark, so "Reset demo data" would also delete it.
- The "Demo helper" line and tools exist only with `?demo=1`. Show the app without it if you want judges to see the student view.
- Tested in a simulated browser, not on the demo device. Do the full run on the exact device and browser you will present on.
- If the content team renames the demo question or the generators change, `npm run check` will tell you before the demo does.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-D5-changes.zip -DestinationPath . -Force
npm run check
npm run build
npm run check:offline
npm run preview
```
Then open `http://localhost:4173/?demo=1` and rehearse with `docs/DEMO_SCRIPT.md`.
