# LIFE SCORE - Legal Compliance Manual

**Document Version:** 1.4
**Last Updated:** February 28, 2026
**Classification:** INTERNAL - Admin Access Only

---

## Company Information

### Registered Entity

**Company Name:** Clues Intelligence LTD
**Company Number:** 16966151
**Registered Address:**
167-169 Great Portland Street
5th Floor
London W1W 5PF
United Kingdom

**Company Type:** UK Limited Company
**D-U-N-S Number:** 234489716
**Admin Contact:** cluesnomads@gmail.com

---

## Section 1: Regulatory Registration Status

### 1.1 ICO Registration (UK)

| Item | Status | Details |
|------|--------|---------|
| **Registration Required** | YES | UK-based company processing personal data |
| **Registration URL** | https://ico.org.uk/for-organisations/register/ |
| **Annual Fee** | ~£40-60 | Depends on organization size |
| **Application Number** | **C1885368** | Submitted 2026-02-28 |
| **Security Number** | **CSN7726118** | Quote this + reference number when contacting ICO |
| **ICO Helpline** | 0303 123 1113 | Quote security number when calling |
| **Registration Status** | REGISTERED | Confirmed 2026-02-28 |

**Action Required:**
1. ~~Go to ico.org.uk~~ DONE
2. ~~Complete Data Protection Fee registration~~ DONE — Application C1885368
3. ~~Receive security number~~ DONE — CSN7726118
4. Pay annual fee (upon invoice)
5. Display registration number in Privacy Policy (once issued)

### 1.2 EU Representative

| Item | Status | Details |
|------|--------|---------|
| **Required** | NO | UK company post-Brexit - EU Rep not required |
| **Notes** | N/A | If serving EU customers directly, revisit this |

### 1.3 DUNS Number

| Item | Status | Details |
|------|--------|---------|
| **D-U-N-S Number** | **234489716** | Registered with Dun & Bradstreet |
| **Status** | OBTAINED | Active |
| **Use Cases** | Enterprise B2B, business credit, vendor verification | Not required for consumer SaaS but good to have |

---

## Section 2: GDPR Compliance

### 2.1 Data We Collect

| Data Type | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| Email address | Account creation, authentication | Contract performance | Until account deletion |
| Name | Personalization | Contract performance | Until account deletion |
| Password (hashed) | Authentication | Contract performance | Until account deletion |
| City comparisons | Service delivery | Contract performance | Until account deletion |
| Olivia conversations | AI advisor chat history | Contract performance | Until account deletion |
| Emilia help chat | Help assistant sessions | Contract performance | Session-based (browser only) |
| Court Order videos | Judge verdict videos (Supabase Storage) | Contract performance | Until account deletion |
| App prompts | System prompt references (admin-editable) | Legitimate interest | Permanent |
| Payment info | Billing (via Stripe) | Contract performance | Per Stripe retention |
| IP address | Security, rate limiting | Legitimate interest | 90 days |
| Usage analytics | Service improvement | Legitimate interest | Anonymized after 30 days |

### 2.2 Data Subject Rights

We must honor these GDPR rights:

| Right | Implementation | Endpoint |
|-------|----------------|----------|
| **Right to Access** | User can export all data | `/api/user/export` |
| **Right to Deletion** | User can delete account (timeout safety net) | `/api/user/delete` |
| **Right to Rectification** | User can update profile | Settings page |
| **Right to Portability** | JSON export available | `/api/user/export` |
| **Right to Object** | Can opt out of analytics | Cookie settings |

**GDPR Delete Endpoint — Timeout Safety Net (2026-02-14):**
The `/api/user/delete` GDPR Right to Erasure endpoint now includes a timeout safety net to prevent hanging requests. This ensures the deletion process completes within Vercel serverless function limits (default 10s for Hobby, 60s for Pro). If any individual deletion step (profiles, comparisons, conversations, videos, reports, storage) exceeds the timeout, the request still returns a partial-success response rather than hanging indefinitely.

### 2.3 Data Processing Agreements (DPAs)

