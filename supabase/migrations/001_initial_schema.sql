-- ============================================================================
-- LIFE SCORE Database Schema
-- Supabase PostgreSQL Migration
--
-- Run this in Supabase SQL Editor or via CLI:
-- supabase db push
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS PROFILE (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,

  -- Subscription/tier info
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),

  -- Preferences
  preferred_currency TEXT DEFAULT 'USD',
  preferred_units TEXT DEFAULT 'imperial',
  email_notifications BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAVED COMPARISONS (the core report data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Comparison identifiers
  comparison_id TEXT NOT NULL, -- Original comparisonId from app

  -- City data (denormalized for fast queries)
  city1_name TEXT NOT NULL,
  city1_country TEXT NOT NULL,
  city1_score NUMERIC(5,2),
  city2_name TEXT NOT NULL,
  city2_country TEXT NOT NULL,
  city2_score NUMERIC(5,2),

  -- Winner
  winner TEXT CHECK (winner IN ('city1', 'city2', 'tie')),
  score_difference NUMERIC(5,2),

  -- Full comparison result (JSONB for flexibility)
  comparison_result JSONB NOT NULL,

  -- User customization
  nickname TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one comparison per user per comparison_id
  UNIQUE(user_id, comparison_id)
);

-- ============================================================================
-- OLIVIA CONVERSATIONS (chat threads with the AI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.olivia_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  comparison_id UUID REFERENCES public.comparisons(id) ON DELETE SET NULL,

  -- OpenAI thread reference
  openai_thread_id TEXT NOT NULL,

  -- Conversation metadata
  title TEXT, -- Auto-generated or user-set
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OLIVIA MESSAGES (individual chat messages - optional, for history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.olivia_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.olivia_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- OpenAI reference
  openai_message_id TEXT,

  -- Audio (if generated)
  audio_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAMMA REPORTS (visual presentations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gamma_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  comparison_id UUID REFERENCES public.comparisons(id) ON DELETE CASCADE,

  -- Gamma identifiers
  gamma_generation_id TEXT NOT NULL,

  -- URLs
  gamma_url TEXT NOT NULL,
  pdf_url TEXT,
  pptx_url TEXT,

  -- Metadata
  nickname TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER PREFERENCES (settings and saved searches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,

  -- Saved cities (frequently compared)
  favorite_cities JSONB DEFAULT '[]'::jsonb,

  -- UI preferences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  default_view TEXT DEFAULT 'grid' CHECK (default_view IN ('grid', 'list', 'table')),

  -- Olivia preferences
  olivia_auto_speak BOOLEAN DEFAULT true,
  olivia_voice_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Users can only see their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olivia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olivia_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamma_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Comparisons: users can CRUD their own comparisons
CREATE POLICY "Users can view own comparisons"
  ON public.comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comparisons"
  ON public.comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons"
  ON public.comparisons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons"
  ON public.comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- Olivia conversations: users can CRUD their own
CREATE POLICY "Users can view own conversations"
  ON public.olivia_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.olivia_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.olivia_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.olivia_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Olivia messages: users can CRUD messages in their conversations
CREATE POLICY "Users can view own messages"
  ON public.olivia_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.olivia_conversations
      WHERE id = olivia_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON public.olivia_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.olivia_conversations
      WHERE id = olivia_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Gamma reports: users can CRUD their own
CREATE POLICY "Users can view own gamma reports"
  ON public.gamma_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamma reports"
  ON public.gamma_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gamma reports"
  ON public.gamma_reports FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences: users can CRUD their own
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES (for query performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON public.comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON public.comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_cities ON public.comparisons(city1_name, city2_name);
CREATE INDEX IF NOT EXISTS idx_comparisons_favorite ON public.comparisons(user_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.olivia_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_comparison ON public.olivia_conversations(comparison_id);
CREATE INDEX IF NOT EXISTS idx_conversations_thread ON public.olivia_conversations(openai_thread_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.olivia_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.olivia_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gamma_user ON public.gamma_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_gamma_comparison ON public.gamma_reports(comparison_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparisons_updated_at
  BEFORE UPDATE ON public.comparisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.olivia_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Also create default preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update message count on conversation
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.olivia_conversations
  SET
    message_count = (
      SELECT COUNT(*) FROM public.olivia_messages
      WHERE conversation_id = NEW.conversation_id
    ),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count
  AFTER INSERT ON public.olivia_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ============================================================================
-- SEED DATA (optional - for testing)
-- ============================================================================

-- No seed data needed - users create their own data through the app
