# LIFE SCORE - Performance Audit (February 2, 2026)

**Session ID:** `LIFESCORE-DEBUG-20260202-003`
**Status:** AUDIT COMPLETE - PERFORMANCE FIXES REQUIRED
**Priority:** CRITICAL - Site takes 1-3 MINUTES to load on cold start

---

## Session Summary

This session completed:
1. ✅ Added 2 European cities (Valletta, Nicosia) to reach 200 total
2. ✅ Created Legal Compliance Manual with admin-only access
3. ✅ Fixed AskOlivia scroll behavior (scrolls to TOP of response)
4. ✅ Fixed silent "Manage Subscription" button failure
5. ✅ Diagnosed Supabase connection timeout issues
6. ✅ Fixed missing `VITE_SUPABASE_URL` for non-Production environments
7. ✅ Added `SUPABASE_SERVICE_ROLE_KEY` env var requirement
8. ✅ Complete performance audit of codebase

---

## PERFORMANCE ISSUES TABLE

| # | Issue | Impact | Severity | Fix |
|---|-------|--------|----------|-----|
| 1 | **Bundle size: 1.36MB** | First load downloads 1.36MB JS | 🔴 CRITICAL | Add code splitting with manualChunks |
| 2 | **No lazy loading** | All 30+ components load on startup | 🔴 CRITICAL | Use React.lazy() for tabs/routes |
| 3 | **Huge data files bundled** | 268KB of static data in main chunk | 🔴 CRITICAL | Dynamic import data files |
| 4 | **No code splitting configured** | All 177 modules in ONE chunk | 🔴 CRITICAL | Configure Vite manualChunks |
| 5 | **Supabase fetch timeout** | Profile fetch times out after 45s | 🔴 CRITICAL | Debug RLS policies, connection |
| 6 | **8 duplicate comparison requests** | Same upsert called 8 times on load | 🟡 HIGH | Fix duplicate API call in useEffect |
| 7 | **CSS bundle: 331KB** | All styles loaded upfront | 🟡 HIGH | CSS code splitting, purging |
| 8 | **vite.config hides warnings** | `chunkSizeWarningLimit: 1000` masks issue | 🟡 HIGH | Remove limit, fix actual issue |
| 9 | **88 useEffect hooks** | Potential cascade of API calls on mount | 🟡 MEDIUM | Audit for unnecessary fetches |
| 10 | **Large components not split** | EnhancedComparison: 2268 lines | 🟡 MEDIUM | Split into sub-components |

---

## Data Files to Lazy Load

| File | Size | Lines | Priority |
|------|------|-------|----------|
| `src/data/metrics.ts` | 92KB | 2506 | 🔴 CRITICAL |
| `src/data/fieldKnowledge.ts` | 68KB | 1777 | 🔴 CRITICAL |
| `freedom-index-scoring-anchors.json` | 72KB | - | 🔴 CRITICAL |
| `src/data/metricTooltips.ts` | 20KB | - | 🟡 HIGH |
| `src/data/metros.ts` | 16KB | - | 🟡 HIGH |
| **Total** | **268KB** | - | - |

---

## Components to Lazy Load

| Component | Lines | Tab/Route | Priority |
|-----------|-------|-----------|----------|
| `EnhancedComparison.tsx` | 2268 | Compare | 🔴 CRITICAL |
| `JudgeTab.tsx` | 1567 | Judge Report | 🔴 CRITICAL |
| `AskOlivia.tsx` | 944 | Olivia | 🟡 HIGH |
| `SavedComparisons.tsx` | 578 | Saved | 🟡 HIGH |
| `VisualsTab.tsx` | ~500 | Visuals | 🟡 HIGH |

---

## Recommended Vite Config Changes

```typescript
// vite.config.ts - ADD manualChunks
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'data-metrics': ['./src/data/metrics.ts'],
          'data-knowledge': ['./src/data/fieldKnowledge.ts'],
        }
      }
    }
  }
});
```

---

## Recommended App.tsx Changes

