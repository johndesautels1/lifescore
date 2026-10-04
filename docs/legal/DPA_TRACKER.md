# Data Processing Agreement (DPA) Tracker

**Clues Intelligence LTD**
**Last Updated:** 3 October 2026 (suppliers added; signed statuses unchanged)

---

## Instructions

For each processor:
1. Locate their DPA (usually in legal/privacy section of their site)
2. Sign/accept the DPA
3. Save a copy to `/docs/legal/dpas/` folder
4. Update status below

---

## DPA Status

| Processor | Service | DPA Location | Status | Signed Date | Review Date |
|-----------|---------|--------------|--------|-------------|-------------|
| **Supabase** | Database, Auth | [supabase.com/legal/dpa](https://supabase.com/legal/dpa) | [x] Signed via PandaDoc | 2026-01-23 | 2027-01-23 |
| **Vercel** | Hosting | [vercel.com/legal/dpa](https://vercel.com/legal/dpa) | [x] Accepted via ToS | 2026-01-23 | 2027-01-23 |
| **OpenAI** | GPT evaluator; back-up voice (Olivia moved to Anthropic, Oct 2026) | [openai.com/policies/data-processing-addendum](https://openai.com/policies/data-processing-addendum) | [x] Form submitted | 2026-01-23 | 2027-01-23 |
| **Anthropic** | Claude evaluator, judge, Olivia, Emilia | [anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms) | [x] Signed | 2026-01-23 | 2027-01-23 |
| **Google (Gemini)** | LLM Evaluation | [cloud.google.com/terms/data-processing-addendum](https://cloud.google.com/terms/data-processing-addendum) | [x] Accepted via ToS | 2026-01-23 | 2027-01-23 |
| **xAI (Grok)** | LLM Evaluation | Contact sales | [~] Requested via email | 2026-02-28 | - |
| **Perplexity** | LLM Evaluation | Trust Center: Enterprise DPA | [~] Requested / downloading | 2026-02-28 | - |
| **D-ID** | Video Avatar | [d-id.com/privacy-policy](https://www.d-id.com/privacy-policy) | [~] Requested via email | 2026-02-28 | - |
| **Gamma** | Report Generation | Contact support | [~] Requested via email | 2026-02-28 | - |
| **Stripe** | Payments | [stripe.com/legal/dpa](https://stripe.com/legal/dpa) | [x] Accepted via ToS | 2026-01-23 | 2027-01-23 |
| **Tavily** | Web Search | Contact support | [~] Requested via email | 2026-02-28 | - |
| **HeyGen** (incl. LiveAvatar) | Olivia's live face and videos; Cristiano's videos and films | To locate on the vendor's legal page | [ ] Not recorded | - | - |
| **ElevenLabs** | Voices | To locate on the vendor's legal page | [ ] Not recorded | - | - |
| **Simli** | Back-up live face for Olivia | Contact support | [ ] Not recorded | - | - |
| **Replicate** | Back-up judge videos, city clips and pictures | To locate on the vendor's legal page | [ ] Not recorded | - | - |
| **fal.ai** (Kling 3) | City video clips (no personal data) | Referenced from fal's terms of service (fal.ai/legal/terms-of-service) | [ ] Not recorded | - | - |
| **InVideo** | Moving Movies films (no personal data) | Contact support | [ ] Not recorded | - | - |
| **Resend** | Email | To locate on the vendor's legal page | [ ] Not recorded | - | - |
| **Flagpedia** (flagcdn.com) | Flag images fetched by the browser (sees IP address) | flagpedia.net | [ ] Not recorded — likely no DPA available; consider serving flags from our own site | - | - |

> Rows added 2026-10-03 for every supplier the code calls (the register is `src/legal/subProcessors.ts`; `tests/complianceDocs.test.ts` fails if one is missing here). "Not recorded" means no agreement is on file in this folder, not that none exists — update the row when it is signed. On 2026-10-04 fal.ai replaced Kling AI: city clips are now made with Kling 3 through fal, and nothing is sent to Kling's own service.

---

## Required DPA Terms (Verify Each Contains)

- [ ] Processor only acts on our instructions
- [ ] Confidentiality obligations
- [ ] Security measures documented
- [ ] Sub-processor notification/approval
- [ ] Assistance with data subject requests
- [ ] Deletion/return of data on termination
- [ ] Audit rights
- [ ] International transfer mechanisms (SCCs)

---

## Action Items

1. [x] Create `/docs/legal/dpas/` folder for signed copies - DONE 2026-01-23
2. [ ] Sign Supabase DPA (critical - primary database) - Requires PandaDoc in dashboard
3. [x] Sign Stripe DPA (critical - payment processing) - Accepted via ToS, saved to dpas/
4. [~] Sign OpenAI DPA (high - Olivia conversations stored) - Form in progress
5. [~] Review and sign remaining DPAs - Emails sent to 5 vendors
6. [ ] Set calendar reminder for annual review

## Saved DPA Documents

| File | Vendor | Date |
|------|--------|------|
| `dpas/stripe-dpa.md` | Stripe | 2026-01-23 |
| `dpas/vercel-dpa.md` | Vercel | 2026-01-23 |
| `dpas/google-cloud-dpa.md` | Google Cloud | 2026-01-23 |
| `dpas/Anthropic_DPA_Feb2025.docx` | Anthropic | in folder (recorded 2026-10-03) |
| `dpas/Data Processing Agreement (Clues Intelligence LTD and OpenAI).pdf` | OpenAI | in folder (recorded 2026-10-03) |
| `dpas/Supabase User DPA (August 5, 2025).pdf` | Supabase | in folder (recorded 2026-10-03) |

---

## Notes

- Most SaaS DPAs are "click to accept" in account settings
- Enterprise plans often have custom DPA options
- Keep PDF copies of all signed DPAs
- Review when renewing contracts or changing plans