| Vendor | Service | DPA Status | Notes |
|--------|---------|------------|-------|
| Supabase | Database, Auth | SIGNED | Included in Terms |
| Stripe | Payments | SIGNED | Stripe DPA auto-accepted |
| OpenAI | GPT-4o Evaluation | SIGNED | Via API Terms |
| Anthropic | Claude Evaluation | SIGNED | Via API Terms |
| Google | Gemini Evaluation | PENDING | Email required |
| xAI (Grok) | Grok Evaluation | PENDING | Email required |
| Perplexity | LLM Evaluation | PENDING | Email required |
| D-ID | Video Avatar | PENDING | Email required |
| HeyGen | Gamma Report Video Presenter | PENDING | Email required |
| Tavily | Web Search | PENDING | Email required |
| ElevenLabs | Text-to-Speech | SIGNED | Via Terms |
| Gamma | Report Generation | PENDING | Email required |
| InVideo | Moving Movie Generation (10-min cinematic via MCP) | PENDING | Email required |
| Kling AI | Video Generation | PENDING | Email required |
| Replicate | Video Generation (Minimax fallback) | PENDING | Email required |
| Simli | Avatar Video (WebRTC) | PENDING | Email required |
| Resend | Email Notifications | SIGNED | Via Terms |
| Vercel | Hosting | SIGNED | Via Terms |

**DPA Request Email Template:**
```
Subject: Data Processing Agreement Request - Clues Intelligence LTD

Dear [Vendor] Legal/Privacy Team,

We are Clues Intelligence LTD, a UK-registered company using [Service Name]
for our LIFE SCORE application.

We process personal data of EU/UK residents and require a Data Processing
Agreement (DPA) compliant with UK GDPR and EU GDPR.

Please provide:
1. Your standard DPA, or
2. Confirmation that DPA terms are included in your Terms of Service

Our Details:
- Company: Clues Intelligence LTD
- Address: 167-169 Great Portland Street, 5th Floor, London W1W 5PF
- Contact: cluesnomads@gmail.com
- Use Case: [Brief description of how we use the service]

Thank you for your assistance.

Best regards,
Clues Intelligence LTD
```

---

## Section 3: US State Compliance

### 3.1 Applicability Thresholds

These laws only apply when you exceed thresholds:

| State | Law | Revenue Threshold | Consumer Threshold | Status |
|-------|-----|-------------------|-------------------|--------|
| California | CCPA/CPRA | $25M+ | 100K+ consumers | **IMPLEMENTED** |
| Virginia | VCDPA | $25M+ | 100K+ consumers | **IMPLEMENTED** |
| Colorado | CPA | N/A | 100K+ consumers | **IMPLEMENTED** |
| Connecticut | CTDPA | $25M+ | 100K+ consumers | **IMPLEMENTED** |
| Utah | UCPA | $25M+ | 100K+ consumers | **IMPLEMENTED** |

**Current Status:** All 5 state privacy laws proactively implemented (2026-02-28). No registration fees — these are compliance-only laws.
**Review Trigger:** Monitor for new state privacy laws annually

### 3.2 CCPA/CPRA Implementation (Completed 2026-02-28)

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| "Do Not Sell or Share" link | Footer link → LegalModal 'do-not-sell' page | DONE |
| Opt-out mechanism | One-click button with localStorage + consent_logs audit trail | DONE |
| Categories of PI disclosure | Table in Do Not Sell page listing all PI categories | DONE |
| Right to Know | Account Settings > Download My Data (/api/user/export) | DONE |
| Right to Delete | Account Settings > Delete Account (/api/user/delete) | DONE |
| Right to Correct | Account Settings > Edit Profile | DONE |
| Non-discrimination clause | Stated in Do Not Sell page | DONE |
| Authorized agent provision | Documented in Do Not Sell page | DONE |
| 45-day response commitment | Documented in Privacy Policy + Do Not Sell page | DONE |
| Privacy Policy CCPA disclosures | Updated with full CCPA/CPRA rights table + PI categories | DONE |

**Technical Components:**
- `src/components/LegalModal.tsx` — DoNotSellContent component with opt-out UI
- `src/components/Footer.tsx` — "Do Not Sell or Share My Personal Information" link
- `api/consent/log.ts` — Accepts `ccpa_dns` consent type
- `supabase/migrations/20260228_ccpa_dns_optout.sql` — Column + index + reporting view
- **Logged-in users:** Persisted to `user_preferences.ccpa_dns_optout` (Supabase) — survives device/browser changes
- **Anonymous users:** localStorage key `clues_ccpa_dns_optout` as fallback
- All actions logged to `consent_logs` audit trail (consent type: `ccpa_dns`)
- Database view: `ccpa_dns_optouts` — for compliance reporting
- Export helper: `getCcpaDnsOptOut()` for non-React contexts; React components use `useAuth().preferences?.ccpa_dns_optout`

### 3.3 Virginia, Colorado, Connecticut & Utah Implementation (Completed 2026-02-28)

