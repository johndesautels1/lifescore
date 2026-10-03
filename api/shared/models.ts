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
  /** OpenAI's seat (Responses API; the engine's card of 2026-10-02, short-context line). */
  gptEvaluator: { vendor: 'openai', id: 'gpt-6.1-sol', name: 'GPT-6.1', inputPerM: 2, outputPerM: 10, cachedInputPerM: 0.1 },
  /** Google's seat. Served ONLY as the -preview id; prices are the under-200k-token line. */
  geminiEvaluator: { vendor: 'google', id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', inputPerM: 2, outputPerM: 12 },
  /** xAI's seat (xAI's own advice 2026-10-02: "Call grok-4.7"; under-200k-token line). */
  grokEvaluator: { vendor: 'xai', id: 'grok-4.7', name: 'Grok 4.7', inputPerM: 2, outputPerM: 6, cachedInputPerM: 0.5 },
  /**
   * Perplexity's seat. Its id is an Agent API PRESET, not a model: Perplexity's own
   * replacement for Sonar Pro after it switched chat/completions off (27 Sep 2026).
   * Prices from Perplexity's pricing page (the low preset runs openai/gpt-5.6-luna),
   * plus $0.0025 per web search, which this per-token row does not include.
   */
  perplexityEvaluator: { vendor: 'perplexity', id: 'low', name: 'Perplexity (Agent API)', inputPerM: 0.2, outputPerM: 1.2 },
} as const satisfies Record<string, AiModel>;

export type AiJob = keyof typeof AI_MODELS;

/** Every model id this app sends to Claude. */
export type ClaudeModelId = Extract<(typeof AI_MODELS)[AiJob], { vendor: 'anthropic' }>['id'];

/**
 * The panel's stable seat keys (stored in saved comparisons, cost rows and the
 * rate limiter, so they never change) and the job each seat does today.
 */
export const PANEL_SEATS = {
  'claude-opus': 'judge',
  'claude-sonnet': 'claudeEvaluator',
  'gpt-4o': 'gptEvaluator',
  'gemini-3-pro': 'geminiEvaluator',
  'grok-4': 'grokEvaluator',
  perplexity: 'perplexityEvaluator',
} as const satisfies Record<string, AiJob>;

export type PanelSeat = keyof typeof PANEL_SEATS;

/** The model a panel seat runs today. */
export function modelForSeat(seat: PanelSeat): AiModel {
  return AI_MODELS[PANEL_SEATS[seat]];
}
