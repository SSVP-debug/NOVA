/**
 * NOVA domain contracts.
 *
 * THIS FILE IS THE FOUNDATION. Everything (engine, content, storage, AI, UI) is built against
 * these types. Change them rarely, and when you do, bump the relevant schemaVersion and add a
 * migration (see docs/PROJECT_DESIGN_REPORT.md, section "Versioning and migrations").
 *
 * Rules: no imports from outside src/core. No React. No browser APIs. Plain data only.
 */

// ---------- identifiers ----------
export type Id = string;
export type PackId = Id;
export type ConceptId = Id;
export type MisconceptionId = Id;
export type QuestionSpecId = Id;
export type QuestionId = Id; // `${specId}#${seed}`
export type ProfileId = Id;

// ---------- teaching vocabulary ----------
export const EXPLANATION_STYLES = ['plain', 'worked-example', 'analogy', 'counterexample', 'socratic'] as const;
export type ExplanationStyle = (typeof EXPLANATION_STYLES)[number];

export const CONFIDENCE_LEVELS = ['sure', 'unsure', 'guess'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type Difficulty = 1 | 2 | 3;

// ---------- content (authored, read-only at runtime) ----------
export interface ChecklistItem {
  id: Id;
  label: string; // what a good teach-back must contain, in plain words
  keywords: string[]; // any one of these (lowercase) counts as covering the item
}

export interface Concept {
  id: ConceptId;
  title: string;
  summary: string;
  prerequisites: ConceptId[];
  keywords: string[]; // for routing student doubts to this concept
  explanations: Partial<Record<ExplanationStyle, string>>;
  teachBack: ChecklistItem[];
}

export interface MisconceptionDef {
  id: MisconceptionId;
  concept: ConceptId;
  title: string; // short, student-friendly name
  description: string; // what the student wrongly believes
  explanations: Partial<Record<ExplanationStyle, string>>;
}

export interface Option {
  id: Id; // 'o1'..'o4', assigned when a question is materialized
  text: string;
  correct?: boolean;
  misconception?: MisconceptionId; // REQUIRED on every wrong option (see validator)
}
export type OptionDraft = Omit<Option, 'id'>;

export interface FeedbackText {
  plain: string;
  counter?: string; // counterexample built from this question's own values
}

/** Body of a question, before ids are attached. Generators return this. */
export interface QuestionBody {
  prompt: string;
  code?: string;
  options: OptionDraft[];
  hints: string[]; // released one at a time
  feedback?: Record<MisconceptionId, FeedbackText>;
}

export interface StaticQuestionSpec extends QuestionBody {
  kind: 'static';
  id: QuestionSpecId;
  concept: ConceptId;
  difficulty: Difficulty;
}

export interface GeneratedQuestionSpec {
  kind: 'generated';
  id: QuestionSpecId;
  concept: ConceptId;
  difficulty: Difficulty;
  generator: string; // id of a registered QuestionGenerator
  params?: Record<string, unknown>;
}
export type QuestionSpec = StaticQuestionSpec | GeneratedQuestionSpec;

export interface ContentPack {
  schemaVersion: 1;
  id: PackId;
  title: string;
  subject: string;
  version: string;
  description?: string;
  concepts: Concept[];
  misconceptions: MisconceptionDef[];
  questions: QuestionSpec[];
}

// ---------- runtime question ----------
export interface Question extends Omit<QuestionBody, 'options'> {
  id: QuestionId;
  specId: QuestionSpecId;
  concept: ConceptId;
  difficulty: Difficulty;
  seed: number;
  options: Option[];
}

// ---------- profile and settings ----------
export interface Settings {
  aiMode: 'auto' | 'off'; // 'off' = lite mode (templates only)
  textScale: number; // 1 = normal
  highContrast: boolean;
  readAloud: boolean;
}

export interface Profile {
  id: ProfileId;
  name: string;
  color: string;
  createdAt: number;
  seeded?: boolean; // true for demo personas (always say so in the demo)
  settings: Settings;
}

// ---------- learner state (the "twin") ----------
export interface ConceptState {
  mastery: number; // 0..1
  attempts: number;
  correct: number;
  lastSeen?: number;
  reviewStage: number; // index into CONFIG.review.intervalsDays
  nextReviewAt?: number;
}

export type MisconceptionStatus = 'active' | 'improving' | 'resolved';
export interface MisconceptionState {
  seen: number;
  status: MisconceptionStatus;
  firstSeen: number;
  lastSeen: number;
  resolvedAt?: number;
}

export interface StrategyStats {
  shown: number; // times used before a probe
  helped: number; // times the following probe was correct
}

export interface ConfidenceStats {
  n: number;
  wrong: number;
}

export interface PaceStats {
  avgMs: number; // exponential moving average of time per answer
  samples: number;
  avgHints: number;
}

export interface AttemptEvent {
  type: 'attempt';
  at: number;
  questionId: QuestionId;
  specId: QuestionSpecId;
  concept: ConceptId;
  chosenOptionId: Id;
  correct: boolean;
  misconception?: MisconceptionId; // from the chosen wrong option
  confidence: Confidence;
  timeMs: number;
  hintsUsed: number;
  isProbe: boolean;
  probeFor?: MisconceptionId; // the mistake this probe checks
  afterStyle?: ExplanationStyle; // style shown just before this probe (for strategy stats)
}

export interface LearnerState {
  schemaVersion: 1;
  profileId: ProfileId;
  packId: PackId;
  concepts: Record<ConceptId, ConceptState>;
  misconceptions: Record<MisconceptionId, MisconceptionState>;
  strategies: Partial<Record<ExplanationStyle, StrategyStats>>;
  calibration: Record<Confidence, ConfidenceStats>;
  pace: PaceStats;
  history: AttemptEvent[]; // capped (CONFIG.history.cap)
  updatedAt: number;
}

// ---------- engine outputs ----------
export type ConceptStatus = 'locked' | 'new' | 'shaky' | 'solid';

export interface Intervention {
  concept: ConceptId;
  misconception?: MisconceptionId;
  style: ExplanationStyle;
  evidence: string; // what the learner did, in plain words
  reason: string; // why this style was chosen ("Why this?")
  baseText: string; // verified template text. AI may only rephrase it.
}

export type PlanStepKind = 'diagnostic' | 'fix-misconception' | 'review' | 'learn-new';
export interface PlanStep {
  kind: PlanStepKind;
  concept: ConceptId;
  misconception?: MisconceptionId;
  reason: string;
  estMinutes: number;
}
export interface Plan {
  headline: string;
  steps: PlanStep[];
}

export interface ConceptMatch {
  concept: ConceptId;
  score: number;
}

export interface TeachBackResult {
  covered: string[]; // checklist item ids
  missing: string[];
  score: number; // 0..1
  message: string;
}

// ---------- export / import ----------
export interface ExportBundle {
  format: 'nova-export';
  version: 1;
  exportedAt: number;
  profile: Profile;
  learners: LearnerState[];
}
