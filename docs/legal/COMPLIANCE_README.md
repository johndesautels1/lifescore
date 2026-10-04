# CLUES Intelligence LTD - Legal & Compliance Master Checklist

**Company:** Clues Intelligence LTD (United Kingdom)
**Markets:** United Kingdom, European Union, United States
**Last Updated:** 3 October 2026

---

## CLAUDE CODE INSTRUCTIONS

**When working on compliance tasks:**
1. Mark items `[x]` when COMPLETED with date
2. Mark items `[~]` when IN PROGRESS
3. Add commit hash when documents are created/updated
4. Update "Last Updated" date at top of this file
5. Keep all legal documents in `/docs/legal/`

---

## Product Scope

### Current Product
- **LIFE SCORE** - 100 freedom metrics comparison for cities

### Planned Expansion (Documents Must Scale For)
| Product | Metrics | Status |
|---------|---------|--------|
| LIFE SCORE | Freedom & Legal | Active |
| FAITH SCORE | Religion & Spirituality | Planned |
| VOTE SCORE | Politics & Governance | Planned |
| PLAY SCORE | Parks & Recreation | Planned |
| GREEN SCORE | Environment & Sustainability | Planned |
| WORK SCORE | Employment & Economy | Planned |
| LEARN SCORE | Education & Schools | Planned |
| HEALTH SCORE | Healthcare & Wellness | Planned |
| SAFE SCORE | Crime & Safety | Planned |
| COST SCORE | Cost of Living | Planned |
| CONNECT SCORE | Internet & Infrastructure | Planned |
| CULTURE SCORE | Arts & Entertainment | Planned |
| FOOD SCORE | Dining & Cuisine | Planned |
| TRANSIT SCORE | Transportation | Planned |
| WEATHER SCORE | Climate & Weather | Planned |
| SOCIAL SCORE | Community & Demographics | Planned |
| STARTUP SCORE | Entrepreneurship | Planned |
| RETIRE SCORE | Retirement Living | Planned |
| FAMILY SCORE | Family-Friendliness | Planned |
| EXPAT SCORE | International Relocation | Planned |

**All documents use "CLUES Comparison Reports" or "the Service" to cover all products.**

---

## COMPLIANCE CHECKLIST

### Section A: Required Public Documents

| # | Item | Status | File | Commit | Date |
|---|------|--------|------|--------|------|
| A1 | Privacy Policy | [x] | `PRIVACY_POLICY.md` | `268ef9f` | 2026-01-23 |
| A2 | Terms of Service | [x] | `TERMS_OF_SERVICE.md` | `268ef9f` | 2026-01-23 |
| A3 | Cookie Policy | [x] | `COOKIE_POLICY.md` | `268ef9f` | 2026-01-23 |
| A4 | Acceptable Use Policy | [x] | `ACCEPTABLE_USE_POLICY.md` | `_____` | 2026-01-23 |
| A5 | Refund Policy | [x] | `REFUND_POLICY.md` | `_____` | 2026-01-23 |
| A6 | Do Not Sell or Share | [x] | `DO_NOT_SELL_OR_SHARE.md` | `4d70286` | 2026-10-03 |
| A7 | US State Privacy Rights | [x] | `US_STATE_PRIVACY_RIGHTS.md` | `4d70286` | 2026-10-03 |

**Since 2026-10-03 all seven pages (A1–A7) are generated from `src/legal/legalContent.ts`** — the words the app shows — by `node scripts/build-legal-docs.mjs`, effective 3 October 2026 (commit `4d70286`). Never edit those seven files by hand; `tests/legalContent.test.ts` fails if they differ from the app.

### Section B: Internal Policies

| # | Item | Status | File | Commit | Date |
|---|------|--------|------|--------|------|
| B1 | Data Retention Policy | [x] | `DATA_RETENTION_POLICY.md` | rewritten to the code | 2026-10-03 |
| B2 | Data Breach Response Plan | [x] | `DATA_BREACH_RESPONSE_PLAN.md` | `_____` | 2026-01-23 |
| B3 | Employee Data Handling Policy | [x] | `EMPLOYEE_DATA_HANDLING_POLICY.md` | `_____` | 2026-01-23 |
| B4 | Subprocessor Management Policy | [x] | `SUBPROCESSOR_MANAGEMENT_POLICY.md` (register: `src/legal/subProcessors.ts`) | v1.1 | 2026-10-03 |
| B5 | IP Assignment Deed (Founder → Company) | [x] | `IP_ASSIGNMENT_DEED.md` | `_____` | 2026-02-28 |

