/**
 * LIFE SCORE Database Types
 * Auto-generated types for Supabase tables
 *
 * These types match the schema in supabase/migrations/001_initial_schema.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserTier = 'free' | 'pro' | 'enterprise';
export type ComparisonWinner = 'city1' | 'city2' | 'tie';
export type MessageRole = 'user' | 'assistant' | 'system';
export type Theme = 'light' | 'dark' | 'auto';
export type DefaultView = 'grid' | 'list' | 'table';

// ============================================================================
// TABLE TYPES
// ============================================================================

/**
 * User profile (extends Supabase auth.users)
 */
export interface Profile {
  id: string; // UUID, matches auth.users.id
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

/**
 * Saved comparison/report
 */
export interface Comparison {
  id: string; // UUID
  user_id: string; // UUID
  comparison_id: string; // Original app comparison ID
  city1_name: string;
  city1_country: string;
  city1_score: number | null;
  city2_name: string;
  city2_country: string;
  city2_score: number | null;
  winner: ComparisonWinner | null;
  score_difference: number | null;
  comparison_result: Record<string, unknown>; // Full JSONB data
  nickname: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Olivia chat conversation
 */
export interface OliviaConversation {
  id: string; // UUID
  user_id: string; // UUID
  comparison_id: string | null; // UUID, optional link to comparison
  openai_thread_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Individual Olivia chat message
 */
export interface OliviaMessage {
  id: string; // UUID
  conversation_id: string; // UUID
  role: MessageRole;
  content: string;
  openai_message_id: string | null;
  audio_url: string | null;
  created_at: string;
}

/**
 * Gamma visual report
 */
export interface GammaReport {
  id: string; // UUID
  user_id: string; // UUID
  comparison_id: string; // UUID
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url: string | null;
  pptx_url: string | null;
  nickname: string | null;
  created_at: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  id: string; // UUID
  user_id: string; // UUID
  favorite_cities: string[]; // JSONB array
  theme: Theme;
  default_view: DefaultView;
  olivia_auto_speak: boolean;
  olivia_voice_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INSERT TYPES (for creating new records)
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
  comparison_id: string;
  gamma_generation_id: string;
  gamma_url: string;
  pdf_url?: string | null;
  pptx_url?: string | null;
  nickname?: string | null;
}

export interface UserPreferencesInsert {
  user_id: string;
  favorite_cities?: string[];
  theme?: Theme;
  default_view?: DefaultView;
  olivia_auto_speak?: boolean;
  olivia_voice_enabled?: boolean;
}

// ============================================================================
// UPDATE TYPES (for updating records)
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
// SUPABASE DATABASE TYPES (for client initialization)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      comparisons: {
        Row: Comparison;
        Insert: ComparisonInsert;
        Update: ComparisonUpdate;
      };
      olivia_conversations: {
        Row: OliviaConversation;
        Insert: OliviaConversationInsert;
        Update: OliviaConversationUpdate;
      };
      olivia_messages: {
        Row: OliviaMessage;
        Insert: OliviaMessageInsert;
        Update: never; // Messages are immutable
      };
      gamma_reports: {
        Row: GammaReport;
        Insert: GammaReportInsert;
        Update: never;
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: UserPreferencesInsert;
        Update: UserPreferencesUpdate;
      };
    };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Comparison with related data (for list views)
 */
export interface ComparisonWithRelations extends Comparison {
  gamma_reports?: GammaReport[];
  olivia_conversations?: OliviaConversation[];
}

/**
 * Conversation with messages (for chat view)
 */
export interface ConversationWithMessages extends OliviaConversation {
  messages: OliviaMessage[];
  comparison?: Comparison;
}

/**
 * User data bundle (for initial app load)
 */
export interface UserDataBundle {
  profile: Profile;
  preferences: UserPreferences;
  comparisons: Comparison[];
  recentConversations: OliviaConversation[];
}
