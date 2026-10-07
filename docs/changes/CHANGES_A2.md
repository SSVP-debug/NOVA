# Change note: task A2 (quick diagnostic for a new profile)

## What a student sees
1. A new profile opens Home. The plan says "Start with a quick check". The Start button now opens the check.
2. Intro screen, then 6 to 8 questions. For each one: tap how sure you are, pick an answer, tap Next.
3. No right or wrong marks during the check. Leave saves nothing.
4. Results: correct count, level per topic (Needs work / Building / Solid, in words and percent), mistakes found, and "Your plan changed" (before and after).

## How it chooses questions (all numbers in `CONFIG.diagnostic`)
- First one question in every topic that has questions, prerequisites first, at difficulty 2.
- Then follow-ups: topics answered wrong first. Right answer = next one is harder. Wrong answer = next one is easier and keeps the same mistake among the wrong options.
- Stops early when the last 2 answers in every topic agree and 6 questions are done. Never more than 8. Never the same question twice.

## Files
New:
- `src/core/engine/diagnostic.ts` (pure logic)
- `src/core/engine/diagnostic.test.ts` (12 tests)
- `src/ui/screens/Diagnostic.tsx`
- `src/ui/screens/diagnostic.test.tsx` (4 tests, full check in jsdom)
- `CHANGES_A2.md` (this note)

Changed:
- `src/core/config.ts` (new `diagnostic` block)
- `src/core/engine/index.ts` (one export line)
- `src/app/session.tsx` (new `recordAttempts`: saves many answers in order, once, through `applyAttempt`)
- `src/ui/App.tsx` (new `diagnostic` route)
- `src/ui/screens/Home.tsx` (the diagnostic step opens the check)
- `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md` (A2 marked done, test count 46)

NOT changed: `types.ts`, `ports.ts`, `package.json`, `package-lock.json`.

## Assumptions
- Answers are saved only when the check is finished (all-or-nothing). This needs no change to `types.ts`, and a half-finished check never leaves half-known data. A page refresh in the middle loses the answers.
- The check ignores locks, because a new learner has mastery 0 in "Variables" and everything else is locked.

## Honest limits
- Checked by tests in jsdom and a production build. NOT checked in a real browser (look, focus, offline = D1).
- Only 3 topics have questions (Lists, Loops, Loop bounds), each with 2 questions, so the check is always exactly 6 questions. Adaptive difficulty only shows with more content (B2).
- After a perfect check each topic is only 55% ("Building"). The mastery rule gives +25% of the gap per right answer. Not changed on purpose.
- After a perfect check the plan says "Learn Variables", because Variables has no questions and mastery 0. Fix = write questions for Variables (B2).
- After a check with only wrong answers, the plan can list two "fix mistake" steps for the same topic (existing planner behaviour).
- jsdom: your project uses jsdom@29 for Node 24.14. I did not touch `package.json`, so keep your pin.

## Commands (PowerShell, in C:\bunny\Hackathons\nova)
```
Expand-Archive -Path .\nova-A2-changes.zip -DestinationPath . -Force
npm run check
npm run dev
```
Try it: Switch profile, make a new profile, Home, Start, answer 6 questions.
