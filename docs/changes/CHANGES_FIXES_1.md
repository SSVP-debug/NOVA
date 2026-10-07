# Fix patch 1: lock rule, one fix step per topic, repo tidy-up

## What changed for the student
1. **No more false "Locked" topics.** A topic that has no questions (today: Variables) can no longer block other topics, because NOVA cannot measure it. Before, a student who answered Lists and Loops correctly still saw them as Locked. The concept map and the "To unlock" text follow the same rule. Once Variables has questions (B2), the normal rule applies again.
2. **Today's plan never repeats a topic.** Several mistakes in the same topic now become ONE "fix" step. The most repeated mistake leads, and the reason says how many different mistakes there are.

## Files
New:
- `src/core/engine/fixes.test.ts` (7 tests)
- `docs/changes/CHANGES_FIXES_1.md` (this note)
- `docs/changes/CHANGES_A1.md`, `CHANGES_A2.md`, `CHANGES_A3.md`, `CHANGES_A4.md`, `CHANGES_CI.md` (moved here from the project root, contents unchanged)

Changed:
- `src/core/engine/graph.ts` (new `isTestable`, `prerequisiteMet`; `isLocked` uses them)
- `src/core/engine/dna.ts` (the map's "met" uses `prerequisiteMet`)
- `src/core/engine/planner.ts` (one fix step per topic)
- `src/core/engine/dna.test.ts`, `src/ui/screens/dna.test.tsx` (two old tests updated: they expected Lists to be locked for a new learner, which was the bug)
- `README.md` (history and honesty section), `docs/PROJECT_DESIGN_REPORT.md` (lock rule, test count)

NOT changed: `types.ts`, `ports.ts`, `config.ts`, `package.json`.

## Delete these old files from the project root (they moved to docs/changes/)
```
Remove-Item A1_CHANGES.md, CHANGES_A2.md, CHANGES_A3.md, CHANGES_A4.md, CI_CHANGES.md
```

## Not included (still open)
- Perfect check only reaches 55% ("Building"): tuning `gainOnCorrect` and `solidFrom` needs a decision and more questions (B2).
- Home "Start" buttons share the same screen-reader name.
- Commit each task separately from now on.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-fixes-1.zip -DestinationPath . -Force
Remove-Item A1_CHANGES.md, CHANGES_A2.md, CHANGES_A3.md, CHANGES_A4.md, CI_CHANGES.md
npm run check
```
Expected: 75 tests pass, 0 content errors.
