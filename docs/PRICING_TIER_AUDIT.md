# LifeScore Pricing & Tier Audit

**Audit Date:** January 28, 2026
**Session ID:** LS-20260128-002
**Status:** CRITICAL - Inconsistencies Found

---

## SUMMARY OF PROBLEMS

The codebase has **massive inconsistencies** in tier naming, pricing, and feature limits across 70+ files.

---

## CURRENT (INCORRECT) STATE IN CODE

### Tier Names Found

| Location | Free Tier | Middle Tier | Top Tier |
|----------|-----------|-------------|----------|
| `useTierAccess.ts` | EXPLORER | NAVIGATOR | SOVEREIGN |
| `PricingModal.tsx` | EXPLORER | NAVIGATOR | SOVEREIGN |
| `PricingPage.tsx` | EXPLORER | NAVIGATOR | SOVEREIGN |
| `USER_MANUAL.md` | EXPLORER | **PIONEER** ❌ | SOVEREIGN |
| `CUSTOMER_SERVICE_MANUAL.md` | EXPLORER | **PIONEER** ❌ | SOVEREIGN |
| `api/emilia/manuals.ts` | Explorer | **Pioneer** ❌ | Sovereign |
| `README.md` | EXPLORER | NAVIGATOR | SOVEREIGN |

### Pricing Found

| Location | Free | Middle Tier | Top Tier |
|----------|------|-------------|----------|
| `useTierAccess.ts` | $0 | $29/mo, $249/yr | $99/mo, $899/yr |
| `PricingModal.tsx` | $0 | $29/mo, $249/yr | $99/mo, $899/yr |
| `PricingPage.tsx` | $0 | $29/mo, $249/yr | $99/mo, $899/yr |
| `USER_MANUAL.md` | Free | **$9.99/mo** ❌ | **$24.99/mo** ❌ |
| `CUSTOMER_SERVICE_MANUAL.md` | Free | **$9.99/mo** ❌ | **$24.99/mo** ❌ |
| `api/emilia/manuals.ts` | Free | **$19/mo** ❌ | **$49/mo** ❌ |
| `README.md` | $0 | $29/mo | $99/mo |
| `.env.example` | - | $29/mo | $99/mo |

### Feature Limits Found (ALL WRONG per user)

| Feature | Code (Free) | Code (Navigator) | Code (Sovereign) |
|---------|-------------|------------------|------------------|
| Standard Comparisons | 3/month | Unlimited | Unlimited |
| Enhanced Comparisons | 0 | 10/month | Unlimited |
| Olivia Messages | 5/day | 50/day | Unlimited |
| Judge Videos | 0 | 3/month | Unlimited |
| Gamma Reports | 0 | 5/month | Unlimited |
| Grok Videos | 0 | 0 | Unlimited |

---

## CORRECT STATE (Per User Requirements)

### Tier Names (CORRECT)

| Internal ID | Display Name |
|-------------|--------------|
| `free` | FREE |
| `pro` | NAVIGATOR |
| `enterprise` | SOVEREIGN |

### Pricing (NEEDS CONFIRMATION)

**User did not specify exact prices. Current code prices:**
- FREE: $0
- NAVIGATOR: $29/mo, $249/yr
- SOVEREIGN: $99/mo, $899/yr

**ASK USER: Are these prices correct?**

### Feature Limits (CORRECT per User)

#### FREE TIER
| Feature | Limit |
|---------|-------|
| LLM Providers | 1 (single) |
| City Comparisons | 1 (City A vs City B) |
| Results | Yes (basic) |
| Olivia AI | **NO** |
| Gamma Reports | **NO** |
| Judge Videos | **NO** |
| Image Generation | **NO** |
| Video Generation | **NO** |
| Customer Support | **NO** |

#### NAVIGATOR TIER
| Feature | Limit |
|---------|-------|
| LLM Providers | 1 (simple mode) |
| City Comparisons | 1 per session |
| Olivia AI | 3 conversations, 5 min each (15 min total) |
| Gamma Reports | 1 per comparison |
| Comparison Images | 1 set per comparison |
| Judge Verdict | 1 (video + summary + details + court order) |
| Comparison Shorts | 1 set |
| Customer Support | Limited (chat only) |
| All Advanced Features | Yes |

