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
| A1 | Privacy Policy | [x] | `PRIVACY_POLICY.md` | `_____` | 2026-01-23 |
| A2 | Terms of Service | [x] | `TERMS_OF_SERVICE.md` | `_____` | 2026-01-23 |
| A3 | Cookie Policy | [x] | `COOKIE_POLICY.md` | `_____` | 2026-01-23 |
| A4 | Acceptable Use Policy | [ ] | - | - | - |
| A5 | Refund Policy | [ ] | - | - | - |

### Section B: Internal Policies

| # | Item | Status | File | Commit | Date |
|---|------|--------|------|--------|------|
| B1 | Data Retention Policy | [x] | `DATA_RETENTION_POLICY.md` | `_____` | 2026-01-23 |
| B2 | Data Breach Response Plan | [ ] | - | - | - |
| B3 | Employee Data Handling Policy | [ ] | - | - | - |
| B4 | Subprocessor Management Policy | [ ] | - | - | - |

### Section C: Technical Implementation

| # | Item | Status | File/Location | Commit | Date |
|---|------|--------|---------------|--------|------|
| C1 | Cookie Consent Banner | [ ] | `src/components/CookieConsent.tsx` | - | - |
| C2 | "Download My Data" Feature | [ ] | `api/user/export.ts` | - | - |
| C3 | "Delete My Account" Feature | [x] | `ACCOUNT_DELETION_SPEC.md` | `_____` | 2026-01-23 |
| C4 | Consent Logging (DB) | [ ] | Supabase table | - | - |
| C5 | Data Export Endpoint | [x] | `DATA_EXPORT_SPEC.md` | `_____` | 2026-01-23 |
| C6 | Privacy Policy Page in App | [ ] | `src/pages/Privacy.tsx` | - | - |
| C7 | Terms Page in App | [ ] | `src/pages/Terms.tsx` | - | - |

### Section D: Regulatory Registration

| # | Item | Status | Reference | Date |
|---|------|--------|-----------|------|
| D1 | ICO Registration (UK) | [ ] | Registration #: _______ | - |
| D2 | EU Representative Appointed | [ ] | Company: _______ | - |
| D3 | DUNS Number | [ ] | #: _______ | - |

### Section E: Third-Party Agreements (DPAs)

| # | Processor | Purpose | DPA Status | Reviewed | Date |
|---|-----------|---------|------------|----------|------|
| E1 | Supabase | Database & Auth | [ ] | [ ] | - |
| E2 | Vercel | Hosting | [ ] | [ ] | - |
| E3 | OpenAI | Olivia AI Assistant | [ ] | [ ] | - |
| E4 | Anthropic | Claude LLM Evaluation | [ ] | [ ] | - |
| E5 | Google (Gemini) | LLM Evaluation | [ ] | [ ] | - |
| E6 | xAI (Grok) | LLM Evaluation | [ ] | [ ] | - |
| E7 | Perplexity | LLM Evaluation | [ ] | [ ] | - |
| E8 | D-ID | Video Avatar | [ ] | [ ] | - |
| E9 | Gamma | Report Generation | [ ] | [ ] | - |
| E10 | Stripe | Payments | [ ] | [ ] | - |
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

## Contact Information (Update Before Launch)

- **Data Controller:** Clues Intelligence LTD
- **Registered Address:** [TO BE ADDED]
- **Privacy Contact:** privacy@cluesintelligence.com
- **DPO (if appointed):** [TO BE ADDED]
- **EU Representative:** [TO BE APPOINTED]

---

## Document Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-23 | Claude Code | Initial creation, documents A1-A3, B1, C3, C5 |

