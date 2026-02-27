/**
 * LIFE SCORE Database Types - Core Entities
 * Clues Intelligence LTD © 2025
 *
 * Profile, Comparison, Olivia, Gamma, Preferences, Subscription, Usage, Video
 */

// ============================================================================
// TYPE ALIASES
// ============================================================================

export type UserTier = 'free' | 'pro' | 'enterprise';
export type ComparisonWinner = 'city1' | 'city2' | 'tie';
export type MessageRole = 'user' | 'assistant' | 'system';
export type Theme = 'light' | 'dark' | 'auto';
export type DefaultView = 'grid' | 'list' | 'table';
export type GrokVideoType = 'winner_mood' | 'loser_mood' | 'perfect_life';
export type GrokVideoStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type GrokVideoProvider = 'grok' | 'replicate';
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'paused';

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  tier: UserTier;
  preferred_currency: string;
  preferred_units: string;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comparison {
  id: string;
  user_id: string;
  comparison_id: string;
  city1_name: string;
  city1_country: string;
  city1_score: number | null;
  city2_name: string;
  city2_country: string;
  city2_score: number | null;
  winner: ComparisonWinner | null;
  score_difference: number | null;
  comparison_result: Record<string, unknown>;
  nickname: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface OliviaConversation {
  id: string;
  user_id: string;
  comparison_id: string | null;
  openai_thread_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OliviaMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  openai_message_id: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface GammaReport {
  id: string;
  user_id: string;
  comparison_id: string | null;
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url: string | null;
  pptx_url: string | null;
  pdf_storage_path: string | null;
  pptx_storage_path: string | null;
  nickname: string | null;
  city1: string | null;
  city2: string | null;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  favorite_cities: string[];
  theme: Theme;
  default_view: DefaultView;
  olivia_auto_speak: boolean;
  olivia_voice_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  standard_comparisons: number;
  enhanced_comparisons: number;
  olivia_messages: number;
  judge_videos: number;
  gamma_reports: number;
  grok_videos: number;
  cristiano_videos: number;
  created_at: string;
  updated_at: string;
}

export interface GrokVideo {
  id: string;
  user_id: string;
  comparison_id: string;
  city_name: string;
  video_type: GrokVideoType;
  prompt: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  provider: GrokVideoProvider;
  prediction_id: string | null;
  status: GrokVideoStatus;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// INSERT INTERFACES
// ============================================================================

export interface ProfileInsert {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  tier?: UserTier;
  preferred_currency?: string;
  preferred_units?: string;
  email_notifications?: boolean;
}

export interface ComparisonInsert {
  user_id: string;
  comparison_id: string;
  city1_name: string;
  city1_country: string;
  city1_score?: number | null;
  city2_name: string;
  city2_country: string;
  city2_score?: number | null;
  winner?: ComparisonWinner | null;
  score_difference?: number | null;
  comparison_result: Record<string, unknown>;
  nickname?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
}

export interface OliviaConversationInsert {
  user_id: string;
  comparison_id?: string | null;
  openai_thread_id: string;
  title?: string | null;
}

export interface OliviaMessageInsert {
  conversation_id: string;
  role: MessageRole;
  content: string;
  openai_message_id?: string | null;
  audio_url?: string | null;
}

export interface GammaReportInsert {
  user_id: string;
  comparison_id: string | null;
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url?: string | null;
  pptx_url?: string | null;
  pdf_storage_path?: string | null;
  pptx_storage_path?: string | null;
  nickname?: string | null;
  city1?: string | null;  // FIX: Add city names for cross-device sync
  city2?: string | null;  // FIX: Add city names for cross-device sync
}

export interface UserPreferencesInsert {
  user_id: string;
  favorite_cities?: string[];
  theme?: Theme;
  default_view?: DefaultView;
  olivia_auto_speak?: boolean;
  olivia_voice_enabled?: boolean;
}

export interface SubscriptionInsert {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
}

export interface UsageTrackingInsert {
  user_id: string;
  period_start: string;
  period_end: string;
  standard_comparisons?: number;
  enhanced_comparisons?: number;
  olivia_messages?: number;
  judge_videos?: number;
  gamma_reports?: number;
  grok_videos?: number;
  cristiano_videos?: number;
}

export interface GrokVideoInsert {
  user_id: string;
  comparison_id: string;
  city_name: string;
  video_type: GrokVideoType;
  prompt: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number;
  provider?: GrokVideoProvider;
  prediction_id?: string | null;
  status?: GrokVideoStatus;
  error_message?: string | null;
}

// ============================================================================
// UPDATE INTERFACES
// ============================================================================

export interface ProfileUpdate {
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  tier?: UserTier;
  preferred_currency?: string;
  preferred_units?: string;
  email_notifications?: boolean;
}

export interface ComparisonUpdate {
  nickname?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
}

export interface OliviaConversationUpdate {
  title?: string | null;
  is_active?: boolean;
}

export interface UserPreferencesUpdate {
  favorite_cities?: string[];
  theme?: Theme;
  default_view?: DefaultView;
  olivia_auto_speak?: boolean;
  olivia_voice_enabled?: boolean;
}

// ============================================================================
// RELATION TYPES
// ============================================================================

export interface ComparisonWithRelations extends Comparison {
  gamma_reports?: GammaReport[];
  olivia_conversations?: OliviaConversation[];
}

export interface ConversationWithMessages extends OliviaConversation {
  messages: OliviaMessage[];
  comparison?: Comparison;
}

export interface UserDataBundle {
  profile: Profile;
  preferences: UserPreferences;
  comparisons: Comparison[];
  recentConversations: OliviaConversation[];
}
