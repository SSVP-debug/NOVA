# Instructions for AI coding tools working on NOVA

Read `docs/PROJECT_DESIGN_REPORT.md` first. These rules are strict because the foundation must not be reworked.

## Hard rules
1. **Do not change `src/core/types.ts` or `src/core/ports.ts` without being asked.** If a change is truly needed, propose it first, bump the schema version, and add a migration.
2. **`src/core` must stay pure.** No React, no browser APIs, no imports from `adapters`, `ui`, `app`, `content`, `generators`, or `seed`.
3. **All learner-state changes go through `applyAttempt`.** Never mutate `LearnerState` anywhere else.
4. **AI never decides facts.** Correctness, mastery, misconception labels, strategy choice and the plan come from code. AI only rephrases verified text, and every AI call must be wrapped by `FallbackAI`.
5. **No network calls in the core learning loop.** No analytics, fonts from a CDN, or remote APIs. Local model runtimes are the only exception, and only on the same device.
6. **Tunable numbers go in `src/core/config.ts`.** No magic numbers in the engine.
7. **Every wrong answer option must carry a `misconception` id** that exists in the pack, with `feedback.plain`. `npm run validate:content` enforces this.
8. **Add or update tests with every engine, generator, or adapter change.** `npm run check` must pass before you finish.
9. **Keep it light.** Low-resource devices matter: no heavy UI libraries, no large assets, no animations that need a GPU.
10. **Accessibility is a requirement,** not polish: keyboard operable, visible focus, labels on inputs, color is never the only signal.

## Commands
`npm run check` (typecheck + tests + content validation), `npm run dev`, `npm run build`.

## How to work
- Work on one backlog task at a time (`docs/BACKLOG.md`). Keep changes small. Do not refactor unrelated code.
- If something in the design report is ambiguous, ask or note the assumption in the PR description. Do not silently change the architecture.
- Content is authored by humans and reviewed. Do not invent facts in packs. Mark any AI-drafted content with `"draft": true` in your notes and ask for review.
