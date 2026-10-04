# LifeScore Final Schema Requirements

**Version:** 1.0
**Last Updated:** January 28, 2026
**Document ID:** LS-SCHEMA-001
**Priority:** REQUIRED BEFORE LAUNCH

---

## IMPORTANT: Instructions for Future AI Agents

**READ THIS FIRST:**

Before launching LifeScore to production, the database schema MUST be finalized and verified. This document contains:

1. All required tables and their schemas
2. Missing tables that need to be created
3. Schema fixes that need to be applied
4. Verification steps to confirm schema is complete

**DO NOT LAUNCH** until all items in this document are verified as complete.

---

## Current State Summary

| Category | Count | Status |
|----------|-------|--------|
| Existing Tables | 14 | ✅ Created |
| Missing Tables | 2 | ❌ Need Creation |
| Tables Needing Updates | 1 | ⚠️ Need Migration |
| Indexes Needed | 3 | ❌ Need Creation |

---

## Part 1: Existing Tables (Verified)

The following tables exist and are correctly configured:

### Core Tables

| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `profiles` | User accounts | ✅ | ✅ Complete |
| `comparisons` | Saved comparisons | ✅ | ✅ Complete |
| `user_preferences` | User settings | ✅ | ✅ Complete |
| `subscriptions` | Stripe billing | ✅ | ✅ Complete |
| `usage_tracking` | Monthly limits | ✅ | ✅ Complete |

### Chat/AI Tables

| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `olivia_conversations` | Chat threads | ✅ | ✅ Complete |
| `olivia_messages` | Chat messages | ✅ | ✅ Complete |

### Report/Media Tables

| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `gamma_reports` | Report URLs | ✅ | ✅ Complete |
| `judge_reports` | Judge verdicts | ✅ | ✅ Complete |
| `avatar_videos` | Judge video cache | ✅ | ✅ Complete |
| `grok_videos` | Grok video cache | ✅ | ✅ Complete |

### Analytics/Compliance Tables

| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `api_cost_records` | Cost tracking | ✅ | ✅ Complete |
| `consent_logs` | GDPR compliance | ✅ | ✅ Complete |

---

## Part 2: Missing Tables (MUST CREATE)

### Table 1: `city_evaluations`

**Purpose:** Cache city evaluation results for performance
**Priority:** CRITICAL

```sql
-- CREATE THIS TABLE BEFORE LAUNCH

CREATE TABLE city_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City identification
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,

  -- Evaluation metadata
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  llm_provider TEXT NOT NULL,
  evaluation_version TEXT DEFAULT 'v1.0',

  -- Cached data
  metrics_data JSONB NOT NULL,
  evidence_data JSONB,
  category_scores JSONB,
  tavily_summary TEXT,

  -- Media cache
  freedom_video_url TEXT,
  imprisonment_video_url TEXT,
  gamma_pdf_url TEXT,
  gamma_pptx_url TEXT,

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID,

  -- Constraints
  UNIQUE(city_name, country, llm_provider),

  -- Foreign keys
  CONSTRAINT fk_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_city_eval_lookup
  ON city_evaluations(city_name, country, llm_provider);
CREATE INDEX idx_city_eval_expires
  ON city_evaluations(expires_at);
CREATE INDEX idx_city_eval_popular
  ON city_evaluations(hit_count DESC);

-- RLS
ALTER TABLE city_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read evaluations"
  ON city_evaluations FOR SELECT
  USING (true);

CREATE POLICY "Service role manages evaluations"
  ON city_evaluations FOR ALL
  USING (auth.role() = 'service_role');

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_evaluations()
RETURNS void AS $$
BEGIN
  DELETE FROM city_evaluations
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

### Table 2: `contrast_image_cache`

**Purpose:** Cache Olivia contrast images
**Priority:** HIGH
**Note:** This table is REFERENCED in code but NOT CREATED

```sql
-- CREATE THIS TABLE - It's used in api/olivia/contrast-images.ts

CREATE TABLE contrast_image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  city_a_url TEXT NOT NULL,
  city_a_caption TEXT,
  city_b_url TEXT NOT NULL,
  city_b_caption TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for fast lookup