All four state privacy laws were implemented simultaneously. These laws do **not** require registration or fees — they are compliance-only laws that require proper disclosures and consumer rights mechanisms.

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Privacy Policy disclosures | Full state-specific sections in Privacy Policy (Sections 8.3–8.6) | DONE |
| Consumer rights (access, delete, correct) | Already implemented via GDPR/CCPA features | DONE |
| Opt-out mechanism | Shared "Do Not Sell" button (same as CCPA) | DONE |
| Appeal process | Email-based appeal for VA, CO, CT (documented in each section) | DONE |
| Universal opt-out (Colorado) | GPC signal recognition documented | DONE |
| "US State Privacy Rights" page | New `state-privacy` page in LegalModal | DONE |
| Footer link | "US State Privacy Rights" link added to footer | DONE |

**Technical Components:**
- `src/components/LegalModal.tsx` — New `StatePrivacyContent` component + `state-privacy` page type
- `src/components/Footer.tsx` — "US State Privacy Rights" link added alongside existing legal links
- `docs/legal/PRIVACY_POLICY.md` — Sections 8.3 (Virginia), 8.4 (Colorado), 8.5 (Connecticut), 8.6 (Utah), 8.7 (Other States)
- Existing CCPA opt-out mechanism (`Do Not Sell` button, consent logging) covers all state opt-out requirements

**Key Differences Between States:**

| Feature | VA (VCDPA) | CO (CPA) | CT (CTDPA) | UT (UCPA) |
|---------|------------|----------|------------|-----------|
| Right to Correct | Yes | Yes | Yes | No |
| Appeal Process | Required (60 days) | Required (AG referral) | Required (60 days, AG referral) | Not required |
| Universal Opt-Out | Not required | **Required (GPC)** | Not required | Not required |
| Cure Period | 30 days (until 2025) | None | 60 days (until 2025) | 30 days |
| Non-Discrimination | Yes | Yes | Yes | Not explicit |

---

## Section 4: Data Protection Officer (DPO)

### 4.1 DPO Requirement

| Criteria | Our Status | DPO Required? |
|----------|------------|---------------|
| Public authority | NO | No |
| Large-scale systematic monitoring | NO | No |
| Large-scale sensitive data processing | NO | No |

**Conclusion:** Formal DPO appointment NOT required for LIFE SCORE

### 4.2 Privacy Contact

Even without formal DPO, designate a privacy contact:

**Privacy Contact:** cluesnomads@gmail.com
**Responsibilities:**
- Handle data subject requests
- Respond to privacy inquiries
- Coordinate with legal if needed

---

## Section 5: Cookie Compliance

### 5.1 Cookies We Use

| Cookie | Type | Purpose | Consent Required? |
|--------|------|---------|-------------------|
| Session | Strictly Necessary | Authentication | No |
| Preferences | Functional | Theme, settings | No |
| Analytics | Performance | Usage tracking | Yes |

### 5.2 Cookie Banner

**Implementation Status:** Active
**Location:** `src/components/CookieConsent.tsx`

Required elements:
- Clear description of cookie types
- Accept/Reject buttons
- Link to Cookie Policy
- Granular consent options

---

## Section 6: Data Breach Response

### 6.1 Response Timeline

| Action | Deadline | Responsible |
|--------|----------|-------------|
| Detect breach | Immediate | Monitoring systems |
| Assess severity | Within 24 hours | Admin |
| Notify ICO (if required) | Within 72 hours | Admin |
| Notify affected users (if high risk) | Without undue delay | Admin |

### 6.2 Breach Notification Template

```
Subject: Important Security Notice - LIFE SCORE

Dear [User],

We are writing to inform you of a data security incident that may
have affected your LIFE SCORE account.

What Happened:
[Description of incident]

What Information Was Involved:
[List affected data types]

What We Are Doing:
[Steps taken to address]

What You Can Do:
- Change your password
- Monitor for suspicious activity
- Contact us with questions

Contact:
cluesnomads@gmail.com

We sincerely apologize for any inconvenience.

Clues Intelligence LTD
167-169 Great Portland Street, 5th Floor
London W1W 5PF
```

---

## Section 7: Annual Compliance Calendar

### 7.1 Recurring Tasks

| Month | Task | Details |
|-------|------|---------|
| January | DPA Review | Review all vendor DPAs, renew as needed |
| January | Privacy Policy Review | Update for any new data practices |
| April | ICO Fee Renewal | Pay annual registration fee |
| July | Security Audit | Review access controls, API keys |
| October | Cookie Audit | Verify consent mechanisms working |
| December | Data Retention Cleanup | Purge data beyond retention period |

