# Data Processing Agreement (DPA) Tracker

**Clues Intelligence LTD**
**Last Updated:** January 23, 2026

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
| **OpenAI** | Olivia AI, GPT-4o | [openai.com/policies/data-processing-addendum](https://openai.com/policies/data-processing-addendum) | [x] Form submitted | 2026-01-23 | 2027-01-23 |
| **Anthropic** | Claude Sonnet/Opus | [anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms) | [x] Signed | 2026-01-23 | 2027-01-23 |
| **Google (Gemini)** | LLM Evaluation | [cloud.google.com/terms/data-processing-addendum](https://cloud.google.com/terms/data-processing-addendum) | [x] Accepted via ToS | 2026-01-23 | 2027-01-23 |
| **xAI (Grok)** | LLM Evaluation | Contact sales | [ ] Pending - Email required | - | - |
| **Perplexity** | LLM Evaluation | [perplexity.ai/privacy](https://www.perplexity.ai/privacy) | [ ] Pending - Email required | - | - |
| **D-ID** | Video Avatar | [d-id.com/privacy-policy](https://www.d-id.com/privacy-policy) | [ ] Pending - Email required | - | - |
| **Gamma** | Report Generation | Contact support | [ ] Pending - Email required | - | - |
| **Stripe** | Payments | [stripe.com/legal/dpa](https://stripe.com/legal/dpa) | [x] Accepted via ToS | 2026-01-23 | 2027-01-23 |
| **Tavily** | Web Search | Contact support | [ ] Pending - Email required | - | - |

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

---

## Notes

- Most SaaS DPAs are "click to accept" in account settings
- Enterprise plans often have custom DPA options
- Keep PDF copies of all signed DPAs
- Review when renewing contracts or changing plans

