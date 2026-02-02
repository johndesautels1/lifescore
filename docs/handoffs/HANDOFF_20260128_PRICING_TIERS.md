# HANDOFF: Pricing Tier Standardization

**Session:** LS-20260128-003
**Date:** January 28, 2026
**Status:** ✅ COMPLETED

---

## COMPLETED

| File | Status |
|------|--------|
| `src/hooks/useTierAccess.ts` | ✅ SOURCE OF TRUTH - Fixed |
| `src/components/PricingModal.tsx` | ✅ Fixed |
| `src/components/PricingPage.tsx` | ✅ Fixed |
| `src/components/FeatureGate.tsx` | ✅ Fixed |

---

## REMAINING CODE FIXES (Critical - Do First)

### 1. src/components/AskOlivia.tsx

Change `oliviaMessagesPerDay` → `oliviaMinutesPerMonth` at these lines:
- Line 259: `if (!isUnlimited('oliviaMessagesPerDay'))`
- Line 260: `const usage = await checkUsage('oliviaMessagesPerDay')`
- Line 270: `await incrementUsage('oliviaMessagesPerDay')`
- Line 753: `<UsageMeter feature="oliviaMessagesPerDay" compact={true} />`

### 2. src/types/database.ts

Change `olivia_messages` → `olivia_minutes` in UsageTracking interface:
- Line 126: `olivia_messages: number;` → `olivia_minutes: number;`
- Line 232: `olivia_messages?: number;` → `olivia_minutes?: number;`

---

## DOCUMENTATION FIXES - ✅ COMPLETED (2026-02-02)

### 3. docs/manuals/USER_MANUAL.md - ✅ DONE

Now uses NAVIGATOR, FREE, SOVEREIGN with correct limits.

### 4. docs/manuals/CUSTOMER_SERVICE_MANUAL.md - ✅ DONE

Now uses NAVIGATOR, FREE, SOVEREIGN with correct limits.

### 5. api/emilia/manuals.ts (Lines 36-300)

**Embedded content - CORRECTED 2026-02-02:**

Current tier structure:
```
- **FREE**: 1 comparison/month (1 LLM)
- **NAVIGATOR ($29/mo)**: 1 comparison/month, 15min Olivia, 1 Judge, 1 Gamma
- **SOVEREIGN ($99/mo)**: 1 comparison/month (5 LLMs), 60min Olivia, Enhanced Mode
```

CSM tier table:
```
| FREE | 1 | 0 | $0 |
| NAVIGATOR | 1 | 0 | $29/month |
| SOVEREIGN | 1 (5 LLMs) | 1 | $99/month |
```

### 6. docs/manuals/EMILIA_HELP_WIDGET_PLAN.md

- Line 54: `EXPLORER` → `FREE`
- Line 55: `PIONEER` → `NAVIGATOR`
- Line 155: `PIONEER` → `NAVIGATOR`

### 7. docs/handoffs/HANDOFF_2026_0124_PRICING.md - ✅ DONE (2026-02-02)

- Line 72-74: Old pricing table ✅ FIXED

### 8. docs/handoffs/HANDOFF_20260127_VIDEO_PHASE3.md - ✅ DONE (2026-02-02)

- Line 127: `EXPLORER` → `FREE` ✅ FIXED

---

## CORRECT TIER MATRIX (Reference)

### Tier Names
| Internal ID | Display Name |
|-------------|--------------|
| `free` | FREE |
| `pro` | NAVIGATOR |
| `enterprise` | SOVEREIGN |

### Pricing
| Tier | Monthly | Annual |
|------|---------|--------|
| FREE | $0 | $0 |
| NAVIGATOR | $29 | $249 |
| SOVEREIGN | $99 | $899 |

### Features (All Per Month)
| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|------|-----------|-----------|
| LLM Providers | 1 | 1 | 5 |
| Comparisons | 1 | 1 | 1 (all 5 LLMs) |
| Olivia AI | NO | 15 min | 60 min |
| Gamma Reports | NO | 1 | 1 (all 5 LLMs) |
| Judge Verdict | NO | 1 | 1 |
| Comparison Images | NO | 1 set | 1 set |
| Enhanced Mode | NO | NO | YES |
| Cloud Sync | NO | YES | YES |
| API Access | NO | NO | YES |
| Support | NO | Chat | Phone+Video+60min tech |

---

## VERIFICATION STEPS

After all fixes:
1. Run `npm run build` - should have no TypeScript errors
2. Check PricingPage renders correctly
3. Check AskOlivia doesn't error on usage check
4. Grep for "PIONEER" - should only appear in historical context (OLIVIA_KNOWLEDGE_BASE.md)
5. Grep for "EXPLORER" - should only appear in FBI Crime Data Explorer reference

---

## FILES THAT ARE CORRECT (Do Not Change)

- `src/hooks/useTierAccess.ts` - SOURCE OF TRUTH
- `src/components/PricingModal.tsx`
- `src/components/PricingPage.tsx`
- `src/components/FeatureGate.tsx`
- `docs/PRICING_TIER_AUDIT.md` - Documents the correct structure
- `README.md` - Already has correct matrix

---

## NOTES

- Database column `olivia_messages` in `usage_tracking` table stores MINUTES not messages
- The column name mismatch is acceptable (would require migration to fix)
- `olivia_messages` TABLE (not column) is for storing chat history - this is correct
- Handoff docs are historical - ALL FIXED 2026-02-02
