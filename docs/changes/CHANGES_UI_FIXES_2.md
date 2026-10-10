# UI fixes 2 (findings from testing the live app)

1. **High contrast on the account page.** The switch now sits beside the NOVA logo (account page and every screen). It is remembered on the device (`nova.contrast`) and also saved in the profile. The old checkbox in Settings was removed.
2. **Home page in two parts.** Left: unchanged (subject picker, Today's plan, Review). Right: "What NOVA has learned about you", then "Your next step" (Learn, Practise, Teach back for the next topic of the chosen subject). The learned card moved from My DNA to Home.
3. **Listen button.** Now has a speaker icon, a short line that says what it does ("Reads the question out loud."), and turns into Stop while speaking.
4. **Wrong answer in Practice.** Two clear choices: **Show the right solution** (right answer + explanation from the pack) or **Skip to next question**. After the solution, **Next question** continues and checks the same idea again (the old "probe"). No more "Take the probe / Skip the probe".
5. **My DNA cleanup.** All tick marks and symbols removed (words and star shapes remain). A topic never answered shows "Not started" instead of a fake 0% or 20%. Percentages are rounded down, so 74.6% no longer shows as "75%" on a Shaky topic.

New files: `src/app/contrast.ts`, `src/ui/ContrastToggle.tsx`, `src/ui/LearnedCard.tsx`, `src/ui/NextStepCard.tsx`, `src/core/engine/solution.ts` (+ test).
`npm run check`: typecheck, 207 tests and content validation pass.