```typescript
// Add lazy loading for tab components at the top of App.tsx
import React, { Suspense } from 'react';

// Replace direct imports with lazy imports
const AskOlivia = React.lazy(() => import('./components/AskOlivia'));
const JudgeTab = React.lazy(() => import('./components/JudgeTab'));
const SavedComparisons = React.lazy(() => import('./components/SavedComparisons'));
const VisualsTab = React.lazy(() => import('./components/VisualsTab'));
const EnhancedComparison = React.lazy(() => import('./components/EnhancedComparison'));

// In the JSX, wrap lazy components in Suspense
<Suspense fallback={<div className="loading-spinner">Loading...</div>}>
  {activeTab === 'olivia' && <AskOlivia comparisonResult={...} />}
  {activeTab === 'judges-report' && <JudgeTab comparisonResult={...} />}
  {activeTab === 'saved' && <SavedComparisons ... />}
  {activeTab === 'visuals' && <VisualsTab ... />}
</Suspense>
```

---

## Environment Variables Fixed This Session

| Variable | Issue | Fix |
|----------|-------|-----|
| `VITE_SUPABASE_URL` | Was "Production" only | Changed to "All Environments" |
| `SUPABASE_SERVICE_ROLE_KEY` | Missing (some files need it) | Added with same value as SUPABASE_SERVICE_KEY |

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| `c5142b5` | Added Valletta, Malta and Nicosia, Cyprus (200 cities) |
| `f00c6a5` | Fixed Wav2Lip pricing in audit docs |
| `b2a0640` | Created Legal Compliance Manual with access control |
| `381e037` | Added brokerpinellas@gmail.com as admin |
| `8addc41` | Fixed AskOlivia scroll to TOP of response |
| `d698816` | Fixed silent Manage Subscription button failure |
| `e24e5af` | Trigger redeploy for env var changes |

---

## Root Cause of 45-Second Timeout

The browser console showed:
```
[Supabase] Profile fetch failed after 4 attempts: Profile fetch timed out after 45000ms
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

**Cause:** `VITE_SUPABASE_URL` was only set for "Production" environment in Vercel, but `VITE_SUPABASE_ANON_KEY` was set for "All Environments". This mismatch caused the Supabase client to fail initialization on non-production deployments.

**Fix:** Changed `VITE_SUPABASE_URL` to "All Environments" in Vercel and redeployed.

---

## Database Status

Profiles table verified working:
```sql
SELECT id, email, tier FROM profiles;
```

| email | tier |
|-------|------|
| test@lifescore.com | free |
| jdes7@aol.com | free |
| johndesau7@gmail.com | free |
| brokerpinellas@gmail.com | enterprise |
| cluesnomads@gmail.com | free |

---

## Start Next Session With

```bash
# Check current bundle size
cd D:\lifescore && npm run build

# Focus on these files:
# 1. vite.config.ts - Add manualChunks
# 2. src/App.tsx - Add React.lazy for tab components
# 3. Debug duplicate API calls in Network tab (8 comparison upserts)
```

---

## Files Created This Session

| File | Purpose |
|------|---------|
| `docs/manuals/LEGAL_COMPLIANCE_MANUAL.md` | Legal/regulatory documentation |
| `supabase/migrations/20260202_create_authorized_manual_access.sql` | Admin access table |
| `docs/PERFORMANCE_AUDIT_20260202.md` | This document |

## Files Modified This Session

| File | Change |
|------|--------|
| `src/data/metros.ts` | Added Valletta, Malta and Nicosia, Cyprus |
| `api/emilia/manuals.ts` | Added legal manual type, auth check |
| `src/components/HelpModal.tsx` | Added Legal tab with admin filtering |
| `src/components/ManualViewer.tsx` | Added legal type, access denied UI |
| `src/components/AskOlivia.tsx` | Fixed scroll to TOP of Olivia's response |
| `src/components/PricingModal.tsx` | Added error feedback for missing profile.id |
| `src/components/PricingPage.tsx` | Added error feedback for missing profile.id |
| All legal documents | Added registered company address |

---

**END OF PERFORMANCE AUDIT**