### Section C: Technical Implementation

| # | Item | Status | File/Location | Commit | Date |
|---|------|--------|---------------|--------|------|
| C1 | Cookie Consent Banner | [x] | `src/components/CookieConsent.tsx` | `7391247` | 2026-01-23 |
| C2 | "Download My Data" Feature | [x] | `api/user/export.ts` (every user table) + Settings → Data button | `f617ee5`, `31cafb9` | 2026-10-03 |
| C3 | "Delete My Account" Feature | [x] | `api/user/delete.ts` (cancels Stripe first, removes files, then the account) + Settings → Data button | `9a3f920`, `31cafb9` | 2026-10-03 |
| C4 | Consent Logging (DB) | [x] | `supabase/migrations/`, `api/consent/log.ts` | `_____` | 2026-01-23 |
| C5 | Data Export / Deletion specifications | [x] | `DATA_EXPORT_SPEC.md`, `ACCOUNT_DELETION_SPEC.md` (v2.0, the built design) | rewritten | 2026-10-03 |
| C6 | Privacy Policy Page in App | [x] | `src/components/LegalModal.tsx` | `46204ba` | 2026-01-23 |
| C7 | Terms Page in App | [x] | `src/components/LegalModal.tsx` | `46204ba` | 2026-01-23 |
| C8 | Legal pages from one source, engine look | [x] | `src/legal/*`, `src/components/LegalModal.tsx` | `4d70286`, `89f1dbd` | 2026-10-03 |
| C9 | Cancel / manage subscription door | [x] | Settings → Subscription → Manage Subscription | `3b714ed` | 2026-10-03 |
| C10 | Fonts served from our own site (no Google) | [x] | `public/fonts/`, `src/styles/fonts.css` | `29aa3ef` | 2026-10-03 |

**Note (2026-10-03):** C2 and C3 were marked done in January but did not work: the deletion route crashed on every call and never cancelled billing; the export covered six tables; neither had a button. Both now work and are tested (`tests/privacyRoutes.test.ts`).

### Section D: Regulatory Registration

| # | Item | Status | Reference | Date |
|---|------|--------|-----------|------|
| D1 | ICO Registration (UK) | [x] | App C1885368 / Security CSN7726118 | 2026-02-28 |
| D2 | EU Representative Appointed | [x] | N/A — Not required (UK company post-Brexit) | 2026-02-28 |
| D3 | DUNS Number | [x] | D-U-N-S #: 234489716 | 2026-02-28 |

### Section E: Third-Party Agreements (DPAs)

| # | Processor | Purpose | DPA Status | Reviewed | Date |
|---|-----------|---------|------------|----------|------|
| E1 | Supabase | Database & Auth | [x] | [x] | 2026-01-23 |
| E2 | Vercel | Hosting | [x] | [x] | 2026-01-23 |
| E3 | OpenAI | GPT evaluation; back-up voice | [x] | [x] | 2026-01-23 |
| E4 | Anthropic | Evaluation, judge, Olivia, Emilia | [x] | [x] | 2026-01-23 |
| E5 | Google (Gemini) | LLM Evaluation | [x] | [x] | 2026-01-23 |
| E6 | xAI (Grok) | LLM Evaluation | [~] | [ ] | Requested 2026-02-28 |
| E7 | Perplexity | LLM Evaluation | [~] | [ ] | Requested 2026-02-28 |
| E8 | D-ID | Video Avatar | [~] | [ ] | Requested 2026-02-28 |
| E9 | Gamma | Report Generation | [~] | [ ] | Requested 2026-02-28 |
| E10 | Stripe | Payments | [x] | [x] | 2026-01-23 |
| E11 | Tavily | Web Search | [~] | [ ] | Requested 2026-02-28 |
| E12 | HeyGen (incl. LiveAvatar) | Avatar faces, videos, films | [ ] | [ ] | Not recorded |
| E13 | ElevenLabs | Voices | [ ] | [ ] | Not recorded |
| E14 | Simli | Back-up live face | [ ] | [ ] | Not recorded |
| E15 | Replicate | Back-up videos, clips, pictures | [ ] | [ ] | Not recorded |
| E16 | fal.ai (Kling 3) | City clips (no personal data); replaced Kling AI on 2026-10-04 | [ ] | [ ] | Not recorded |
| E17 | InVideo | Films (no personal data) | [ ] | [ ] | Not recorded |
| E18 | Resend | Email | [ ] | [ ] | Not recorded |
| E19 | Flagpedia (flagcdn.com) | Flag images (sees IP) | [ ] | [ ] | Not recorded |

