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
5. `docs/manuals/USER_MANUAL.md` - Change PIONEER→NAVIGATOR, fix limits
6. `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` - Change PIONEER→NAVIGATOR, fix limits
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

## WHAT'S WRONG NOW

- Manuals say "PIONEER" - should be "NAVIGATOR"
- Manuals say "$9.99/$24.99" - should be "$29/$99"
- Code says "3 comparisons/month free" - should be "1"
- Code says "unlimited comparisons for paid" - should be "1/month"
- Code says "50 Olivia messages/day" - should be "15 min/month" or "60 min/month"
- Everything uses wrong per-unit limits

---

## NEXT AGENT INSTRUCTIONS

1. Start with `src/hooks/useTierAccess.ts` - update TIER_LIMITS to match matrix above
2. Propagate to PricingModal.tsx, PricingPage.tsx, FeatureGate.tsx
3. Fix all manuals: PIONEER→NAVIGATOR, update all limit numbers
4. Fix api/emilia/manuals.ts embedded content
5. Run `npm run build` to verify
6. Commit: "fix: Standardize pricing tiers across codebase"