### 7.2 Event-Triggered Reviews

| Trigger | Action Required |
|---------|-----------------|
| New vendor added | Request and sign DPA |
| New data type collected | Update Privacy Policy |
| User threshold crossed | Review state compliance |
| Security incident | Execute breach response plan |
| Law change | Consult legal, update policies |

---

## Section 8: Legal Documents Checklist

### 8.1 Required Documents

| Document | Location | Status |
|----------|----------|--------|
| Privacy Policy | `/legal/privacy` | ACTIVE |
| Terms of Service | `/legal/terms` | ACTIVE |
| Cookie Policy | `/legal/cookies` | ACTIVE |
| Refund Policy | `/legal/refunds` | ACTIVE |
| IP Assignment Deed | `docs/legal/IP_ASSIGNMENT_DEED.md` | READY TO SIGN |

### 8.2 Document Update Log

| Date | Document | Change | Author |
|------|----------|--------|--------|
| 2026-02-28 | Legal Compliance | US State Privacy Rights: VA (VCDPA), CO (CPA), CT (CTDPA), UT (UCPA) — full disclosures in Privacy Policy, new StatePrivacyContent component in LegalModal, footer link, appeal processes documented | Claude Opus 4.6 |
| 2026-02-28 | Legal Compliance | ICO Registration application number C1885368 logged — status updated from NOT STARTED to APPLICATION SUBMITTED | Claude Opus 4.6 |
| 2026-02-28 | IP Assignment Deed | Created IP Assignment Deed — founder-to-company assignment of all IP (software, product names, AI personas, methodologies). Requires wet-ink signature + witness. | Claude Opus 4.6 |
| 2026-02-26 | All 6 Manuals | **Major security audit:** 47 fixes — 20+ endpoints authenticated (total 38+), IDOR vulnerability fixed, CORS hardened, XSS patched, 87 debug console.log removed, admin emails centralized, API key leak fixed, tie victory text fixed, dynamic year, dead code cleanup. GDPR Article 32 compliance strengthened. | Claude Opus 4.6 |
| 2026-02-14 | Legal, App Schema, Judge Equations, User, CS, Tech | Comprehensive update for 40 commits — collapsible panels, cost dashboard fix, video URL expiration, GoToMyNewCity, 200MB storage limit, GDPR timeout safety, HeyGen reliability, Supabase resilience | Claude Opus 4.6 |
| 2026-02-13 | All Manuals | Comprehensive update for ~200 commits of changes | Claude Opus 4.6 |
| 2026-02-10 | Security | JWT auth added to 8+ API endpoints; auth bypass fixed on /api/emilia/manuals | Claude Opus 4.6 |
| 2026-02-02 | All | Added registered address | Claude |
| 2026-01-30 | Privacy Policy | Initial version | Claude |
| 2026-01-30 | Terms of Service | Initial version | Claude |
| 2026-01-30 | Cookie Policy | Initial version | Claude |
| 2026-01-30 | Refund Policy | Initial version | Claude |

### 8.3 Security Improvements (2026-02-10, Major Expansion 2026-02-26)

**2026-02-10 (initial hardening):**
- **JWT auth required** on 8+ previously unprotected API endpoints (emilia/manuals, emilia/thread, avatar/simli-speak, judge-video, etc.)
- **Auth bypass fixed** on `/api/emilia/manuals` — was previously bypassable via unverified email query parameter
- **Database hardening** — RLS policies strengthened on report_shares, judge_reports, gamma_reports
- **Admin check caching** — 5-min TTL with 1-hour grace period prevents lockout during Supabase timeouts
- **grok_videos UNIQUE constraint** now includes status column to prevent data integrity issues

**2026-02-26 (comprehensive security audit — 47 fixes):**

This is the most significant security update in the application's history. All changes committed on branch `claude/coding-session-Jh27y`.

**Authentication (20+ endpoints secured):**
- JWT authentication added to ALL remaining unprotected API endpoints (evaluate, judge, gamma, grok-generate, grok-status, invideo-override, video-status, olivia/context, olivia/gun-comparison, olivia/avatar/streams, olivia/avatar/heygen, olivia/avatar/heygen-video, emilia/thread, check-quotas, elevenlabs, prompts GET)
- Total authenticated endpoints: **38+** (previously ~15)
- **IDOR vulnerability fixed** on `/api/video/grok-generate` — userId from request body is now overridden with the authenticated user's ID, preventing one user from generating videos under another user's account