CREATE INDEX idx_contrast_cache_key ON contrast_image_cache(cache_key);
CREATE INDEX idx_contrast_expires ON contrast_image_cache(expires_at);

-- RLS
ALTER TABLE contrast_image_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contrast images"
  ON contrast_image_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role manages images"
  ON contrast_image_cache FOR ALL
  USING (auth.role() = 'service_role');

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_contrast_images()
RETURNS void AS $$
BEGIN
  DELETE FROM contrast_image_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Part 3: Tables Needing Updates

### Table: `comparisons`

**Update Needed:** Add caching reference field

```sql
-- ADD COLUMN to link comparison to cached evaluations
ALTER TABLE comparisons
ADD COLUMN city1_cache_id UUID REFERENCES city_evaluations(id),
ADD COLUMN city2_cache_id UUID REFERENCES city_evaluations(id),
ADD COLUMN used_cache BOOLEAN DEFAULT false;
```

---

## Part 4: Missing Indexes

The following indexes should be added for performance:

```sql
-- 1. Faster user comparison lookups
CREATE INDEX IF NOT EXISTS idx_comparisons_user_recent
  ON comparisons(user_id, created_at DESC);

-- 2. Faster subscription status checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions(user_id)
  WHERE status = 'active';

-- 3. Faster usage period lookups
CREATE INDEX IF NOT EXISTS idx_usage_current_period
  ON usage_tracking(user_id, period_end DESC);
```

---

## Part 5: Helper Functions

### Function: Get or Create Usage Period

**Verify this exists:**

```sql
-- Should already exist in 002_subscriptions_and_usage.sql
-- Verify and recreate if missing

CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id UUID)
RETURNS usage_tracking AS $$
DECLARE
  v_record usage_tracking;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT * INTO v_record
  FROM usage_tracking
  WHERE user_id = p_user_id AND period_start = v_period_start;

  IF NOT FOUND THEN
    INSERT INTO usage_tracking (user_id, period_start, period_end)
    VALUES (p_user_id, v_period_start, v_period_end)
    RETURNING * INTO v_record;
  END IF;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql;
```

### Function: Increment Usage

```sql
-- Should already exist
-- Verify includes grok_videos column

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_period_start DATE;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;

  PERFORM get_or_create_usage_period(p_user_id);

  EXECUTE format(
    'UPDATE usage_tracking SET %I = %I + $1, updated_at = NOW()
     WHERE user_id = $2 AND period_start = $3',
    p_feature, p_feature
  ) USING p_amount, p_user_id, v_period_start;
END;
$$ LANGUAGE plpgsql;
```

### Function: Find Cached Grok Video

```sql
-- Verify this exists in grok_videos migration

CREATE OR REPLACE FUNCTION find_cached_grok_video(
  p_city_name TEXT,
  p_video_type TEXT
)
RETURNS grok_videos AS $$
DECLARE
  v_video grok_videos;
BEGIN
  SELECT * INTO v_video
  FROM grok_videos
  WHERE city_name = p_city_name
    AND video_type = p_video_type
    AND status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_video;
END;
$$ LANGUAGE plpgsql;
```

---

## Part 6: Cron Jobs (Supabase Edge Functions)

### Job 1: Cleanup Expired Data

```sql
-- Run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-expired-data',
  '0 3 * * *',
  $$
    SELECT cleanup_expired_evaluations();
    SELECT cleanup_expired_contrast_images();
    SELECT cleanup_expired_videos();
  $$
);
```

---

## Part 7: Verification Checklist

**Before launching, verify ALL items:**

