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

**172 tests in 30 files pass**, plus content validation (0 errors and 0 warnings for both packs) and a production build.

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

## 4. Content evidence (Phase B)

| | Programming basics | Seasons and the Earth |
|---|---|---|
| Topics | 6 (variables, lists, loops, loop bounds, functions, recursion) | 3 |
| Named mistakes the pack can find | 59 | 19 |
| Questions (hand-written / made by generators) | 32 (26 / 6) | 12 (12 / 0) |
| Questions per topic | 4 to 6 | 3 to 5 |

- **Every answer that contains code was run in real Python** (`npm run verify:content`): 266 questions (every hand-written one plus 40 examples from each generator), all marked answers match what Python really prints or does. I also broke an answer on purpose and the check caught it.
- **Not yet checked by a person.** The content was drafted with AI help. Science facts (Seasons) and the wording of every explanation need a human review. Read `docs/content-review/*.md`, check each item, and sign it off. Until then say "drafted, review in progress".
- **Breadth, not depth.** Every defined mistake can be found by at least one question, but **48 of the 59 programming mistakes (and 16 of 19 seasons mistakes) are offered by only one question**. NOVA can only find a mistake if that question is asked. More questions per mistake is the next content job.
- **The second pack runs on the same engine** (quick check, plan, targeted question, explanation, doubt routing). Building it exposed one real bug in the doubt matcher (common words such as "why" and "the" in topic titles pulled questions toward the wrong topic). It is fixed and tested. A student can now choose the subject on Home (task E2); each subject keeps its own progress.

## 5. Simulated learners: NOVA against a memoryless tutor

### Simulated learners (500 per policy, seed 2026)

Pack: **programming-basics** v0.2.0. Budget: 40 questions per learner. Assumptions: a learner with a mistake falls into it 90% of the time when a matching wrong option appears, makes a random wrong answer 15% of the time otherwise, and an explanation removes the mistake 80% of the time in the learner's hidden best style and 35% in another style.

#### Experiment A: how fast are hidden mistakes removed?
| | NOVA | Baseline (memoryless) |
|---|---|---|
| Mean questions until the learner has no mistake left (not resolved = 40) | 35.0 (±0.8) | 33.7 (±1.0) |
| Fully resolved within 20 questions | 12.8% (±2.9) | 16.2% (±3.2) |
| Fully resolved within 40 questions | 32.6% (±4.1) | 31.6% (±4.1) |
| Mean wrong answers | 7.8 | 6.5 |
| Explanations given in the learner's best style | 37.2% | 50.8% |

#### Experiment C: an ideal learner (always falls into a mistake when offered, always learns from an explanation, never slips; budget 60 questions)
This removes the learner assumptions, so it shows only what the **content and the engine** can do.
| | NOVA | Baseline (memoryless) |
|---|---|---|
| Share of a learner's mistakes that some asked question offered as a wrong answer | 96.0% | 86.4% |
| Learners fully resolved within 60 questions | 91.2% (±2.5) | 74.6% (±3.8) |
| Learners left with a mistake that a question had already offered but that was not fixed | 1.2% | 0.8% |

#### Experiment B: does the system find the right mistakes? (teaching switched off, 10 questions)
| | NOVA | Baseline |
|---|---|---|
| Precision (flagged mistakes that are real) | 52.5% | 40.0% |
| Recall (real mistakes that were found) | 32.4% | 30.5% |
| F1 | 40.1% | 34.6% |

### Engine speed (Node v22.22.2, Intel(R) Xeon(R) Processor @ 2.10GHz, 1 cores)
| Operation | Mean time |
|---|---|
| applyAttempt (learner with history) | 35.3 µs |
| planToday | 12.2 µs |
| selectQuestion | 43.6 µs |
| generate one question (generator) | 9.1 µs |
| next quick-check question | 20.8 µs |
| createLearner | 0.9 µs |

