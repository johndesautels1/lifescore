# LIFE SCORE - CODEBASE AUDIT & FIX PLAN
> **Audit Date:** January 23, 2026
> **Auditor:** Claude Opus 4.5
> **Conversation ID:** LIFESCORE-AUDIT-20260123-001
> **Status:** AUDIT COMPLETE - FIXES PENDING APPROVAL

---

## EXECUTIVE SUMMARY

A comprehensive deep-dive audit of the LIFE SCORE codebase revealed **9 critical issues** across 6 categories. The codebase is functional but has significant technical debt, primarily around code duplication (~6,750 lines of bloat) and missing Vercel timeout configurations that will cause production failures.

### Quick Stats
| Metric | Value |
|--------|-------|
| TypeScript Errors | 0 (clean compile) |
| Duplicate Code | ~6,750 lines |
| Missing Vercel Configs | 7 endpoints |
| Security Gaps | 2 (rate limiting, CORS) |
| Schema Health | 100% match |

---

## PRIORITY 1: CRITICAL FIXES (DO IMMEDIATELY)

### 1.1 Missing Vercel Timeout Configurations

**Problem:** 7 API endpoints are missing from `vercel.json` and will timeout at Vercel's default 10 seconds instead of the 30-60 seconds they need.

**Affected Endpoints:**
| Endpoint | Code Timeout | Vercel Config | Status |
|----------|-------------|---------------|--------|
| `api/gamma.ts` | 30,000ms | ❌ MISSING | Will fail at 10s |
| `api/olivia/chat.ts` | 60,000ms | ❌ MISSING | Will fail at 10s |
| `api/olivia/tts.ts` | 30,000ms | ❌ MISSING | Will fail at 10s |
| `api/olivia/context.ts` | N/A | ❌ MISSING | Will fail at 10s |
| `api/olivia/avatar/streams.ts` | 30,000ms | ❌ MISSING | Will fail at 10s |
| `api/olivia/avatar/did.ts` | 30,000ms | ❌ MISSING | Will fail at 10s |
| `api/olivia/avatar/heygen.ts` | 30,000ms | ❌ MISSING | Will fail at 10s |

**Fix:** Update `vercel.json`:
```json
{
  "functions": {
    "api/evaluate.ts": { "maxDuration": 300 },
    "api/judge.ts": { "maxDuration": 300 },
    "api/health.ts": { "maxDuration": 30 },
    "api/test-llm.ts": { "maxDuration": 60 },
    "api/gamma.ts": { "maxDuration": 60 },
    "api/olivia/chat.ts": { "maxDuration": 120 },
    "api/olivia/tts.ts": { "maxDuration": 60 },
    "api/olivia/context.ts": { "maxDuration": 120 },
    "api/olivia/avatar/streams.ts": { "maxDuration": 60 },
    "api/olivia/avatar/did.ts": { "maxDuration": 60 },
    "api/olivia/avatar/heygen.ts": { "maxDuration": 60 }
  }
}
```

**Estimated Time:** 5 minutes
**Risk:** Low (config only)

---

### 1.2 Orphaned Route in vercel.json

**Problem:** `/api/og` route is configured but `api/og.ts` doesn't exist.

**Fix:** Either:
- Remove the rewrite rule from vercel.json, OR
- Create `api/og.ts` for Open Graph image generation

**Estimated Time:** 2 minutes

---

## PRIORITY 2: HIGH PRIORITY FIXES (THIS WEEK)

### 2.1 Duplicate Metrics Data (5,000+ lines)

**Problem:** The 100 metrics are defined THREE times:

| File | Lines | Notes |
|------|-------|-------|
| `src/data/metrics.ts` | 2,506 | "Clues Intelligence LTD" |
| `api/shared/metrics-data.ts` | 2,506 | "John E. Desautels & Associates" |
| `src/shared/metrics.ts` | 298 | Different structure |

**Risks:**
- Metrics can drift between files
- Different company attributions
- 5,000 lines of unnecessary code
- Maintenance nightmare

**Fix Plan:**
1. Create single source: `shared/metrics-data.ts`
2. Update imports in all files
3. Delete duplicate files
4. Use build-time import for API (or shared package)

**Estimated Time:** 2-3 hours
**Risk:** Medium (requires testing)

---

### 2.2 Duplicate `fetchWithTimeout` Function (12 copies)

**Problem:** The exact same function is copy-pasted 12 times:

```
api/evaluate.ts:18-29
api/judge.ts:44-57
api/gamma.ts:65-82
api/test-llm.ts:11-23
api/olivia/chat.ts:50-68
api/olivia/tts.ts:46-63
api/olivia/avatar/did.ts:51-67
api/olivia/avatar/heygen.ts:58-75
api/olivia/avatar/streams.ts:89-108
src/services/cache.ts:36-47
src/services/oliviaService.ts:33-50
src/services/savedComparisons.ts:72-85
```

