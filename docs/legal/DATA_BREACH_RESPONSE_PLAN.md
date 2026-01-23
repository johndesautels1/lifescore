# Data Breach Response Plan

**Clues Intelligence LTD**
**Document Type:** Internal Policy
**Version:** 1.0
**Last Updated:** January 23, 2026
**Classification:** Confidential

---

## 1. Purpose

This plan establishes procedures for detecting, responding to, and recovering from personal data breaches in compliance with UK GDPR, EU GDPR, and other applicable regulations.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **Personal Data Breach** | Security incident leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data |
| **Data Subject** | Individual whose personal data is processed |
| **Supervisory Authority** | ICO (UK), or relevant EU DPA |
| **Containment** | Actions to limit the scope and impact of a breach |

---

## 3. Breach Response Team

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Lead** | Coordinates response, makes decisions | CEO/Founder |
| **Technical Lead** | Investigates cause, implements fixes | Lead Developer |
| **Legal/Compliance** | Assesses notification requirements | Legal Counsel |
| **Communications** | Handles external communications | CEO/Founder |

For startups with limited staff, roles may be combined.

---

## 4. Breach Categories

| Category | Examples | Severity |
|----------|----------|----------|
| **Confidentiality** | Unauthorized access, data shared with wrong recipient | High |
| **Integrity** | Data altered without authorization | High |
| **Availability** | Data lost, destroyed, or inaccessible | Medium-High |

---

## 5. Response Phases

### Phase 1: Detection & Reporting (0-1 hours)

**Anyone discovering a potential breach must:**
1. Do NOT attempt to fix or cover up
2. Immediately report to Incident Lead
3. Document: What, When, How discovered

**Incident Lead must:**
1. Acknowledge receipt within 15 minutes
2. Activate Breach Response Team
3. Begin incident log

### Phase 2: Containment (1-4 hours)

**Technical Lead actions:**
- [ ] Isolate affected systems
- [ ] Revoke compromised credentials
- [ ] Block unauthorized access vectors
- [ ] Preserve evidence (logs, screenshots)
- [ ] Do NOT delete or modify evidence

**Document:**
- Systems affected
- Data types involved
- Number of records/individuals affected
- Geographic scope

### Phase 3: Assessment (4-24 hours)

**Determine:**

| Question | Answer Required |
|----------|-----------------|
| What data was affected? | Types, sensitivity level |
| How many individuals? | Count or estimate |
| What is the likely impact? | Financial, reputational, safety |
| Is the breach ongoing? | Yes/No |
| What was the cause? | Human error, attack, system failure |

**Risk Assessment Matrix:**

| Impact | Low Likelihood | Medium Likelihood | High Likelihood |
|--------|----------------|-------------------|-----------------|
| **High** | Notify | Notify | Notify |
| **Medium** | Assess | Notify | Notify |
| **Low** | Document | Assess | Assess |

### Phase 4: Notification (24-72 hours)

#### 4a. Supervisory Authority Notification

**Required if:** Breach likely results in risk to individuals' rights and freedoms

**Timeline:** Within 72 hours of becoming aware

**UK ICO Notification:**
- Online: ico.org.uk/for-organisations/report-a-breach
- Phone: 0303 123 1113

**Must include:**
1. Nature of breach (categories and approximate number of individuals)
2. Contact details (DPO or other contact)
3. Likely consequences
4. Measures taken or proposed

**Template:**
```
BREACH NOTIFICATION TO ICO

Date of Breach: [DATE]
Date Discovered: [DATE]
Date of This Report: [DATE]

Nature of Breach:
[Description of what happened]

Data Categories Affected:
[ ] Names
[ ] Email addresses
[ ] Passwords (hashed/plain)
[ ] Financial data
[ ] Comparison history
[ ] AI conversation logs
[ ] Other: ___________

Individuals Affected: [NUMBER]
Geographic Scope: [UK/EU/US/Global]

Likely Consequences:
[Assessment of risk to individuals]

Measures Taken:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Contact: [Name, Title, Email, Phone]
```

#### 4b. Data Subject Notification

**Required if:** Breach likely results in HIGH risk to individuals

**Must include:**
1. Clear description of breach
2. Contact details for more information
3. Likely consequences
4. Measures taken and recommended actions

**Template Email:**
```
Subject: Important Security Notice from CLUES

Dear [Name],

We are writing to inform you of a data security incident that may
affect your personal information.

WHAT HAPPENED
[Clear description]

WHAT INFORMATION WAS INVOLVED
[List data types]

WHAT WE ARE DOING
[Actions taken]

WHAT YOU CAN DO
- [Recommendation 1]
- [Recommendation 2]

We sincerely apologize for any concern this may cause. If you have
questions, please contact: security@cluesintelligence.com

Clues Intelligence LTD
```

### Phase 5: Recovery (24-168 hours)

- [ ] Implement permanent fixes
- [ ] Restore affected systems
- [ ] Reset compromised credentials
- [ ] Verify security measures
- [ ] Monitor for further issues

### Phase 6: Post-Incident Review (1-2 weeks)

**Document:**
1. Timeline of events
2. Root cause analysis
3. Effectiveness of response
4. Lessons learned
5. Policy/procedure updates needed

**Review meeting attendees:** All Breach Response Team members

---

## 6. Documentation Requirements

Maintain records of ALL breaches (even if not notified to ICO):

| Item | Retention |
|------|-----------|
| Incident log | 5 years |
| Evidence collected | Duration of investigation + 2 years |
| Notifications sent | 5 years |
| Post-incident report | 5 years |

---

## 7. Third-Party Breaches

If a processor (Supabase, OpenAI, etc.) reports a breach:

1. Request detailed incident report
2. Assess impact on our data
3. Follow same notification procedures
4. Document processor's response

---

## 8. Testing & Training

| Activity | Frequency |
|----------|-----------|
| Tabletop exercise | Annually |
| Plan review | Annually |
| Staff training | At hire + annually |

---

## 9. Contact List

| Contact | Role | Phone | Email |
|---------|------|-------|-------|
| [Name] | Incident Lead | [Phone] | [Email] |
| [Name] | Technical Lead | [Phone] | [Email] |
| ICO | Regulator | 0303 123 1113 | - |
| Legal Counsel | External | [Phone] | [Email] |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Claude Code | Initial creation |

---

**Owner:** Legal & Compliance
**Next Review:** January 2027
