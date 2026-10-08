# Evidence pack (task D4)

Date of these numbers: 7 October 2026. Everything here was measured on the **sample content pack** (`programming-basics` v0.1.0, 3 of 6 topics have questions). When the real content lands, re-run the numbers.

**Rule for the pitch: say "prototype", and only claim what is in this file.**

## 1. What this evidence shows, and what it does not

| It shows | It does not show |
|---|---|
| The system behaves as designed: it finds mistakes, changes what it teaches, schedules reviews, works offline, and restores backups | That real students learn more. No real student has used NOVA yet |
| How NOVA behaves against a memoryless tutor **under stated assumptions** about simulated learners | That the assumptions are true. They are guesses (section 4) |
| Engine speed in Node on one computer | Speed on a weak phone. That needs the in-app device check (section 5) |

## 2. Automated tests (run `npm run check`)

**146 tests in 27 files pass**, plus content validation (0 errors, 5 warnings for topics that have no questions yet) and a production build.

| Area | What the tests prove |
|---|---|
| Engine rules | Mastery goes up and down as designed, "sure but wrong" costs more; mistakes become active, improving, resolved, and relapse; the plan puts mistakes first, then reviews, then new topics, one fix step per topic; strategy rules, calibration, doubt matching |
| Question generators | 500 random questions per template: 4 options, exactly 1 correct, no duplicates, every wrong option tagged with a mistake and feedback; same seed gives the same question |
| Content checks | A bad pack (an untagged wrong option) is rejected |
| Personalization | `adapters.test.ts`: a fresh learner and the seeded learner "Aarav" get **different** teaching styles for the same situation, and the plan changes with history |
| Adaptation | `engine.test.ts`: the chosen style changes when strategy history changes, and the reason is shown |
| Retention | `review-schedule.test.ts`: reviews become due as time passes (fake clock); `home-review.test.tsx`: the demo time buttons make a review appear |
| Storage and backup | `backup.test.ts`, `settings.test.tsx`: export then import restores learning history, mistakes, strategy stats and settings under a new id; damaged and foreign files are rejected without changing anything |
| Offline | `npm run check:offline` (CI): every file the page needs is saved by the service worker, no internet addresses in the build, size limit |
| Accessibility | `theme.test.ts`: the high-contrast palette meets WCAG AAA (7:1 text, 3:1 borders); `settings.test.tsx`: text size, skip link, focus movement, Listen button |
| Screens | Practice session, quick check, Learn, DNA map, Settings, Home review list, device check, all played in a simulated browser |
| Demo path | `demo-flow.test.tsx` plays the whole 3-minute demo through the real screens (both learners, same wrong answer, different teaching, probe, fixed mistake, reviews, safe reset); `demoScript.test.ts` fails if content edits would break the demo |

## 3. Personalization in one sentence you can say live
"Same wrong answer, two learners: the new learner gets a plain explanation; the learner with history gets the counterexample that worked for them before, and **Why this?** shows the rule." (Demo with the seeded learners, labeled sample data.)

## 4. Simulated learners: NOVA against a memoryless tutor

### Simulated learners (500 per policy, seed 2026)

Pack: **programming-basics** v0.1.0. Budget: 40 questions per learner. Assumptions: a learner with a mistake falls into it 90% of the time when a matching wrong option appears, makes a random wrong answer 15% of the time otherwise, and an explanation removes the mistake 80% of the time in the learner's hidden best style and 35% in another style.

#### Experiment A: how fast are hidden mistakes removed?
| | NOVA | Baseline (memoryless) |
|---|---|---|
| Mean questions until the learner has no mistake left (not resolved = 40) | 15.4 (±0.7) | 15.3 (±1.1) |
| Fully resolved within 20 questions | 79.6% (±3.5) | 71.4% (±4.0) |
| Fully resolved within 40 questions | 98.6% (±1.0) | 90.4% (±2.6) |
| Mean wrong answers | 7.4 | 5.5 |
| Explanations given in the learner's best style | 42.5% | 34.2% |

#### Experiment B: does the system find the right mistakes? (teaching switched off, 10 questions)
| | NOVA | Baseline |
|---|---|---|
| Precision (flagged mistakes that are real) | 89.7% | 70.6% |
| Recall (real mistakes that were found) | 55.4% | 80.8% |
| F1 | 68.5% | 75.4% |

### Engine speed (Node v22.22.2, Intel(R) Xeon(R) Processor @ 2.80GHz, 1 cores)
| Operation | Mean time |
|---|---|
| applyAttempt (learner with history) | 51.6 µs |
| planToday | 15.4 µs |
| selectQuestion | 31.5 µs |
| generate one question (generator) | 6.9 µs |
| next quick-check question | 9.2 µs |
| createLearner | 1.2 µs |