Learner export (Aarav, 15 answers): 4.5 KB. Simulation run time: 3.2 s.

#### How to read these numbers (honest)
- **What changed since the first version of this table.** Three small engine rules were added to fix the weak diagnosis (recall 6.5%): (1) the quick check prefers the question that can show the most new mistakes, staying within one difficulty level; (2) practice prefers a question not answered before and one that can show a mistake not tested yet; (3) a correct answer lowers a flagged mistake to "improving" only when that question could have shown the mistake (before, any correct answer in the topic did). Tests for each rule are in `src/core/engine/diagnosis-coverage.test.ts`.
- **What the baseline is:** a tutor with no memory. It picks a random question, always gives the plain explanation, never probes, and flags every wrong answer. It is a fair "generic tutor", not a real competitor product.
- **Finding mistakes got much better, with a cost.** Recall rose from 6.5% to 32.4% (baseline 30.5%) and F1 from 12.1% to 40.1% (baseline 34.6%). Precision fell from 83.0% to 52.5% (baseline 40.0%): a wrong answer by slip now stays flagged until a later question that could show it is answered correctly or a probe resolves it. About half of the flags are wrong, so the app should say "possible mistake" and let the probe confirm it.
- **Repeated on 5 random seeds** (2026, 1, 2, 3, 4): F1 was higher than the baseline in all 5 (by 4 to 10 points), precision was higher in all 5 (by 12 to 15 points), recall was higher in 4 and about equal in 1.
- **Why the check still cannot find everything:** 48 of 59 mistakes are offered by only one question, and an 8-question check shows at most about 19 of them. The content decides the ceiling. Adding questions that offer the same mistakes in other ways is the next content job.
- **Ideal learner (Experiment C):** within 60 questions NOVA fully resolves 91.2% (±2.5) against 74.6% (±3.8) for the baseline (before the changes: 78.6%). On the 5 seeds the gap was 17 to 21 points every time. This shows what the content and the engine can do when the learner assumptions are removed.
- **No proof that NOVA fixes mistakes faster under the normal assumptions.** Within 40 questions NOVA 32.6% (±4.1) against 31.6% (±4.1) with seed 2026, but on 4 of the 5 seeds NOVA was 1.6 to 3.2 points **behind**. Treat it as equal. NOVA is also slower at the start (12.8% against 16.2% resolved within 20 questions) and gets more wrong answers (7.8 against 6.5), as expected when it deliberately asks about known mistakes.
- **Style adaptation is not shown:** NOVA gave the learner's best style 37.2% of the time; random choice between two styles gives about 50% (the baseline got 50.8%). The rule needs a mistake to repeat before it trusts history. It works in the unit tests with seeded history (the demo), but this experiment does not prove it, and the number is now lower than before (42.3%).
- **Pack:** these numbers use the 6-topic `programming-basics` pack in the repository. If your copy has more topics, run `npm run evidence` again and paste the new tables.

#### What you can and cannot say
- **Can say:** NOVA names the mistake with evidence, remembers the learner, chooses a teaching style by rule and shows why, schedules reviews, works offline. In simulation it finds the right mistakes better than a generic tutor (F1 40.1% against 34.6%; precision 52.5% against 40.0%; recall 32.4% against 30.5%, repeated on 5 seeds), and with an ideal learner it clears more learners' mistakes within 60 questions (91.2% against 74.6%).
- **Cannot say:** that NOVA fixes mistakes faster than a generic tutor under realistic assumptions, that its flags are mostly right (about half are), or that it adapts to learning style in practice. The simulation does not show these, and no real students have used it.
- **Assumptions are guesses:** how often learners fall into a mistake, how often an explanation fixes it, and that a hidden best style exists. Change them in `src/sim/learnerSim.ts` (`DEFAULT_SIM`).

## 6. Speed and weak-device numbers

