/**
 * LIFE SCORE Database Types - API Cost Tracking
 * Clues Intelligence LTD © 2025
 */

// ============================================================================
// API COST TRACKING
// ============================================================================

export interface ApiCostRecord {
  id: string;
  user_id: string;
  comparison_id: string;
  city1_name: string;
  city2_name: string;
  mode: 'simple' | 'enhanced';

  // Cost breakdowns (stored as JSONB in Supabase)
  tavily_total: number;
  claude_sonnet_total: number;
  gpt4o_total: number;
  gemini_total: number;
  grok_total: number;
  perplexity_total: number;
  opus_judge_total: number;
  gamma_total: number;
  olivia_total: number;
  tts_total: number;
  avatar_total: number;
  kling_total: number;
  grand_total: number;

  // Full breakdown JSON for detailed view
  cost_breakdown: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface ApiCostRecordInsert {
  user_id: string;
  comparison_id: string;
  city1_name: string;
  city2_name: string;
  mode: 'simple' | 'enhanced';
  tavily_total: number;
  claude_sonnet_total: number;
  gpt4o_total: number;
  gemini_total: number;
  grok_total: number;
  perplexity_total: number;
  opus_judge_total: number;
  gamma_total: number;
  olivia_total: number;
  tts_total: number;
  avatar_total: number;
  kling_total: number;
  grand_total: number;
  cost_breakdown: Record<string, unknown>;
}

export interface ApiCostSummary {
  total_records: number;
  grand_total: number;
  by_provider: {
    tavily: number;
    claude_sonnet: number;
    gpt4o: number;
    gemini: number;
    grok: number;
    perplexity: number;
    opus_judge: number;
    gamma: number;
    olivia: number;
    tts: number;
    avatar: number;
  };
}
