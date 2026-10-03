/**
 * LIFE SCORE - AI model registry: the ONE place a model id is written.
 *
 * Every server call and every screen label reads its model from here. Before
 * 2026-10-03 the ids were typed into ten files; the July refresh missed some and
 * the cost table priced models at numbers that were never true. A test fails if a
 * dated model id appears in any other file (tests/aiModels.test.ts).
 *
 * Re-verified 2026-10-03 against the questionnaire engine's live seats
 * (D:\clues-questionnaire-engine, src/core/e2/live/*Seat.ts and pricing.ts) and
 * Anthropic's model table. Prices are USD per 1M tokens, the vendor's published
 * standard rate (cache reads where the vendor publishes one).
 *
 * This file is a LEAF (no imports) so the Vite app and the Vercel functions can
 * both import it.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

export type AiVendor = 'anthropic' | 'openai' | 'google' | 'xai' | 'perplexity';

export interface AiModel {
  vendor: AiVendor;
  /** The exact id sent to the vendor's API. */
  id: string;
  /** What the screens call it. */
  name: string;
  inputPerM: number;
  outputPerM: number;
  cachedInputPerM?: number;
}

/** Jobs, not vendors: change a job's model here and every caller follows. */
export const AI_MODELS = {
  /** Final verdict on enhanced comparisons and the written judge report. */
  judge: { vendor: 'anthropic', id: 'claude-opus-5-5', name: 'Claude Opus 5.5', inputPerM: 4, outputPerM: 20, cachedInputPerM: 0.2 },
  /** Claude's seat on the evaluator panel (and the one model of a standard comparison). */
  claudeEvaluator: { vendor: 'anthropic', id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', inputPerM: 2, outputPerM: 10, cachedInputPerM: 0.2 },
  /** Olivia, Emilia, storyboards, screenplays and the gun-law comparison. */
  writer: { vendor: 'anthropic', id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', inputPerM: 2, outputPerM: 10, cachedInputPerM: 0.2 },
} as const satisfies Record<string, AiModel>;

export type AiJob = keyof typeof AI_MODELS;

/** Every model id this app sends to Claude. */
export type ClaudeModelId = Extract<(typeof AI_MODELS)[AiJob], { vendor: 'anthropic' }>['id'];
