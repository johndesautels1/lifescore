/**
 * LIFE SCORE Database Types
 * Auto-generated types for Supabase tables
 *
 * This barrel file re-exports all database types from domain-specific files.
 * The Database type (Supabase schema mapping) lives here since it references all domains.
 */

// ============================================================================
// RE-EXPORTS FROM DOMAIN FILES
// ============================================================================

export type {
  UserTier,
  ComparisonWinner,
  MessageRole,
  Theme,
  DefaultView,
  GrokVideoType,
  GrokVideoStatus,
  GrokVideoProvider,
  SubscriptionStatus,
  Profile,
  Comparison,
  OliviaConversation,
  OliviaMessage,
  GammaReport,
  UserPreferences,
  Subscription,
  UsageTracking,
  GrokVideo,
  ProfileInsert,
  ComparisonInsert,
  OliviaConversationInsert,
  OliviaMessageInsert,
  GammaReportInsert,
  UserPreferencesInsert,
  SubscriptionInsert,
  UsageTrackingInsert,
  GrokVideoInsert,
  ProfileUpdate,
  ComparisonUpdate,
  OliviaConversationUpdate,
  UserPreferencesUpdate,
  ComparisonWithRelations,
  ConversationWithMessages,
  UserDataBundle,
} from './database-core';

export type {
  ReportType,
  ReportStatus,
  ReportAccessType,
  Report,
  ReportInsert,
  ReportUpdate,
  ReportAccessLog,
  ReportAccessLogInsert,
  ReportShare,
  ReportShareInsert,
  ReportShareUpdate,
  ReportWithHtml,
  ReportSummary,
} from './database-reports';

export type {
  ConsentLog,
  ConsentLogInsert,
  AvatarVideo,
  JudgeReportRecord,
  QuotaType,
  AlertLevel,
  ApiQuotaSetting,
  ContrastImageCache,
  AppPrompt,
  InVideoOverride,
  AuthorizedManualAccess,
} from './database-features';

export type {
  ApiCostRecord,
  ApiCostRecordInsert,
  ApiCostSummary,
} from './database-costs';

export type {
  JobType,
  JobStatus,
  NotifyChannel,
  Job,
  JobInsert,
  JobUpdate,
  NotificationType,
  Notification,
  NotificationInsert,
  NotificationUpdate,
} from './database-jobs';

// ============================================================================
// IMPORTS FOR DATABASE TYPE (needed for Supabase schema mapping)
// ============================================================================

import type {
  Profile,
  ProfileInsert,
  Comparison,
  ComparisonInsert,
  OliviaConversation,
  OliviaConversationInsert,
  OliviaMessage,
  OliviaMessageInsert,
  GammaReport,
  GammaReportInsert,
  UserPreferences,
  UserPreferencesInsert,
  Subscription,
  SubscriptionInsert,
  UsageTracking,
  UsageTrackingInsert,
  GrokVideo,
  GrokVideoInsert,
} from './database-core';

import type {
  Report,
  ReportInsert,
  ReportUpdate,
  ReportAccessLog,
  ReportAccessLogInsert,
  ReportShare,
  ReportShareInsert,
  ReportShareUpdate,
} from './database-reports';

import type {
  ConsentLog,
  ConsentLogInsert,
  AvatarVideo,
  JudgeReportRecord,
  ApiQuotaSetting,
  ContrastImageCache,
  AppPrompt,
  InVideoOverride,
  AuthorizedManualAccess,
} from './database-features';

import type {
  ApiCostRecord,
  ApiCostRecordInsert,
} from './database-costs';

import type {
  Job,
  JobInsert,
  JobUpdate,
  Notification,
  NotificationInsert,
  NotificationUpdate,
} from './database-jobs';

// ============================================================================
// SUPABASE DATABASE TYPE
// ============================================================================

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
      jobs: {
        Row: Job;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