**Fix Plan:**
1. Create `api/shared/fetchWithTimeout.ts`
2. Create `src/lib/fetchWithTimeout.ts`
3. Update all imports
4. Delete duplicate code

**Estimated Time:** 1 hour
**Risk:** Low

---

### 2.3 Duplicate CORS Headers (11 copies)

**Problem:** Every API endpoint has identical CORS setup duplicated.

**Fix Plan:**
1. Create `api/shared/cors.ts`:
```typescript
export function setCorsHeaders(res: VercelResponse, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```
2. Update all API handlers to use shared function

**Estimated Time:** 30 minutes
**Risk:** Low

---

### 2.4 Rate Limiting Gaps

**Problem:** Only `api/olivia/avatar/streams.ts` has rate limiting. All other endpoints are vulnerable to abuse.

**Current Protection:**
| Endpoint | Rate Limited |
|----------|--------------|
| `api/olivia/avatar/streams.ts` | ✅ 30 req/min/IP |
| All other endpoints | ❌ None |

**Fix Plan:**
1. Create `api/shared/rateLimit.ts` with reusable rate limiter
2. Apply to all public endpoints
3. Consider different limits per endpoint type

**Estimated Time:** 1-2 hours
**Risk:** Medium (could block legitimate users if too aggressive)

---

## PRIORITY 3: MEDIUM PRIORITY (TECH DEBT)

### 3.1 Inconsistent CORS Policies

**Problem:** Most endpoints use `*` but `evaluate.ts` and `judge.ts` use restricted origin.

**Current State:**
| Endpoint | CORS Policy |
|----------|-------------|
| `api/evaluate.ts` | Restricted to Vercel domain |
| `api/judge.ts` | Restricted to Vercel domain |
| All others | `*` (allow all) |

**Fix:** Standardize to restricted CORS for all endpoints.

**Estimated Time:** 30 minutes

---

### 3.2 `as any` Type Escapes (4 instances)

**Problem:** TypeScript type safety bypassed with `as any`:

```typescript
// src/services/databaseService.ts:52-53
const city1 = comparisonResult.city1 as any;
const city2 = comparisonResult.city2 as any;

// api/olivia/context.ts:582
const cat = (m as any).category || 'Other';

// api/olivia/context.ts:601
const sortedByDiff = [...topMetrics].sort((a, b) => (b as any).diff - (a as any).diff);
```

**Fix:** Add proper type definitions or type guards.

**Estimated Time:** 30 minutes

---

### 3.3 Empty Catch Handlers (10 instances)

**Problem:** Silent error swallowing in `oliviaService.ts`:

```typescript
const error = await response.json().catch(() => ({}));
```

**Fix:** Add proper error logging:
```typescript
const error = await response.json().catch((e) => {
  console.error('[OliviaService] Failed to parse error response:', e);
  return {};
});
```

**Estimated Time:** 15 minutes

---

### 3.4 Dead Code Folder

**Problem:** `Dead Code/` folder contains ~1,500+ lines of archived code but is tracked in git.

**Fix:** Add to `.gitignore` or move to separate archive branch.

**Estimated Time:** 5 minutes

---

## PRIORITY 4: LOW PRIORITY (NICE TO HAVE)

### 4.1 Different Company Attributions

**Problem:** Different files have different company names:
- "Clues Intelligence LTD" (src/data/metrics.ts)
- "John E. Desautels & Associates" (api/shared/metrics-data.ts)

**Fix:** Standardize to correct company name.

---

### 4.2 Confusing Folder Structure

**Problem:** Metrics exist in multiple locations:
- `src/data/metrics.ts`
- `src/shared/metrics.ts`
- `api/shared/metrics-data.ts`

**Fix:** Consolidate to single location with clear naming.

---

## TIMEOUT VALUE REFERENCE

Current timeout values across codebase (for reference):

| Service | Timeout (ms) | Location |
|---------|-------------|----------|
| OpenAI Chat | 60,000 | api/olivia/chat.ts:13 |
| Opus Judge | 240,000 | api/judge.ts:41 |
| LLM Evaluate | 240,000 | api/evaluate.ts:12 |
| ElevenLabs TTS | 30,000 | api/olivia/tts.ts:18 |
| D-ID Streams | 30,000 | api/olivia/avatar/streams.ts:21 |
| D-ID Legacy | 30,000 | api/olivia/avatar/did.ts:21 |
| HeyGen | 30,000 | api/olivia/avatar/heygen.ts:13 |
| Gamma | 30,000 | api/gamma.ts:16 |
| GitHub API | 30,000 | src/services/savedComparisons.ts:69 |
| KV Cache | 10,000 | src/services/cache.ts:32 |
| Test LLM | 15,000 | api/test-llm.ts:9 |
| Client Fetch | 240,000 | src/services/llmEvaluators.ts:19 |
| Database Query | 5,000 | src/contexts/AuthContext.tsx:147 |
| Session Check | 5,000 | src/contexts/AuthContext.tsx:206 |

---

## SCHEMA HEALTH REPORT

