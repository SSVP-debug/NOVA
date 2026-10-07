/**
 * Ports = the interfaces the core needs from the outside world.
 * Adapters (src/adapters) implement them. The core never imports an adapter.
 * To swap Dexie for SQLite, or one local model for another, implement the port. Nothing else changes.
 */
import type {
  ConceptId,
  ContentPack,
  ExportBundle,
  Intervention,
  LearnerState,
  MisconceptionId,
  PackId,
  Profile,
  ProfileId,
  QuestionBody,
  TeachBackResult,
} from './types';

export interface Clock {
  now(): number;
}

// ---------- storage ----------
export interface StoragePort {
  listProfiles(): Promise<Profile[]>;
  getProfile(id: ProfileId): Promise<Profile | undefined>;
  saveProfile(profile: Profile): Promise<void>;
  deleteProfile(id: ProfileId): Promise<void>; // also deletes that profile's learner states
  loadLearner(profileId: ProfileId, packId: PackId): Promise<LearnerState | undefined>;
  saveLearner(state: LearnerState): Promise<void>;
  exportProfile(id: ProfileId): Promise<ExportBundle>;
  importBundle(bundle: unknown): Promise<Profile>; // validates, assigns a new id, returns the profile
}

// ---------- AI ----------
export interface ExplainRequest {
  intervention: Intervention;
  learnerLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface TeachBackRequest {
  pack: ContentPack;
  concept: ConceptId;
  answer: string;
}

export interface DoubtRequest {
  pack: ContentPack;
  concept: ConceptId;
  question: string;
}

/**
 * AI only voices decisions the engine already made. It must never decide correctness,
 * mastery, misconception labels or strategy. Implementations MUST be safe to fail:
 * the caller wraps them with a template fallback (see adapters/ai/fallbackAI.ts).
 */
export interface AIPort {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  explain(req: ExplainRequest): Promise<string>;
  evaluateTeachBack(req: TeachBackRequest): Promise<TeachBackResult>;
  answerDoubt?(req: DoubtRequest): Promise<string>;
}

/** A raw text-generation runtime (Ollama, WebLLM, Transformers.js ...). Used by LocalModelAI. */
export interface LocalModelRuntime {
  readonly id: string;
  isReady(): Promise<boolean>;
  generate(prompt: string, opts?: { maxTokens?: number; signal?: AbortSignal }): Promise<string>;
}

// ---------- question generators (plugins) ----------
export interface GeneratorInput {
  seed: number;
  focus: MisconceptionId[]; // mistakes the learner currently has; keep them among the wrong options
  params?: Record<string, unknown>;
}

export interface QuestionGenerator {
  readonly id: string;
  readonly concept: ConceptId;
  readonly targets: MisconceptionId[]; // mistakes this generator can test
  generate(input: GeneratorInput): QuestionBody; // must be deterministic for a given input
}

export interface GeneratorRegistry {
  get(id: string): QuestionGenerator | undefined;
  ids(): string[];
}