**XSS & Injection Prevention:**
- `innerHTML`-based HTML entity decoding replaced with safe `DOMParser` (D1)
- `voiceId` parameter validated with regex before URL path interpolation in ElevenLabs TTS (X3)
- Stripe `success_url` and `cancel_url` validated against app origin to prevent open redirect phishing (X1+X2)

**CORS Hardening:**
- 3 auth-protected endpoints tightened from `Access-Control-Allow-Origin: *` to same-app restricted origin (C3)
- Missing CORS configuration added to sync-emilia-knowledge admin endpoint (C2)

**Secret Protection:**
- API key was being sent to the browser in simli-session response — removed (S1)
- Admin env-check endpoint now masks secrets more aggressively (S4)
- Admin emails centralized in shared `getAdminEmails()` function — removed 10 hardcoded email lists (S5)
- Hardcoded admin bypass emails removed from grok-generate (M3)

**Information Leakage Prevention:**
- 87 debug `console.log` statements removed from 10 production component files (CL1-CL6)
- These were exposing comparison IDs, API response data, video URLs, and internal state to the browser console

**Code Quality & Safety:**
- React hooks moved above conditional returns (H1 — prevents crash)
- `var` replaced with `let` for proper scoping (B4)
- Dead code removed (DC1 unused Map, DC3 unused state variable)
- `withTimeout` retry logic fixed — was reusing stale promises (RT1)
- Hardcoded "2025" year strings replaced with dynamic year (SD1+SD2)
- Social meta tag image URLs corrected to absolute URLs (P2)
- Environment variable documentation updated with missing entries (EN1+EN2+EN3)

**Compliance Impact:**
- This audit significantly strengthens our GDPR Article 32 ("security of processing") compliance posture
- All personal data endpoints are now authenticated, reducing unauthorized access risk to near-zero
- The IDOR fix ensures complete data isolation between users

### 8.4 New Storage Bucket

A `user-videos` Supabase Storage bucket was added (2026-02-11) for Court Order video uploads:
- 100 MB max file size
- Public read access for sharing
- RLS: users can only upload to their own path (`user-videos/{userId}/`)
- This constitutes a new data processing activity that should be reflected in the Privacy Policy

### 8.5 Reports Storage Bucket — 200MB File Size Limit (2026-02-14)

The `reports` Supabase Storage bucket now has a **200MB file size limit** enforced:
- Previously the `reports` bucket had no explicit file size limit
- The 200MB limit covers enhanced HTML reports which can be large due to embedded charts and data
- The `user-videos` bucket remains at 100MB (documented in 8.4 above)
- The `contrast-images` bucket remains at 5MB

**Summary of all storage bucket limits:**

| Bucket | Max File Size | Purpose |
|--------|--------------|---------|
| `reports` | **200MB** | HTML reports per user folder |
| `user-videos` | 100MB | Court Order video uploads |
| `contrast-images` | 5MB | AI contrast image copies |

---

## Section 9: Authorized Access

### 9.1 Manual Access Levels

| Manual | Public Access | Admin Only |
|--------|--------------|------------|
| User Manual | YES | YES |
| Customer Service Manual | NO | YES |
| Technical Support Manual | NO | YES |
| Legal Compliance Manual | NO | YES |

### 9.2 Authorized Administrators

| Email | Role | Added |
|-------|------|-------|
| cluesnomads@gmail.com | Owner/Admin | 2026-02-02 |
| brokerpinellas@gmail.com | Developer/Admin | 2026-02-02 |

To add new authorized users:
1. Insert into `authorized_manual_access` table in Supabase
2. Email must match user's Supabase Auth email

---

## Section 10: Quick Reference

### 10.1 Key Contacts

| Role | Contact |
|------|---------|
| Admin | cluesnomads@gmail.com |
| Support | cluesnomads@gmail.com |
| Legal | cluesnomads@gmail.com |

### 10.2 Important Links

- ICO Registration: https://ico.org.uk/for-organisations/register/
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com

### 10.3 Emergency Procedures

**Data Breach:**
1. Contain the breach immediately
2. Assess scope within 24 hours
3. Notify ICO within 72 hours if required
4. Notify users if high risk
5. Document everything

**Account Takeover:**
1. Disable affected account
2. Reset credentials
3. Notify user via alternate contact
4. Review access logs
5. Report to ICO if data exposed

---

**END OF LEGAL COMPLIANCE MANUAL**

*This document is for internal use only. Do not share externally.*
