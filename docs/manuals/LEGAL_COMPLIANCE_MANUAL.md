# LIFE SCORE - Legal Compliance Manual

**Document Version:** 1.0
**Last Updated:** February 2, 2026
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
**Admin Contact:** cluesnomads@gmail.com

---

## Section 1: Regulatory Registration Status

### 1.1 ICO Registration (UK)

| Item | Status | Details |
|------|--------|---------|
| **Registration Required** | YES | UK-based company processing personal data |
| **Registration URL** | https://ico.org.uk/for-organisations/register/ |
| **Annual Fee** | ~£40-60 | Depends on organization size |
| **Registration Status** | NOT STARTED | Complete before launch |

**Action Required:**
1. Go to ico.org.uk
2. Complete Data Protection Fee registration
3. Pay annual fee
4. Display registration number in Privacy Policy

### 1.2 EU Representative

| Item | Status | Details |
|------|--------|---------|
| **Required** | NO | UK company post-Brexit - EU Rep not required |
| **Notes** | N/A | If serving EU customers directly, revisit this |

### 1.3 DUNS Number

| Item | Status | Details |
|------|--------|---------|
| **Required** | NO | Only needed for US govt contracts or enterprise B2B |
| **Notes** | N/A | Revisit if pursuing enterprise sales |

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
| Payment info | Billing (via Stripe) | Contract performance | Per Stripe retention |
| IP address | Security, rate limiting | Legitimate interest | 90 days |
| Usage analytics | Service improvement | Legitimate interest | Anonymized after 30 days |

### 2.2 Data Subject Rights

We must honor these GDPR rights:

| Right | Implementation | Endpoint |
|-------|----------------|----------|
| **Right to Access** | User can export all data | `/api/user/export` |
| **Right to Deletion** | User can delete account | `/api/user/delete` |
| **Right to Rectification** | User can update profile | Settings page |
| **Right to Portability** | JSON export available | `/api/user/export` |
| **Right to Object** | Can opt out of analytics | Cookie settings |

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
| Tavily | Web Search | PENDING | Email required |
| ElevenLabs | Text-to-Speech | SIGNED | Via Terms |
| Gamma | Report Generation | PENDING | Email required |
| Kling AI | Video Generation | PENDING | Email required |
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
| California | CCPA/CPRA | $25M+ | 100K+ consumers | DEFERRED |
| Virginia | VCDPA | $25M+ | 100K+ consumers | DEFERRED |
| Colorado | CPA | N/A | 100K+ consumers | DEFERRED |
| Connecticut | CTDPA | $25M+ | 100K+ consumers | DEFERRED |
| Utah | UCPA | $25M+ | 100K+ consumers | DEFERRED |

**Current Status:** Below all thresholds - compliance deferred
**Review Trigger:** Revisit at 10K users or $1M ARR

### 3.2 When Compliance Required

When you hit thresholds, you must:
- Add "Do Not Sell My Personal Information" link
- Honor opt-out requests within 45 days
- Provide data access/deletion mechanisms
- Update Privacy Policy with state-specific disclosures

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

### 8.2 Document Update Log

| Date | Document | Change | Author |
|------|----------|--------|--------|
| 2026-02-02 | All | Added registered address | Claude |
| 2026-01-30 | Privacy Policy | Initial version | Claude |
| 2026-01-30 | Terms of Service | Initial version | Claude |
| 2026-01-30 | Cookie Policy | Initial version | Claude |
| 2026-01-30 | Refund Policy | Initial version | Claude |

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
