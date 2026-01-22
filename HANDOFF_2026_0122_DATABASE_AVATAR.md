# HANDOFF: Database Setup + Avatar Fix Required

**Conversation ID:** `LS-DATABASE-AVATAR-2026-01-22`
**Date:** January 22, 2026
**Priority:** HIGH - Avatar regression needs immediate fix

---

## CRITICAL ISSUE: Wrong Avatar Appearing

### Problem
User's custom D-ID Olivia avatar was working last night. After today's D-ID rate limit fix, a **stranger humanoid (Emma default)** appears instead of their custom Olivia.

### Root Cause
The `DID_PRESENTER_URL` environment variable is likely **not set in Vercel**, causing fallback to default:

```typescript
// api/olivia/avatar/streams.ts:56
const OLIVIA_SOURCE_URL = process.env.DID_PRESENTER_URL ||
  'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg';
  //                                    ^^^ This default "Emma" is showing
```

### Fix Required
1. **Find user's custom Olivia avatar URL** - Check D-ID Studio for the presenter they created
2. **Add to Vercel**: `DID_PRESENTER_URL=https://...their-custom-olivia-url...`
3. **Redeploy**

### Where to Find Custom Avatar URL
1. Go to [D-ID Studio](https://studio.d-id.com/)
2. Click on **Presenters** or **My Presenters**
3. Find the Olivia avatar they created
4. Copy the image URL

---

## DATABASE WORK COMPLETED

### Files Created
| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Full PostgreSQL schema |
| `src/lib/supabase.ts` | Supabase client |
| `src/types/database.ts` | TypeScript types |
| `src/contexts/AuthContext.tsx` | Auth with Supabase + demo fallback |
| `src/services/databaseService.ts` | All CRUD operations |
| `DATABASE_SETUP.md` | Setup guide |
| `.env.example` | Environment template |

### Supabase Project Created
- **Project Ref:** `henghuunttmaowypiyhq`
- **URL:** `https://henghuunttmaowypiyhq.supabase.co`

### Vercel Env Vars Added
- [x] `VITE_SUPABASE_URL`
- [x] `VITE_SUPABASE_ANON_KEY`
- [ ] `DID_PRESENTER_URL` ← **MISSING - NEEDS TO BE ADDED**

### Migration Status
- [ ] SQL migration needs to be run in Supabase SQL Editor
- User was on this step when avatar issue was discovered

---

## NEXT STEPS FOR NEW CONVERSATION

### Immediate (Fix Avatar)
1. Ask user for their D-ID custom avatar URL
2. Add `DID_PRESENTER_URL` to Vercel
3. Redeploy and verify Olivia appears correctly

### Continue Database Setup
1. Help user run SQL migration in Supabase
2. Test authentication flow
3. Test saving comparisons to database
4. Test Olivia conversation persistence

---

## FILES TO READ
```
D:\LifeScore\HANDOFF_2026_0122_DATABASE_AVATAR.md  ← THIS FILE
D:\LifeScore\DATABASE_SETUP.md                     ← Setup guide
D:\LifeScore\api\olivia\avatar\streams.ts          ← Avatar URL code
D:\LifeScore\supabase\migrations\001_initial_schema.sql ← Migration to run
```

---

## START COMMAND FOR NEXT CONVERSATION

```
Read D:\LifeScore\HANDOFF_2026_0122_DATABASE_AVATAR.md

PRIORITY 1: Fix the Olivia avatar - user's custom D-ID avatar is not showing.
The DID_PRESENTER_URL env var needs to be set in Vercel with their custom avatar URL.

PRIORITY 2: Continue helping with Supabase database setup - migration needs to be run.
```

---

**This handoff prepared by Claude Opus 4.5**
