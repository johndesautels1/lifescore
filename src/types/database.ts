/**
 * LIFE SCORE Database Types
 * Auto-generated types for Supabase tables
 */

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
  comparison_id: string;
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url: string | null;
  pptx_url: string | null;
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
  comparison_id: string;
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url?: string | null;
  pptx_url?: string | null;
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
// REPORTS STORAGE (Session 16 - Database Architecture Upgrade)
// ============================================================================

export type ReportType = 'standard' | 'enhanced';
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type ReportAccessType = 'view' | 'download' | 'share' | 'embed';

export interface Report {
  id: string;
  user_id: string;
  report_type: ReportType;
  version: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id: string | null;
  gamma_url: string | null;
  pdf_url: string | null;
  html_storage_path: string | null;
  status: ReportStatus;
  generation_started_at: string;
  generation_completed_at: string | null;
  generation_duration_seconds: number | null;
  page_count: number | null;
  total_metrics: number;
  llm_consensus_confidence: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ReportInsert {
  user_id: string;
  report_type?: ReportType;
  version?: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id?: string | null;
  gamma_url?: string | null;
  pdf_url?: string | null;
  html_storage_path?: string | null;
  status?: ReportStatus;
  generation_duration_seconds?: number | null;
  page_count?: number | null;
  llm_consensus_confidence?: number | null;
}

export interface ReportUpdate {
  report_type?: ReportType;
  version?: string;
  gamma_doc_id?: string | null;
  gamma_url?: string | null;
  pdf_url?: string | null;
  html_storage_path?: string | null;
  status?: ReportStatus;
  generation_completed_at?: string | null;
  generation_duration_seconds?: number | null;
  page_count?: number | null;
  llm_consensus_confidence?: number | null;
}

export interface ReportAccessLog {
  id: string;
  report_id: string;
  user_id: string | null;
  accessed_at: string;
  access_type: ReportAccessType;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  share_token: string | null;
}

export interface ReportAccessLogInsert {
  report_id: string;
  user_id?: string | null;
  access_type: ReportAccessType;
  ip_address?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  share_token?: string | null;
}

export interface ReportShare {
  id: string;
  report_id: string;
  shared_by: string;
  share_token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  requires_email: boolean;
  allowed_emails: string[] | null;
  password_hash: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

export interface ReportShareInsert {
  report_id: string;
  shared_by: string;
  share_token: string;
  expires_at?: string | null;
  max_views?: number | null;
  requires_email?: boolean;
  allowed_emails?: string[] | null;
  password_hash?: string | null;
}

export interface ReportShareUpdate {
  expires_at?: string | null;
  max_views?: number | null;
  view_count?: number;
  requires_email?: boolean;
  allowed_emails?: string[] | null;
  password_hash?: string | null;
  last_accessed_at?: string | null;
}

/**
 * Report with HTML content loaded from storage
 */
export interface ReportWithHtml extends Report {
  html: string;
}

/**
 * Summary for user's report dashboard
 */
export interface ReportSummary {
  id: string;
  report_type: ReportType;
  city1_name: string;
  city2_name: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  page_count: number | null;
  created_at: string;
  status: ReportStatus;
}

// Supabase expects this structure
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<Profile>;
        Relationships: [];
      };
      comparisons: {
        Row: Comparison;
        Insert: ComparisonInsert;
        Update: Partial<Comparison>;
        Relationships: [];
      };
      olivia_conversations: {
        Row: OliviaConversation;
        Insert: OliviaConversationInsert;
        Update: Partial<OliviaConversation>;
        Relationships: [];
      };
      olivia_messages: {
        Row: OliviaMessage;
        Insert: OliviaMessageInsert;
        Update: Partial<OliviaMessage>;
        Relationships: [];
      };
      gamma_reports: {
        Row: GammaReport;
        Insert: GammaReportInsert;
        Update: Partial<GammaReport>;
        Relationships: [];
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: UserPreferencesInsert;
        Update: Partial<UserPreferences>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: Partial<Subscription>;
        Relationships: [];
      };
      usage_tracking: {
        Row: UsageTracking;
        Insert: UsageTrackingInsert;
        Update: Partial<UsageTracking>;
        Relationships: [];
      };
      grok_videos: {
        Row: GrokVideo;
        Insert: GrokVideoInsert;
        Update: Partial<GrokVideo>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: ReportUpdate;
        Relationships: [];
      };
      report_access_logs: {
        Row: ReportAccessLog;
        Insert: ReportAccessLogInsert;
        Update: Partial<ReportAccessLog>;
        Relationships: [];
      };
      report_shares: {
        Row: ReportShare;
        Insert: ReportShareInsert;
        Update: ReportShareUpdate;
        Relationships: [];
      };
      api_cost_records: {
        Row: ApiCostRecord;
        Insert: ApiCostRecordInsert;
        Update: Partial<ApiCostRecord>;
        Relationships: [];
      };
      consent_logs: {
        Row: ConsentLog;
        Insert: ConsentLogInsert;
        Update: Partial<ConsentLog>;
        Relationships: [];
      };
      avatar_videos: {
        Row: AvatarVideo;
        Insert: Partial<AvatarVideo>;
        Update: Partial<AvatarVideo>;
        Relationships: [];
      };
      judge_reports: {
        Row: JudgeReportRecord;
        Insert: Partial<JudgeReportRecord>;
        Update: Partial<JudgeReportRecord>;
        Relationships: [];
      };
      api_quota_settings: {
        Row: ApiQuotaSetting;
        Insert: Partial<ApiQuotaSetting>;
        Update: Partial<ApiQuotaSetting>;
        Relationships: [];
      };
      contrast_image_cache: {
        Row: ContrastImageCache;
        Insert: Partial<ContrastImageCache>;
        Update: Partial<ContrastImageCache>;
        Relationships: [];
      };
      app_prompts: {
        Row: AppPrompt;
        Insert: Partial<AppPrompt>;
        Update: Partial<AppPrompt>;
        Relationships: [];
      };
      invideo_overrides: {
        Row: InVideoOverride;
        Insert: Partial<InVideoOverride>;
        Update: Partial<InVideoOverride>;
        Relationships: [];
      };
      authorized_manual_access: {
        Row: AuthorizedManualAccess;
        Insert: Partial<AuthorizedManualAccess>;
        Update: Partial<AuthorizedManualAccess>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

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

// ============================================================================
// CONSENT LOGS (GDPR)
// ============================================================================

export interface ConsentLog {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  consent_type: string;
  consent_action: 'granted' | 'denied' | 'withdrawn';
  consent_categories: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  page_url: string | null;
  policy_version: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ConsentLogInsert {
  user_id?: string | null;
  anonymous_id?: string | null;
  consent_type: string;
  consent_action: 'granted' | 'denied' | 'withdrawn';
  consent_categories?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  page_url?: string | null;
  policy_version?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// AVATAR VIDEOS
// ============================================================================

export interface AvatarVideo {
  id: string;
  comparison_id: string;
  city1: string;
  city2: string;
  winner: string;
  winner_score: number | null;
  loser_score: number | null;
  script: string;
  audio_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  replicate_prediction_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// JUDGE REPORTS (DB TABLE — distinct from frontend JudgeReport interface)
// ============================================================================

export interface JudgeReportRecord {
  id: string;
  user_id: string | null;
  report_id: string;
  city1: string;
  city2: string;
  city1_score: number | null;
  city1_trend: string | null;
  city2_score: number | null;
  city2_trend: string | null;
  winner: string | null;
  winner_score: number | null;
  margin: number | null;
  key_findings: unknown[] | null;
  category_analysis: unknown[] | null;
  verdict: string | null;
  full_report: Record<string, unknown> | null;
  video_id: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API QUOTA SETTINGS
// ============================================================================

export type QuotaType = 'dollars' | 'tokens' | 'characters' | 'credits' | 'requests' | 'seconds';
export type AlertLevel = 'yellow' | 'orange' | 'red' | 'exceeded';

export interface ApiQuotaSetting {
  id: string;
  provider_key: string;
  display_name: string;
  icon: string | null;
  quota_type: QuotaType;
  monthly_limit: number;
  warning_yellow: number;
  warning_orange: number;
  warning_red: number;
  current_usage: number;
  usage_month: string;
  alerts_enabled: boolean;
  last_alert_level: AlertLevel | null;
  last_alert_sent_at: string | null;
  fallback_provider_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTRAST IMAGE CACHE
// ============================================================================

export interface ContrastImageCache {
  id: string;
  cache_key: string;
  city_a_url: string | null;
  city_a_caption: string | null;
  city_b_url: string | null;
  city_b_caption: string | null;
  topic: string | null;
  created_at: string;
  expires_at: string;
}

// ============================================================================
// APP PROMPTS
// ============================================================================

export interface AppPrompt {
  id: string;
  category: string;
  prompt_key: string;
  display_name: string;
  prompt_text: string;
  description: string | null;
  version: number;
  last_edited_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INVIDEO OVERRIDES
// ============================================================================

export interface InVideoOverride {
  id: string;
  comparison_id: string | null;
  city_name: string;
  video_url: string;
  video_title: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  is_active: boolean;
  generation_prompt: string | null;
  source: 'manual' | 'api';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTHORIZED MANUAL ACCESS
// ============================================================================

export interface AuthorizedManualAccess {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

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