Full detail and agreement links: `DPA_TRACKER.md`.

### Section F: US State Compliance

| # | State | Law | Requirements Met | Date |
|---|-------|-----|------------------|------|
| F1 | California | CCPA/CPRA | [x] | 2026-02-28 |
| F2 | Virginia | VCDPA | [x] | 2026-02-28 |
| F3 | Colorado | CPA | [x] | 2026-02-28 |
| F4 | Connecticut | CTDPA | [x] | 2026-02-28 |
| F5 | Utah | UCPA | [x] | 2026-02-28 |

### Section G: Intellectual Property & Trademarks

| # | Item | Status | File/Reference | Date |
|---|------|--------|----------------|------|
| G1 | IP Assignment Deed (Founder → Company) | [x] | `IP_ASSIGNMENT_DEED.md` (READY TO SIGN) | 2026-02-28 |
| G2 | Trademark: CLUES | [ ] | UK IPO — Not filed | — |
| G3 | Trademark: LIFE SCORE | [ ] | UK IPO — Not filed | — |
| G4 | Trademark: SMART | [ ] | UK IPO — Not filed | — |
| G5 | Trademark: CLUES (US) | [ ] | USPTO — Not filed | — |
| G6 | Trademark: LIFE SCORE (US) | [ ] | USPTO — Not filed | — |
| G7 | Trademark: SMART (US) | [ ] | USPTO — Not filed | — |
| G8 | Trademark Strategy Document | [x] | `TRADEMARK_STRATEGY.md` | 2026-02-28 |

**Full strategy:** `docs/legal/TRADEMARK_STRATEGY.md`
**Priority:** File G2–G4 (UK) first (~£660 total), then G5–G7 (US) when revenue starts (~$1,500 total)
**Prerequisite:** Sign IP Assignment Deed (G1) before filing any trademark applications

---

## Quick Reference: User Rights by Jurisdiction

| Right | UK GDPR | EU GDPR | CCPA | Action Required |
|-------|---------|---------|------|-----------------|
| Access | Yes | Yes | Yes | Settings → Data → Download My Data |
| Rectification | Yes | Yes | Yes | Settings → Profile |
| Erasure | Yes | Yes | Yes | Settings → Data → Delete My Account |
| Portability | Yes | Yes | No | Data Export (JSON) |
| Opt-out of sale | No | No | Yes | "Do Not Sell" link |
| Restrict processing | Yes | Yes | No | Request to the privacy contact |
| Object to processing | Yes | Yes | No | Contact form |

---

## Contact Information

- **Data Controller:** Clues Intelligence LTD
- **Registered Address:** 167-169 Great Portland Street, 5th Floor, London W1W 5PF, UK
- **Privacy Contact:** info@cluesintelligence.com (the contact on every legal page — John, 2026-10-03)
- **Admin Contact:** cluesnomads@gmail.com
- **DPO:** Not required (below threshold)
- **EU Representative:** Not required (UK company post-Brexit)

---

