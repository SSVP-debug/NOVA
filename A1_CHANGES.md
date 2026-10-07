# A1 patch: Practice session with progress and summary

Unzip this over the project root (it keeps the same paths), then run:

    npm install      # adds two dev dependencies for the UI test: jsdom, @testing-library/react
    npm run check

## New files
- src/core/engine/session.ts                         pure `summarizeSession()` (score, mistakes, fixed, mastery before/after, next step)
- src/core/engine/session.test.ts                    3 tests for the summary logic
- src/ui/screens/practice/PracticeSession.tsx        5-question session, progress bar, Leave/End session
- src/ui/screens/practice/SessionSummaryView.tsx     summary screen
- src/ui/screens/practice.test.tsx                   2 jsdom UI tests (full session, leave/end/restart)

## Modified files
- src/core/config.ts            added `session: { length: 5 }`
- src/core/engine/index.ts      exports `./session`
- src/ui/screens/Practice.tsx   now a thin wrapper that can restart a session (replaces the old single-question screen)
- src/ui/App.tsx                passes `go` to Practice
- vite.config.ts                test include pattern now `src/**/*.test.{ts,tsx}`
- package.json, package-lock.json   new devDependencies: jsdom, @testing-library/react
- docs/BACKLOG.md               A1 marked done
- docs/PROJECT_DESIGN_REPORT.md status section updated

No changes to src/core/types.ts or src/core/ports.ts.
Expected result: 30 tests pass, content validation has 0 errors, build succeeds.
