# Change note: task A3 (Learn screen uses the chosen style, with "Why this?")

## What a student sees
- The Learn screen shows the lesson in the style NOVA chose for that student, with the style name ("Explained as: Counterexample").
- "Why this?" opens the reason. Example: "counterexample helped you before (2 of 2 follow-up questions correct), so NOVA uses it again."
- "Other styles" buttons let the student read another style. It is marked "(your choice)" and Why this? says what NOVA would have chosen. Looking does NOT change the learner data.
- Home: the "learn new" step now opens Learn (before it opened Practice, which was empty for Variables).

## How the style is chosen
Same rules as the practice feedback (`chooseStyle`): a style that helped before wins; a mistake that keeps coming back in THIS topic tries a new style; otherwise plain. Only styles the topic really has text for can be chosen.

## Files
New:
- `src/core/engine/lesson.ts` (pure: `buildLesson`, `lessonStyles`, `lessonText`)
- `src/core/engine/lesson.test.ts` (6 tests)
- `src/ui/screens/learn.test.tsx` (5 tests)
- `CHANGES_A3.md`

Changed:
- `src/ui/screens/Learn.tsx` (rewritten)
- `src/ui/screens/Home.tsx` (learn-new step opens Learn)
- `src/core/engine/index.ts` (one export line)
- `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md` (A3 done, 57 tests)

NOT changed: `types.ts`, `ports.ts`, `config.ts`, `package.json`.

## Honest limits
- Tested in jsdom only. Not checked in a real browser (D1).
- Only Loop bounds has 2 styles (plain and counterexample), so only that topic shows different styles. Other topics show plain for everyone. Writing more styles per topic is B1.
- No AI is used on this screen: the text is the verified authored text. (An AI rewrite can be added later behind `FallbackAI`.)
- Style stats only change after a practice probe, not after reading a lesson. So reading does not teach NOVA anything yet.

## Commands (PowerShell, in C:\bunny\Hackathons\nova)
```
Expand-Archive -Path .\nova-A3-changes.zip -DestinationPath . -Force
npm run check
npm run dev
```
Try it: Load demo learners, open "Aarav", Learn, Loop bounds (counterexample). Then switch to "Fresh learner", same topic (plain).
