# CLUES Intelligence LTD - Legal & Compliance Master Checklist

**Company:** Clues Intelligence LTD (United Kingdom)
**Markets:** United Kingdom, European Union, United States
**Last Updated:** January 23, 2026

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

### Section B: Internal Policies

| # | Item | Status | File | Commit | Date |
|---|------|--------|------|--------|------|
| B1 | Data Retention Policy | [x] | `DATA_RETENTION_POLICY.md` | `268ef9f` | 2026-01-23 |
| B2 | Data Breach Response Plan | [x] | `DATA_BREACH_RESPONSE_PLAN.md` | `_____` | 2026-01-23 |
| B3 | Employee Data Handling Policy | [x] | `EMPLOYEE_DATA_HANDLING_POLICY.md` | `_____` | 2026-01-23 |
| B4 | Subprocessor Management Policy | [x] | `SUBPROCESSOR_MANAGEMENT_POLICY.md` | `_____` | 2026-01-23 |

### Section C: Technical Implementation

| # | Item | Status | File/Location | Commit | Date |
|---|------|--------|---------------|--------|------|
| C1 | Cookie Consent Banner | [x] | `src/components/CookieConsent.tsx` | `7391247` | 2026-01-23 |
| C2 | "Download My Data" Feature | [x] | `api/user/export.ts` | `7391247` | 2026-01-23 |
| C3 | "Delete My Account" Feature | [x] | `api/user/delete.ts` | `7391247` | 2026-01-23 |
| C4 | Consent Logging (DB) | [x] | `supabase/migrations/`, `api/consent/log.ts` | `_____` | 2026-01-23 |
| C5 | Data Export Endpoint | [x] | `DATA_EXPORT_SPEC.md` | `_____` | 2026-01-23 |
| C6 | Privacy Policy Page in App | [x] | `src/components/LegalModal.tsx` | `46204ba` | 2026-01-23 |
| C7 | Terms Page in App | [x] | `src/components/LegalModal.tsx` | `46204ba` | 2026-01-23 |

### Section D: Regulatory Registration

| # | Item | Status | Reference | Date |
|---|------|--------|-----------|------|
| D1 | ICO Registration (UK) | [ ] | Registration #: _______ | - |
| D2 | EU Representative Appointed | [ ] | Company: _______ | - |
| D3 | DUNS Number | [ ] | #: _______ | - |

### Section E: Third-Party Agreements (DPAs)

| # | Processor | Purpose | DPA Status | Reviewed | Date |
|---|-----------|---------|------------|----------|------|
| E1 | Supabase | Database & Auth | [x] | [x] | 2026-01-23 |
| E2 | Vercel | Hosting | [x] | [x] | 2026-01-23 |
| E3 | OpenAI | Olivia AI Assistant | [x] | [x] | 2026-01-23 |
| E4 | Anthropic | Claude LLM Evaluation | [x] | [x] | 2026-01-23 |
| E5 | Google (Gemini) | LLM Evaluation | [x] | [x] | 2026-01-23 |
| E6 | xAI (Grok) | LLM Evaluation | [ ] | [ ] | - |
| E7 | Perplexity | LLM Evaluation | [ ] | [ ] | - |
| E8 | D-ID | Video Avatar | [ ] | [ ] | - |
| E9 | Gamma | Report Generation | [ ] | [ ] | - |
| E10 | Stripe | Payments | [x] | [x] | 2026-01-23 |
| E11 | Tavily | Web Search | [ ] | [ ] | - |

### Section F: US State Compliance

| # | State | Law | Requirements Met | Date |
|---|-------|-----|------------------|------|
| F1 | California | CCPA/CPRA | [ ] | - |
| F2 | Virginia | VCDPA | [ ] | - |
| F3 | Colorado | CPA | [ ] | - |
| F4 | Connecticut | CTDPA | [ ] | - |
| F5 | Utah | UCPA | [ ] | - |

---

## Quick Reference: User Rights by Jurisdiction

| Right | UK GDPR | EU GDPR | CCPA | Action Required |
|-------|---------|---------|------|-----------------|
| Access | Yes | Yes | Yes | Data Export feature |
| Rectification | Yes | Yes | Yes | Profile edit |
| Erasure | Yes | Yes | Yes | Account deletion |
| Portability | Yes | Yes | No | Data Export (JSON) |
| Opt-out of sale | No | No | Yes | "Do Not Sell" link |
| Restrict processing | Yes | Yes | No | Account settings |
| Object to processing | Yes | Yes | No | Contact form |

---

## Contact Information

- **Data Controller:** Clues Intelligence LTD
- **Registered Address:** 167-169 Great Portland Street, 5th Floor, London W1W 5PF, UK
- **Privacy Contact:** cluesnomads@gmail.com
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
| 2026-01-23 | Claude Code | DPAs: Stripe, Vercel, Google Cloud saved to dpas/ folder |

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
Contact: John E. Desautels
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels
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
Contact: John E. Desautels
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels
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
Contact: John E. Desautels
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels
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
Contact: John E. Desautels
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels
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
Contact: John E. Desautels
Email: cluesnomads@gmail.com

Thank you,
John E. Desautels
Clues Intelligence LTD
```

