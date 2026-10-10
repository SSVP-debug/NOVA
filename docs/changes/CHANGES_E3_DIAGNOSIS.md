# E3: better diagnosis (recall was 6.5%)

## Why it was low
The quick check asked about 8 of 32 questions, and 48 of 59 mistakes are offered by only one question. On top of that, any correct answer in a topic lowered a flagged mistake to "improving", even when that question could never have shown the mistake. Almost every mistake the check did find was erased again.

## Three small rules (no change to `types.ts` or `ports.ts`)
1. **Quick check** (`engine/diagnostic.ts`): among questions within one difficulty level of the target, ask the one that offers the most mistakes not yet shown in this check. New helper `offeredBy(spec, generators)`.
2. **Practice** (`engine/selector.ts`): a question answered before gets a penalty, and a question that can show a mistake not yet tested gets a small bonus. Numbers are in `CONFIG.selector` (`answeredPenalty: 3`, `freshBonus: 0.5`).
3. **"Improving"** (`engine/misconceptions.ts`): a flagged mistake becomes "improving" only after a correct answer to a hand-written question that offered that mistake. Generated questions do not lower it (the engine cannot see their wrong options without the generator registry). A correct probe still resolves it.

## Results (simulation, 500 learners per run, seed 2026; details in docs/EVIDENCE.md)
| | Before | After | Baseline (memoryless) |
|---|---|---|---|
| Recall | 6.5% | 32.4% | 30.5% |
| Precision | 83.0% | 52.5% | 40.0% |
| F1 | 12.1% | 40.1% | 34.6% |
| Ideal learner resolved within 60 questions | 78.6% | 91.2% | 74.6% |
| Resolved within 40 questions (normal assumptions) | 31.2% | 32.6% | 31.6% |

Which rule does what (separate runs): rule 3 gives most of the recall gain; rule 2 gives most of the ideal-learner gain; rule 1 adds about 6 points of recall at a cost of about 6 points of precision. On 5 seeds F1 and precision beat the baseline every time. Speed of fixing under normal assumptions is **not** better than the baseline (1.6 to 3.2 points behind on 4 of 5 seeds).

## Honest limits
- Precision dropped: about half of the flagged mistakes are wrong in simulation. The probe is what confirms or clears a flag. Consider wording the screens as "possible mistake".
- The learner model is an assumption. No real students were used.
- Content is still the ceiling: more questions that offer the same mistakes in different ways is the next job.
- Style adaptation is still not shown (37.2% best-style, chance is about 50%).

## Tests
`src/core/engine/diagnosis-coverage.test.ts` (7 tests). Each rule's test fails when I put the old behaviour back. `npm run check` passes (196 tests).

## Commands
```
npm run check
npm run evidence
npm run build
npm run check:offline
```
