/** All tunable numbers live here. Change behaviour here, not inside the engine code. */
export const CONFIG = {
  mastery: {
    initial: 0.2,
    gainOnCorrect: 0.25, // fraction of the remaining gap closed on a correct answer
    guessWeight: 0.5, // a correct "guess" counts half
    lossOnWrong: 0.15,
    lossOnSureWrong: 0.22, // being sure and wrong costs more
    lockBelow: 0.35, // a prerequisite below this locks dependants
    shakyFrom: 0.3,
    solidFrom: 0.75,
  },
  review: { intervalsDays: [1, 3, 7, 14, 30] },
  strategy: { minShownToTrust: 2, minHelpRate: 0.5 },
  planner: { maxSteps: 3, minutes: { fix: 5, review: 3, learn: 8, diagnostic: 5 } },
  selector: { recentWindow: 5 },
  session: { length: 5 }, // questions per practice session
  // Quick diagnostic for a new profile (backlog A2).
  diagnostic: {
    minQuestions: 6, // keep asking until at least this many (if the pack has enough questions)
    maxQuestions: 8, // never ask more than this
    startDifficulty: 2, // first question in each concept; then 1 harder after a right answer, 1 easier after a wrong one
    settleAfter: 2, // a concept is "settled" when its last this-many answers agree (all right or all wrong)
  },
  history: { cap: 200 },
  pace: { emaWeight: 0.3 },
  ai: {
    timeoutMs: 4000,
    liteModeMaxCores: 2,
    liteModeMaxMemoryGB: 2,
    // Optional model that runs inside the browser (Transformers.js in a Web Worker). Unmeasured: see docs/EVIDENCE.md.
    browserModelTimeoutMs: 15000, // CPU generation is slower than a laptop server; templates are shown first anyway
    browserModelId: 'onnx-community/SmolLM2-360M-Instruct',
    browserModelDtype: 'q4',
  },
} as const;
