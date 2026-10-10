# E2: subject (content pack) picker

## What the student sees
Home has a **Subject** box (Programming Basics, Seasons and the Earth). Picking one changes Learn, Teach-back, Ask, Practice, My DNA, the plan and the reviews to that subject. Each subject keeps its own progress. The last subject is remembered for that learner on this device.

## What the code does
- `app/session.tsx`: the subject in use follows the loaded learner (`learner.packId`), so a screen can never get a subject that does not match its learner. New `switchPack(packId)` and `selectProfile(id, packId?)`. The last subject per profile is kept in `localStorage` (`nova.pack.<profileId>`).
- `app/container.ts`: `Services.packs` lists the subjects (all registered packs; only the given pack when a test passes its own `pack`).
- `ui/PackPicker.tsx` (new) is shown at the top of Home and is hidden when there is only one subject.
- `types.ts` and `ports.ts` were NOT changed. Each learner state was already stored per (profile, subject). Backups already contain every subject.
- Demo learners (`?demo=1`) always open on Programming Basics, because the demo script is written for it.
- A new subject = a pack folder + one line in `content/index.ts`. It then appears in the picker with no other change.

## Honest status
- `npm run check` passes (189 tests), build and `check:offline` pass; the saved app is still 466 KB (143 KB gzip).
- Tested in jsdom. Not looked at in a real browser or on a phone.
- The seasons pack is small (the quick check works; depth and content review are still pending). Its content still needs a person to review it.
- Switching subject on Home only. If you open Learn with a topic and then switch subjects, go back to Home first (the picker is only on Home).

## Commands
```
npm run check
npm run build
npm run check:offline
npm run dev
```