✅ **ALL CLEAR** - Database types match SQL schema perfectly.

| Type | TypeScript | SQL Schema | Status |
|------|------------|------------|--------|
| Profile | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |
| Comparison | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |
| OliviaConversation | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |
| OliviaMessage | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |
| GammaReport | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |
| UserPreferences | `src/types/database.ts` | `001_initial_schema.sql` | ✅ Match |

---

## SECURITY AUDIT SUMMARY

| Area | Status | Notes |
|------|--------|-------|
| API Keys | ✅ PASS | Server-side only |
| SQL Injection | ✅ PASS | Using Supabase parameterized queries |
| XSS | ✅ PASS | React auto-escapes |
| CORS | ⚠️ WARN | Inconsistent policies |
| Rate Limiting | ⚠️ WARN | Only on 1 endpoint |
| Auth | ✅ PASS | Supabase + demo mode |
| Input Validation | ⚠️ WARN | Basic type checks only |

---

## FILE DIRECTORY FOR FIXES

```
D:\LifeScore\
├── api/
│   ├── shared/
│   │   ├── fetchWithTimeout.ts    # CREATE (extract from duplicates)
│   │   ├── cors.ts                # CREATE (extract from duplicates)
│   │   ├── rateLimit.ts           # CREATE (for all endpoints)
│   │   ├── metrics-data.ts        # KEEP (but sync with src/)
│   │   └── types.ts               # EXISTS
│   ├── evaluate.ts                # UPDATE imports
│   ├── judge.ts                   # UPDATE imports
│   ├── gamma.ts                   # UPDATE imports
│   ├── olivia/
│   │   ├── chat.ts                # UPDATE imports
│   │   ├── tts.ts                 # UPDATE imports
│   │   ├── context.ts             # UPDATE imports, fix `as any`
│   │   └── avatar/
│   │       ├── streams.ts         # UPDATE imports
│   │       ├── did.ts             # UPDATE imports
│   │       └── heygen.ts          # UPDATE imports
│   └── test-llm.ts                # UPDATE imports
├── src/
│   ├── lib/
│   │   └── fetchWithTimeout.ts    # CREATE (for client-side)
│   ├── data/
│   │   └── metrics.ts             # DELETE (use shared/)
│   ├── shared/
│   │   └── metrics.ts             # UPDATE (make single source)
│   └── services/
│       ├── databaseService.ts     # FIX `as any` types
│       ├── oliviaService.ts       # FIX error handling
│       ├── cache.ts               # UPDATE imports
│       └── savedComparisons.ts    # UPDATE imports
├── vercel.json                    # UPDATE (add missing configs)
├── .gitignore                     # UPDATE (add Dead Code/)
└── Dead Code/                     # CONSIDER removing from git
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Critical (Day 1)
- [ ] Update vercel.json with all endpoint timeouts
- [ ] Remove orphaned /api/og route

### Phase 2: High Priority (Day 2-3)
- [ ] Extract fetchWithTimeout to shared files
- [ ] Extract CORS helper to shared file
- [ ] Consolidate metrics to single source
- [ ] Implement rate limiting on all endpoints

### Phase 3: Medium Priority (Day 4-5)
- [ ] Standardize CORS policies
- [ ] Fix `as any` type escapes
- [ ] Improve error handling in oliviaService
- [ ] Clean up Dead Code folder

### Phase 4: Testing
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Test all API endpoints locally
- [ ] Deploy to Vercel preview
- [ ] Test production functionality

---

## PROMPT TO RESUME TOMORROW

```
Resume LIFE SCORE codebase fixes.

READ FIRST:
- D:\LifeScore\docs\AUDIT_FIX_PLAN_2026_0123.md

CONVERSATION ID: LIFESCORE-AUDIT-20260123-001

PRIORITY ORDER:
1. Update vercel.json (5 min - CRITICAL)
2. Extract fetchWithTimeout (1 hr)
3. Extract CORS helper (30 min)
4. Consolidate metrics (2-3 hrs)
5. Add rate limiting (1-2 hrs)

Start with Phase 1 Critical fixes.
```

---

## APPENDIX: D-ID ALTERNATIVES RESEARCH

Self-hosted avatar solutions to replace D-ID ($0.05-0.10/min):

| Solution | Open Source | Real-Time | Est. Cost |
|----------|-------------|-----------|-----------|
| LivePortrait | Yes | Yes (TensorRT) | ~$0.01/min |
| Wav2Lip | Yes (Apache 2.0) | Near | ~$0.01/min |
| Wav2Lip | Yes | Near | ~$0.01/min |
| PersonaLive | Yes | Yes | ~$0.01/min |

**Recommended:** LivePortrait - Adopted by major platforms (Kuaishou, Douyin, WeChat)

**Resources:**
- https://github.com/KlingTeam/LivePortrait
- https://github.com/Winfredy/Wav2Lip
- https://github.com/Rudrabha/Wav2Lip

---

**END OF AUDIT FIX PLAN**