#### SOVEREIGN TIER
| Feature | Limit |
|---------|-------|
| LLM Providers | Up to 5 (Enhanced mode) |
| City Comparisons | 1 city set |
| Olivia AI | 60 minutes total |
| Gamma Reports | 1 per comparison |
| Comparison Shorts | 1 set |
| Judge Verdict | 1 (video + summary + details + court orders) |
| Tech Support | Up to 60 minutes |
| Video Support | Yes |
| Phone Support | Yes |
| Unlimited Chat | Yes |
| Enhanced Reports | Yes |

---

## FILES REQUIRING UPDATES

### Critical (Pricing/Tier Logic)

1. **`src/hooks/useTierAccess.ts`** - Lines 59-99, 448-467
   - Fix: Update TIER_LIMITS to match correct features
   - Fix: Verify TIER_PRICING matches correct amounts

2. **`src/components/PricingModal.tsx`** - Lines 44-88
   - Fix: Update PRICING_TIERS array with correct features/limits

3. **`src/components/PricingPage.tsx`** - Lines 44-95
   - Fix: Update PRICING_TIERS array with correct features/limits

4. **`src/components/FeatureGate.tsx`** - Lines 52-85
   - Fix: Update FEATURE_DESCRIPTIONS if needed

### Documentation

5. **`docs/manuals/USER_MANUAL.md`** - Lines 326, 409-421
   - Fix: Change PIONEER → NAVIGATOR
   - Fix: Update pricing table
   - Fix: Update feature limits

6. **`docs/manuals/CUSTOMER_SERVICE_MANUAL.md`** - Lines 79-111
   - Fix: Change PIONEER → NAVIGATOR
   - Fix: Update pricing table
   - Fix: Update feature limits

7. **`docs/manuals/TECHNICAL_SUPPORT_MANUAL.md`**
   - Fix: Review and update tier references

8. **`api/emilia/manuals.ts`** - Lines 112-145
   - Fix: Update embedded manual content with correct tiers/pricing

9. **`README.md`** - Lines 191-202
   - Fix: Verify pricing and limits match

10. **`docs/MASTER_README.md`**
    - Fix: Review tier references

### Legal Documents

11. **`docs/legal/TERMS_OF_SERVICE.md`**
12. **`docs/legal/REFUND_POLICY.md`**
13. **`docs/legal/DATA_RETENTION_POLICY.md`**

### Handoff Documents

14. **`docs/handoffs/HANDOFF_2026_0124_PRICING.md`**
15. **`docs/handoffs/HANDOFF_DOCUMENT.md`**
16. **`docs/handoffs/HANDOFF_FOR_AI_CONSULTANTS.md`**

### Database

17. **`supabase/migrations/002_subscriptions_and_usage.sql`**
    - Verify tier enum values

### API

18. **`api/stripe/create-checkout-session.ts`**
19. **`api/stripe/webhook.ts`**
20. **`.env.example`** - Line 80

---

## QUESTIONS FOR USER

Before fixing, I need confirmation:

1. **Pricing**: Are these correct?
   - NAVIGATOR: $29/mo, $249/yr
   - SOVEREIGN: $99/mo, $899/yr

2. **Olivia Limits**:
   - NAVIGATOR: 15 min total (3 convos × 5 min)
   - SOVEREIGN: 60 min total
   - Is this per month? Per comparison? Per session?

3. **"1 comparison"**: Does this mean per month? Per session? Ever?

4. **Gamma/Judge/Shorts**: "1 per comparison" - is this enforced per comparison or per month?

---

## NEXT STEPS

1. User confirms correct values
2. Update all 20+ files with consistent information
3. Run full build test
4. Commit all changes
5. Create compressed handoff for next session

---

## HANDOFF INSTRUCTIONS

When continuing this work:

1. Read `D:\lifescore\docs\PRICING_TIER_AUDIT.md` (this file)
2. Get user confirmation on Questions section
3. Update files in order listed above
4. Start with `useTierAccess.ts` as source of truth
5. Propagate changes to all other files
6. Run `npm run build` to verify
7. Commit with message: "fix: Standardize pricing tiers across entire codebase"
