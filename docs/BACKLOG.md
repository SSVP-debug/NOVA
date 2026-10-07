# Backlog (ordered). Each task is independent unless it lists a dependency.

Definition of done for every task: `npm run check` passes, tests added, works offline, no rule in AGENTS.md broken.

## Phase A: Complete the core loop (needed for the 70% prototype)
| ID | Task | Acceptance |
|---|---|---|
| A1 | **DONE.** Practice screen polish: concept and progress shown, 5-question session (`CONFIG.session.length`), session summary with correct count, mistakes found, fixed mistakes, mastery before/after, and a next step | Verified by `session.test.ts` (logic) and `practice.test.tsx` (full session in jsdom) |
| A2 | **DONE.** Quick diagnostic for a new profile: `diagnostic.ts` (pure, rules in `CONFIG.diagnostic`) and the `Diagnostic` screen; 6 to 8 adaptive questions, answers saved together at the end, results show levels, mistakes and the changed plan | Verified by `diagnostic.test.ts` (engine) and `diagnostic.test.tsx` (full check in jsdom). Needs real-browser check (D1) |
| A3 | **DONE.** Learn screen uses the style chosen by `chooseStyle` (via `buildLesson`), with "Why this?" and a way to look at other styles | Verified by `lesson.test.ts` and `learn.test.tsx`: Fresh sees plain, Aarav sees counterexample on Loop bounds. Needs real-browser check (D1) |
| A4 | **DONE.** DNA screen: concept map (SVG, no library) with prerequisite arrows, status shown by glyph + word + border style + percent, locked topics say what unlocks them, mistake timeline per misconception | Verified by `dna.test.ts` and `dna.test.tsx`. Needs real-browser check (D1) |
| A5 | **DONE.** Home shows today's plan with reasons plus a **Review** list from `reviewSchedule` (due topics with "Review" buttons, or the next review time). Wording: "due today", "due 2 days ago", "due tomorrow", "due in 5 days" | Verified by `review-schedule.test.ts` (fake time) and `home-review.test.tsx` |
| A6 | **DONE.** All app time comes from the injected `Clock` (a test, `clock-guard.test.ts`, fails if `Date.now()` or `new Date()` appears outside `src/app/clock.ts`, `src/core/util/id.ts` and `src/adapters/`). Hidden demo tools: open the app with `?demo=1` to get "+1 day", "+7 days" and "Reset time" | Verified by `clock.test.ts` and `home-review.test.tsx` |

## Phase B: Content
| ID | Task | Acceptance |
|---|---|---|
| B1 | Author 6 concepts fully: explanations in 2+ styles, teach-back checklist, keywords | Validator has no warnings for those concepts |
| B2 | 4 to 6 questions per concept with misconception-tagged distractors | Every wrong option tagged; reviewed by a human |
| B3 | 4 more generator templates (e.g. accumulator init, loop condition, index vs value in lists, base case) | Each passes the generator test pattern (500 seeds) |
| B4 | Second small pack (about 10 questions, non-programming) to prove generality | Loads via the same code with zero engine changes |

## Phase C: AI layer
| ID | Task | Acceptance |
|---|---|---|
| C1 | Benchmark 1 to 2 small models on the demo laptop and weakest device (load time, answer time, memory) | Table in docs/EVIDENCE.md; choose or reject |
| C2 | Implement the chosen `LocalModelRuntime` (Transformers.js, WebLLM, or Ollama) | `explain()` returns model text; falls back on failure/timeout |
| C3 | Teach-back screen using `evaluateTeachBack` | Checklist coverage shown; model message optional |
| C4 | Ask box: route with `matchConcepts`, answer from lesson text, offer questions (no-AI path must work) | "I don't get loops" opens Loops with a short quiz; unknown topics get a polite miss |
| C5 | Lite mode toggle (`aiMode: 'off'`) and auto-detect on slow devices | App fully works with the model off |

## Phase D: Offline, accessibility, evidence
| ID | Task | Acceptance |
|---|---|---|
| D1 | **PARTLY DONE.** Done and tested: `npm run check:offline` (CI), live "Ready to work offline" badge, sub-path hosting support (`VITE_BASE`), step-by-step guide `docs/OFFLINE_TEST.md`. **Still needs a person:** run the real-browser and real-device test and save the screenshot and numbers | Table in `docs/OFFLINE_TEST.md` filled in, screenshot of the empty Network tab |
| D2 | Accessibility: text size control, high contrast, read-aloud (browser speech), focus order, labels | Keyboard-only run through the loop |
| D3 | Export/import UI in Settings with clear messages | Round trip restores state |
| D4 | Evidence pack: engine tests, simulated-learner script, weak-device numbers | `docs/EVIDENCE.md` with real numbers |
| D5 | Demo mode: seeded personas, reset button, backup recording | Demo script runs end to end in under 3 minutes |

## Phase E: Stretch (only if A to D are done)
Bandit strategy selector, BKT mastery, bring-your-own-notes, Pyodide code questions, voice input.