Learner export (Aarav, 15 answers): 4.5 KB. Simulation run time: 1.2 s.

#### How to read these numbers (honest)
- **What the baseline is:** a tutor with no memory. It picks a random question, always gives the plain explanation, never probes. It is a fair "generic tutor", not a real competitor product.
- **Completion:** within 40 questions NOVA resolved **98.6%** of simulated learners and the baseline **90.4%** (the ± ranges do not overlap). Within 20 questions: 79.6% against 71.4% (the ranges nearly touch).
- **Speed on average: no difference.** About 15.4 against 15.3 questions. NOVA does not make the average learner faster here. A likely reason is that the first questions are a quick check with no teaching, but I did not test that. NOVA also gets more wrong answers (7.4 against 5.5), as expected when it deliberately asks about known mistakes; that was not tested either.
- **Style adaptation is NOT shown by this experiment.** NOVA gave the learner's best style 42.5% of the time. Picking one of two styles at random would give about 50%. The rule needs a mistake to repeat or a style to be used twice before it trusts history, and these short runs rarely get there. The mechanism is proven in unit tests with seeded history, but the pitch should say it improves "over several sessions", not claim it from this table.
- **Diagnosis (10 questions, teaching off):** NOVA's flags are more reliable (precision 89.7% against 70.6%) but it finds fewer real mistakes (recall 55.4% against 80.8%). Overall F1 is lower (68.5% against 75.4%). So in a very short test the baseline finds more mistakes, with more false alarms.
- **Why recall is low (tested, not shipped):** NOVA turns an active mistake into "improving" after any later correct answer in the same topic, even if that question never offered the wrong option the learner falls for. In a throwaway experiment with that rule removed, NOVA's recall rose to **90.8%** and F1 to **84.8%**, but mistakes were removed more slowly (mean 18.0 questions, only 85.8% resolved within 40, which is below the baseline's 90.4%). So the current rule is a **trade-off**, not a bug.
- **Recommended next step (not done):** let a correct answer lower the mistake only if the question actually offered that mistake's wrong option. That needs `AttemptEvent` to record which mistakes a question offered, which changes `types.ts`, so it needs the lead's decision. The simulation can then be re-run to check the effect (`npm run evidence`).
- **Assumptions are guesses:** how often learners fall into a mistake, how often an explanation fixes it, and that a hidden "best style" exists. Change them in `src/sim/learnerSim.ts` (`DEFAULT_SIM`) and the table updates.

## 5. Speed and weak-device numbers

The Node numbers above (microseconds per engine call) were measured on a cloud server, **not a weak device**. They show the engine is not the bottleneck: every call takes far less than a millisecond.

**To get real weak-device numbers:** open the app on the weakest device with `?demo=1`, press **Run device check**, then **Copy these numbers** and paste them below. Also use `npm run check:offline` for the saved size (currently **122.9 KB gzipped, 390.4 KB raw**).

| Item | Result |
|---|---|
| Device and browser | ______ |
| Page ready / fully loaded / first content (ms) | ______ |
| JS memory in use (MB, Chrome only) | ______ |
| Storage used by app and profiles (MB) | ______ |
| Engine: save one answer / plan / next question (microseconds) | ______ |
| Time from tapping the link to the first question visible (stopwatch) | ______ s |
| Saved app size (gzip) | 122.9 KB |

Paste the raw copied text here:
```
(paste the device check output)
```

## 6. Offline evidence
Automated: build check passes (see section 2). **Still to do by a person:** the real-browser and real-device test in `docs/OFFLINE_TEST.md` (screenshot of the empty Network tab and the results table).

## 7. Accessibility evidence
Automated: contrast (AAA), text sizes, focus and Listen button (section 2). **Still to do by a person:** `docs/ACCESSIBILITY_CHECK.md` (keyboard-only run, 200% zoom, read-aloud with Wi-Fi off, optional screen reader).

## 8. Known limits (say these before a judge asks)
- No real students have used NOVA. The simulation is a model of behaviour, not of people.
- The content pack is a small sample. Results will change with real content.
- Style adaptation needs several sessions to show.
- Short diagnosis finds fewer mistakes than a random quiz that flags every wrong answer.
- Not yet tested in a real browser or on a weak device (steps are written).

## 9. How to regenerate
```
npm run evidence        # rewrites docs/evidence-data/simulation.md and simulation.json
npm run check           # tests and content validation
npm run build && npm run check:offline
```