## Document Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-23 | Claude Code | Initial creation, documents A1-A3, B1, C3, C5 |
| 2026-01-23 | Claude Code | Added LegalModal component (C6, C7), footer links |
| 2026-01-23 | Claude Code | Cookie Consent (C1), Delete API (C3), Export API (C2) |
| 2026-01-23 | Claude Code | Acceptable Use (A4), Refund Policy (A5) - Section A complete |
| 2026-01-23 | Claude Code | Breach Plan (B2), Employee Policy (B3), Subprocessor (B4) - Section B complete |
| 2026-01-23 | Claude Code | Consent Logging (C4) - Section C complete |
| 2026-02-28 | Claude Opus 4.6 | CCPA/CPRA compliance (F1): Do Not Sell link, opt-out modal, consent logging, Privacy Policy update, all 5 Emilia manuals updated |
| 2026-02-28 | Claude Opus 4.6 | US State Privacy Rights (F2-F5): VA/CO/CT/UT full disclosures in Privacy Policy, new StatePrivacyContent in LegalModal, footer link, Legal Compliance Manual updated |
| 2026-02-28 | Claude Opus 4.6 | Trademark Strategy (G2-G8): Full trademark strategy doc, Section G added to checklist, Legal Compliance Manual Section 7B, CS Manual Section 6.7 |
| 2026-02-28 | Claude Opus 4.6 | IP Assignment Deed (B5): Founder-to-company IP assignment, all products/personas/code covered |
| 2026-01-23 | Claude Code | DPAs: Stripe, Vercel, Google Cloud saved to dpas/ folder |
| 2026-10-03 | Claude Opus 5.5 | Legal pages from one source (A1–A7), engine look; deletion and export made to work with Settings doors (C2, C3); Manage Subscription door (C9); fonts self-hosted (C10); retention policy and specs rewritten to the code (B1, C5); register in one place (B4); suppliers E12–E19 added |

---

## DPA Request Email Templates

**Send to vendors that require email requests:**

### D-ID (support@d-id.com)
**Subject:** DPA Request - Clues Intelligence LTD

```
Hello,

We are Clues Intelligence LTD, a UK-registered company using D-ID's
video avatar services.

Under UK GDPR and EU GDPR, we require a signed Data Processing
Agreement (DPA) with all third-party processors handling personal data.

Please provide your standard DPA for execution, or direct us to
where we can access and sign it.

Company: Clues Intelligence LTD
Country: United Kingdom
Contact: John E. Desautels II
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels II
Clues Intelligence LTD
```

### xAI / Grok (support@x.ai)
**Subject:** DPA Request - Clues Intelligence LTD (Grok API)

```
Hello,

We are Clues Intelligence LTD, a UK-registered company using the
Grok API for LLM evaluation services.

Under UK GDPR and EU GDPR, we require a signed Data Processing
Agreement (DPA) with all third-party processors handling personal data.

Please provide your standard DPA for execution, or direct us to
where we can access and sign it.

Company: Clues Intelligence LTD
Country: United Kingdom
Contact: John E. Desautels II
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels II
Clues Intelligence LTD
```

### Perplexity (support@perplexity.ai)
**Subject:** DPA Request - Clues Intelligence LTD (API Customer)

```
Hello,

We are Clues Intelligence LTD, a UK-registered company using the
Perplexity API (Sonar) for search services.

Under UK GDPR and EU GDPR, we require a signed Data Processing
Agreement (DPA) with all third-party processors handling personal data.

Please provide your standard DPA for execution, or direct us to
where we can access and sign it.

Company: Clues Intelligence LTD
Country: United Kingdom
Contact: John E. Desautels II
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels II
Clues Intelligence LTD
```

### Gamma (support@gamma.app)
**Subject:** DPA Request - Clues Intelligence LTD

```
Hello,

We are Clues Intelligence LTD, a UK-registered company using Gamma
for report generation services.

Under UK GDPR and EU GDPR, we require a signed Data Processing
Agreement (DPA) with all third-party processors handling personal data.

Please provide your standard DPA for execution, or direct us to
where we can access and sign it.

Company: Clues Intelligence LTD
Country: United Kingdom
Contact: John E. Desautels II
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels II
Clues Intelligence LTD
```

### Tavily (support@tavily.com)
**Subject:** DPA Request - Clues Intelligence LTD (API Customer)

```
Hello,

We are Clues Intelligence LTD, a UK-registered company using the
Tavily API for web search services.

Under UK GDPR and EU GDPR, we require a signed Data Processing
Agreement (DPA) with all third-party processors handling personal data.

Please provide your standard DPA for execution, or direct us to
where we can access and sign it.

Company: Clues Intelligence LTD
Country: United Kingdom
Contact: John E. Desautels II
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels II
Clues Intelligence LTD
```

