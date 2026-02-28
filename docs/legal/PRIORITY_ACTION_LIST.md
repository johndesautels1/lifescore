# Clues Intelligence LTD — Priority Action List

**Company:** Clues Intelligence LTD (United Kingdom)
**Owner:** John E. Desautels II
**Created:** 2026-02-28
**Last Updated:** 2026-02-28

---

## Priority Action List

| Priority | Action | Cost | Time |
|----------|--------|------|------|
| **NOW** | ICO Registration (UK Data Protection) | ~£40/yr | 1 day |
| **NOW** | Send 5 pending DPA emails (xAI, Perplexity, D-ID, Gamma, Tavily) | Free | 1 hour |
| **Before launch** | Trademark LIFE SCORE + CLUES Intelligence (UK IPO) | ~£340 | 4-6 months processing |
| **Before EU marketing** | Appoint EU Representative | ~£200/mo | 1 week |
| ~~Before US marketing~~ | ~~CCPA "Do Not Sell" opt-out implementation~~ | ~~Dev time~~ | **DONE 2026-02-28** |
| **Before enterprise sales** | Enterprise SaaS Agreement | Lawyer review ~£500-1000 | 2-4 weeks |
| **Housekeeping** | IP assignment resolution | Free (self-done) | 1 hour |

---

## Details

### 1. ICO Registration (NOW)
- **Authority:** Information Commissioner's Office (ico.org.uk)
- **Why:** Legal requirement for any UK company processing personal data
- **Status:** NOT DONE (compliance checklist item D1)

### 2. Send 5 Pending DPA Emails (NOW)
- **Templates ready in:** `docs/legal/COMPLIANCE_README.md`
- **Recipients:**
  - xAI / Grok (support@x.ai)
  - Perplexity (support@perplexity.ai)
  - D-ID (support@d-id.com)
  - Gamma (support@gamma.app)
  - Tavily (support@tavily.com)
- **Status:** Templates written, emails not yet sent

### 3. Trademark LIFE SCORE + CLUES Intelligence (Before Launch)
- **Authority:** UK IPO (Intellectual Property Office)
- **Classes:** Class 42 (SaaS/software) + Class 9 (downloadable software)
- **Cost:** ~£170 first class + £50 per additional class × 2 marks
- **Processing:** 4-6 months (file early)

### 4. Appoint EU Representative (Before EU Marketing)
- **Why:** Required under EU GDPR for non-EU companies offering services to EU residents
- **Status:** NOT DONE (compliance checklist item D2)

### 5. CCPA "Do Not Sell" Opt-Out — COMPLETED 2026-02-28
- **Status:** DONE
- **What was built:**
  - "Do Not Sell or Share My Personal Information" link added to site footer
  - Full CCPA opt-out page in LegalModal with one-click opt-out button
  - Consent logging extended to support `ccpa_dns` type
  - Supabase migration with CCPA reporting index + `ccpa_dns_optouts` view
  - Privacy Policy updated with full CCPA/CPRA disclosure tables
  - All 5 Emilia manuals updated (User, CS, Tech/Schema, Legal, License)
  - Compliance checklist item F1 marked complete

### 6. Enterprise SaaS Agreement (Before Enterprise Sales)
- **Why:** Enterprise clients will require formal SaaS agreements with SLAs, liability caps, indemnification
- **Recommended:** Have a lawyer review before offering to enterprise customers

### 7. IP Assignment Resolution (Housekeeping)
- **Why:** Ensure all IP created by sole founder is formally assigned to Clues Intelligence LTD
- **How:** Self-executed IP assignment deed (sole founder to company)
- **Cost:** Free if self-done

---

## Trademarks to File (Full List, When Budget Allows)

### UK IPO
- LIFE SCORE™
- CLUES Intelligence™
- Olivia™ (Client-Facing AI Expert)
- Cristiano™ (AI Opus Judge)
- Emilia™ (AI Architect & Troubleshooter)
- All 19 "[NAME] SCORE" product variations

### USPTO (US Market)
- Same marks as above for US federal protection
- ~$250-$350 per class per mark
- File after UK marks are secured

---

## Cross-Reference

- **Master compliance checklist:** `docs/legal/COMPLIANCE_README.md`
- **DPA tracker:** `docs/legal/DPA_TRACKER.md`
- **DPA email templates:** Bottom of `COMPLIANCE_README.md`
- **Signed DPAs:** `docs/legal/dpas/`
- **LICENSE file:** `/LICENSE`
