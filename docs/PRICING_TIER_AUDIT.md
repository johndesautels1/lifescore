# LifeScore Pricing & Tier Audit

**Audit Date:** January 28, 2026
**Session ID:** LS-20260128-002
**Status:** CONFIRMED - Ready to Fix

---

## CORRECT TIER STRUCTURE (CONFIRMED)

All limits are **PER MONTH**.

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

---

## FEATURE MATRIX (CONFIRMED)

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|------|-----------|-----------|
| **LLM Providers** | 1 | 1 (simple) | 5 (enhanced) |
| **Comparisons/month** | 1 | 1 | 1 (with all 5 LLMs) |
| **Olivia AI** | NO | 15 min (3×5min) | 60 min |
| **Gamma Reports** | NO | 1/month | 1/month (all 5 LLMs) |
| **Comparison Images** | NO | 1 set/month | 1 set/month |
| **Judge Verdict** | NO | 1/month (video+summary+details+court order) | 1/month |
| **Comparison Shorts** | NO | 1 set/month | 1 set/month |
| **Customer Support** | NO | Chat only | Phone + Video + 60min tech |
| **Enhanced Mode** | NO | NO | YES |

---

## FILES TO UPDATE (20+)

1. `src/hooks/useTierAccess.ts` - SOURCE OF TRUTH
2. `src/components/PricingModal.tsx`
3. `src/components/PricingPage.tsx`
4. `src/components/FeatureGate.tsx`
5. `docs/manuals/USER_MANUAL.md` - ✅ DONE (uses NAVIGATOR)
6. `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` - ✅ DONE (uses NAVIGATOR)
7. `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md`
8. `api/emilia/manuals.ts` - Fix embedded content
9. `README.md`
10. `docs/MASTER_README.md`
11. `docs/legal/TERMS_OF_SERVICE.md`
12. `docs/legal/REFUND_POLICY.md`
13. `docs/handoffs/*.md`
14. `.env.example`
15. Stripe API files

---

## WHAT'S BEEN FIXED (As of 2026-02-02)

- ✅ Manuals now use "NAVIGATOR" (not "PIONEER")
- ✅ Manuals now use "$29/$99" pricing
- ✅ Code says "1 comparison/month" for all tiers
- ✅ Olivia uses minutes per month (15min/60min)
- ✅ All tier limits corrected in useTierAccess.ts

---

## STATUS: ✅ COMPLETED (2026-02-02)

All tier naming and limits have been standardized:
- `src/hooks/useTierAccess.ts` - ✅ SOURCE OF TRUTH
- `src/components/PricingModal.tsx` - ✅ Uses NAVIGATOR
- `src/components/PricingPage.tsx` - ✅ Uses NAVIGATOR
- `docs/manuals/USER_MANUAL.md` - ✅ Uses NAVIGATOR
- `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` - ✅ Uses NAVIGATOR