The Node numbers above (microseconds per engine call) were measured on a cloud server, **not a weak device**. They show the engine is not the bottleneck: every call takes far less than a millisecond.

**To get real weak-device numbers:** open the app on the weakest device with `?demo=1`, press **Run device check**, then **Copy these numbers** and paste them below. Also use `npm run check:offline` for the saved size (currently **140.3 KB gzipped, 458.2 KB raw**).

| Item | Result |
|---|---|
| Device and browser | ______ |
| Page ready / fully loaded / first content (ms) | ______ |
| JS memory in use (MB, Chrome only) | ______ |
| Storage used by app and profiles (MB) | ______ |
| Engine: save one answer / plan / next question (microseconds) | ______ |
| Time from tapping the link to the first question visible (stopwatch) | ______ s |
| Saved app size (gzip) | 140.3 KB |

Paste the raw copied text here:
```
(paste the device check output)
```

## 7. AI model benchmark (Phase C1 — device run pending)

No model benchmark has been run for this checkout: Ollama is not installed in the development environment, and the demo laptop and weakest device are not available here. Do not present the following as measurements or claim a model is selected.

| Device | Candidate/runtime | Model download size | First model load | First answer | Warm answer (3-sentence rewrite) | Model memory | 10-intervention quality/licence | Result |
|---|---|---:|---:|---:|---:|---:|---|---|
| Demo laptop | Ollama + the model configured by `VITE_OLLAMA_MODEL` (default `gemma3:1b`) | Not measured | Not measured | Not measured | Not measured | Not measured | Not reviewed | Pending team run |
| Weakest device | Same candidate, if it can run Ollama; otherwise reject local model there | Not measured | Not measured | Not measured | Not measured | Not measured | Not reviewed | Pending team run |

Run the same 10 verified `Intervention` texts on each candidate after downloading it, with Wi-Fi disconnected. Record cold first generation separately from warm generations. Use Ollama's model list/process information for download and resident model memory, and the device's process monitor for peak memory; browser JS heap alone is not model memory. Review each output against its verified base text for added or changed facts, readability and the 3-sentence limit. Record the exact model tag and licence source. Compare at most two candidates and choose the smallest model that is acceptably fast and faithful; if either target device is too slow or cannot run it, reject model use there and use lite mode. Run a separate table row for every candidate tested.

The Ollama adapter is implemented, but `gemma3:1b` is only the current default tag, **not a benchmark-backed model choice**. Lite mode and template fallback remain the supported path until the device results are recorded.

## 8. Offline evidence
Automated: build check passes (see section 2). The latest build precaches **458.2 KB raw / 140.3 KB gzip**. **Still to do by a person:** the real-browser and real-device test in `docs/OFFLINE_TEST.md` (screenshot of the empty Network tab and the results table).

## 9. Accessibility evidence
Automated: contrast (AAA), text sizes, focus and Listen button (section 2). **Still to do by a person:** `docs/ACCESSIBILITY_CHECK.md` (keyboard-only run, 200% zoom, read-aloud with Wi-Fi off, optional screen reader).

## 10. Known limits (say these before a judge asks)
- No real students have used NOVA. The simulation is a model of behaviour, not of people.
- The content pack is a small sample. Results will change with real content.
- Style adaptation needs several sessions to show, and is not proven by the simulation.
- NOVA is not faster than a memoryless tutor in the simulation. The quick check finds few mistakes.
- Content was drafted with AI help and is not yet signed off by a person.
- Not yet tested in a real browser or on a weak device (steps are written).
- A local model has not yet been benchmarked or selected on the demo laptop and weakest device; the AI UI works with templates instead.

## 11. How to regenerate
```
npm run evidence        # rewrites docs/evidence-data/simulation.md and simulation.json
npm run verify:content  # runs every code question in real Python (needs Python 3)
npm run content:review  # rewrites the human review sheets in docs/content-review/
npm run check           # tests and content validation
npm run build && npm run check:offline
```
