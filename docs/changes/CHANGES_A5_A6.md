# Change note: tasks A5 (review list on Home) and A6 (clock + demo time control)

## What a student sees
- **Home, new "Review" card:** topics that are due ("Lists, due 4 days ago", with a Review button), or "Nothing due for review. Next review: Lists, due in 3 days." Hidden if the student has not answered anything yet. Due topics also appear as a step in Today's plan (that already worked).

## What you use in the demo (hidden from students)
- Open the app with **`?demo=1`**, for example `http://localhost:5173/?demo=1`.
- A bar shows **+1 day**, **+7 days**, **Reset time** and says how far the clock is moved. Practise a topic, click **+7 days**, and Home shows it as due. It moves only the app clock; saved data is not changed.
- Say in the pitch that the clock was moved. It is a demo tool, not real waiting time.
- A page refresh resets the clock shift (it is not saved).

## Files
New:
- `src/app/clock.ts` (adjustable clock), `src/app/clock.test.ts`
- `src/app/clock-guard.test.ts` (fails if `Date.now()` or `new Date()` is used outside the allowed places)
- `src/ui/DemoTools.tsx`
- `src/core/engine/review-schedule.test.ts`, `src/ui/screens/home-review.test.tsx`
- `docs/changes/CHANGES_A5_A6.md`

Changed:
- `src/core/engine/review.ts` (new `reviewSchedule`, `describeDue`; nothing removed)
- `src/app/container.ts` (the default clock is the adjustable clock; new optional `demoClock`)
- `src/app/session.tsx` (new `canShiftTime`, `timeShiftDays`, `advanceDays`, `resetTime`)
- `src/ui/App.tsx` (shows the demo tools), `src/ui/screens/Home.tsx` (Review card)
- `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`, `README.md`

NOT changed: `types.ts`, `ports.ts`, `config.ts`, `package.json`.

## Honest limits
- Tested in jsdom only; the look of the Review card and the demo bar is not checked in a real browser (D1).
- A6 found no `Date.now()` left in the UI (it was already clean). The new guard test keeps it that way. Storage adapters still stamp export files with the real time; that is metadata, not learning time.
- Moving time forward and then practising saves answers with shifted timestamps. Use demo profiles for this.
- After you reset time, topics practised while time was shifted can show a review date in the future. That is expected.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-A5-A6-changes.zip -DestinationPath . -Force
npm run check
npm run dev
```
Expected: 85 tests pass, 0 content errors. Try: open `/?demo=1`, load demo learners, open Aarav, look at Review, click +7 days.