### Tables Exist
- [ ] `profiles` - Run: `SELECT COUNT(*) FROM profiles;`
- [ ] `comparisons` - Run: `SELECT COUNT(*) FROM comparisons;`
- [ ] `olivia_conversations` - Run: `SELECT COUNT(*) FROM olivia_conversations;`
- [ ] `olivia_messages` - Run: `SELECT COUNT(*) FROM olivia_messages;`
- [ ] `gamma_reports` - Run: `SELECT COUNT(*) FROM gamma_reports;`
- [ ] `user_preferences` - Run: `SELECT COUNT(*) FROM user_preferences;`
- [ ] `subscriptions` - Run: `SELECT COUNT(*) FROM subscriptions;`
- [ ] `usage_tracking` - Run: `SELECT COUNT(*) FROM usage_tracking;`
- [ ] `consent_logs` - Run: `SELECT COUNT(*) FROM consent_logs;`
- [ ] `judge_reports` - Run: `SELECT COUNT(*) FROM judge_reports;`
- [ ] `avatar_videos` - Run: `SELECT COUNT(*) FROM avatar_videos;`
- [ ] `api_cost_records` - Run: `SELECT COUNT(*) FROM api_cost_records;`
- [ ] `grok_videos` - Run: `SELECT COUNT(*) FROM grok_videos;`
- [ ] `city_evaluations` - **MUST CREATE**
- [ ] `contrast_image_cache` - **MUST CREATE**

### RLS Enabled
- [ ] All tables have RLS enabled
- [ ] Run: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

### Indexes Created
- [ ] `idx_city_eval_lookup` exists
- [ ] `idx_city_eval_expires` exists
- [ ] `idx_contrast_cache_key` exists

### Functions Work
- [ ] `get_or_create_usage_period()` - Test with valid user_id
- [ ] `increment_usage()` - Test incrementing a counter
- [ ] `find_cached_grok_video()` - Test with city name

### Storage Bucket
- [ ] "Avatars" bucket exists in Supabase Storage
- [ ] Public read access enabled
- [ ] Service role write access enabled

---

## Part 8: Migration Order

Run migrations in this order:

1. **001_initial_schema.sql** - Core tables
2. **002_subscriptions_and_usage.sql** - Billing tables
3. **003_avatar_videos.sql** - Avatar cache
4. **20260123_create_consent_logs.sql** - GDPR
5. **20260124_create_judge_reports.sql** - Judge verdicts
6. **20260126_create_api_cost_records.sql** - Cost tracking
7. **20260127_create_grok_videos.sql** - Grok videos
8. **20260127_add_grok_videos_to_usage_tracking.sql** - Usage update
9. **NEW: 20260128_create_city_evaluations.sql** - Caching
10. **NEW: 20260128_create_contrast_image_cache.sql** - Image cache

---

## Part 9: Complete Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LIFESCORE DATABASE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐  │
│  │  profiles   │────▶│   comparisons   │────▶│  gamma_reports   │  │
│  └─────────────┘     └─────────────────┘     └──────────────────┘  │
│         │                    │                                       │
│         │                    │                                       │
│         ▼                    ▼                                       │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐  │
│  │ preferences │     │  judge_reports  │────▶│  avatar_videos   │  │
│  └─────────────┘     └─────────────────┘     └──────────────────┘  │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐  │
│  │subscriptions│     │olivia_convers.  │────▶│ olivia_messages  │  │
│  └─────────────┘     └─────────────────┘     └──────────────────┘  │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐  │
│  │usage_tracking│    │api_cost_records │     │   grok_videos    │  │
│  └─────────────┘     └─────────────────┘     └──────────────────┘  │
│                                                                      │
│  ┌─────────────┐     ┌─────────────────┐                            │
│  │consent_logs │     │city_evaluations │  ◀── NEW (CACHING)        │
│  └─────────────┘     └─────────────────┘                            │
│                                                                      │
│                      ┌─────────────────┐                            │
│                      │contrast_img_cache│  ◀── NEW (MISSING)        │
│                      └─────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary for Future Agents

**BEFORE LAUNCHING:**

1. ✅ Create `city_evaluations` table (use SQL in Part 2)
2. ✅ Create `contrast_image_cache` table (use SQL in Part 2)
3. ✅ Add columns to `comparisons` table (Part 3)
4. ✅ Create missing indexes (Part 4)
5. ✅ Verify all helper functions exist (Part 5)
6. ✅ Run verification checklist (Part 7)
7. ✅ Test all RLS policies work correctly

**ESTIMATED TIME:** 1-2 hours

**RISK IF SKIPPED:**
- `contrast_image_cache` missing = Olivia contrast images will error
- `city_evaluations` missing = No performance caching (slow app)
- Missing indexes = Slow queries as data grows

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
