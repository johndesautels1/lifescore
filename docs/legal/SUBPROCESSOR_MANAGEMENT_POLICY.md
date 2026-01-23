# Subprocessor Management Policy

**Clues Intelligence LTD**
**Document Type:** Internal Policy
**Version:** 1.0
**Last Updated:** January 23, 2026
**Classification:** Internal

---

## 1. Purpose

This policy establishes procedures for managing third-party subprocessors who process personal data on behalf of Clues Intelligence LTD, ensuring GDPR compliance and data protection.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **Processor** | Entity processing personal data on controller's behalf |
| **Subprocessor** | Third party engaged by processor to process data |
| **DPA** | Data Processing Agreement/Addendum |
| **SCCs** | Standard Contractual Clauses for international transfers |

---

## 3. Current Subprocessors

| Subprocessor | Service | Data Processed | Location | DPA Status |
|--------------|---------|----------------|----------|------------|
| Supabase | Database, Auth | All user data | US (AWS) | Required |
| Vercel | Hosting | All data in transit | US/Global | Required |
| OpenAI | AI Assistant | Conversations | US | Required |
| Anthropic | AI Evaluation | City queries | US | Required |
| Google (Gemini) | AI Evaluation | City queries | US | Required |
| xAI (Grok) | AI Evaluation | City queries | US | Required |
| Perplexity | AI Evaluation | City queries | US | Required |
| D-ID | Video Avatar | Voice/text | US/Israel | Required |
| Gamma | Reports | Report data | US | Required |
| Stripe | Payments | Payment data | US | Required |
| Tavily | Web Search | Search queries | US | Required |

---

## 4. Subprocessor Requirements

### 4.1 Before Engagement

Before engaging any new subprocessor:

**Due Diligence Checklist:**
- [ ] Security certifications (SOC 2, ISO 27001, etc.)
- [ ] Privacy policy review
- [ ] DPA availability
- [ ] Data location/transfers
- [ ] Breach notification procedures
- [ ] Sub-subprocessor policy
- [ ] Data deletion capabilities

### 4.2 Contractual Requirements

Every subprocessor must have a DPA containing:

| Requirement | Description |
|-------------|-------------|
| Processing scope | What data, what purposes |
| Instructions | Only process per our instructions |
| Confidentiality | Personnel bound by confidentiality |
| Security measures | Technical/organizational measures |
| Sub-subprocessors | Notification/approval requirements |
| Assistance | Help with data subject requests |
| Audit rights | Right to audit or review |
| Deletion | Delete/return data on termination |
| Breach notification | Timely notification of breaches |

### 4.3 International Transfers

For subprocessors outside UK/EEA:
- Standard Contractual Clauses (SCCs) required
- Or other valid transfer mechanism
- Document transfer impact assessment

---

## 5. Approval Process

### 5.1 New Subprocessor Request

```
SUBPROCESSOR APPROVAL REQUEST

Requested by: _______________
Date: _______________

Subprocessor Name: _______________
Service Description: _______________
Data to be Processed: _______________
Data Location: _______________

Business Justification:
_________________________________

Alternatives Considered:
_________________________________

Due Diligence Completed: [ ] Yes [ ] No
DPA Available: [ ] Yes [ ] No
Security Certifications: _______________
```

### 5.2 Approval Authority

| Data Sensitivity | Approver |
|------------------|----------|
| Low (anonymized) | Technical Lead |
| Medium (account data) | CEO + Technical Lead |
| High (financial, sensitive) | CEO + Legal Review |

### 5.3 Customer Notification

For material changes to subprocessors:
1. Update subprocessor list (30 days notice)
2. Notify customers via email if required by their DPA
3. Allow objection period if contractually required

---

## 6. Ongoing Management

### 6.1 Annual Review

Each subprocessor reviewed annually for:
- [ ] Continued business need
- [ ] Security posture changes
- [ ] DPA still valid
- [ ] Compliance with obligations
- [ ] Any incidents or concerns

### 6.2 Monitoring

| Activity | Frequency |
|----------|-----------|
| Review security updates/announcements | Ongoing |
| Check for breach notifications | Ongoing |
| Verify DPA currency | Annually |
| Review subprocessor's subprocessors | Annually |
| Security assessment | Annually |

### 6.3 Incident Response

If subprocessor reports a breach:
1. Assess impact on our data
2. Follow Data Breach Response Plan
3. Document subprocessor's response
4. Evaluate continued relationship

---

## 7. Termination Procedures

When ending a subprocessor relationship:

1. **30 days before:** Notify subprocessor of termination
2. **Data return:** Request return of all data
3. **Data deletion:** Confirm deletion with certificate
4. **Access revocation:** Remove all access credentials
5. **Documentation:** Archive all records
6. **Customer notification:** Update public subprocessor list

---

## 8. Documentation Requirements

Maintain for each subprocessor:

| Document | Retention |
|----------|-----------|
| DPA (signed) | Contract term + 7 years |
| Due diligence records | Contract term + 3 years |
| Approval documentation | Contract term + 3 years |
| Annual review records | 3 years |
| Termination records | 7 years |

---

## 9. Public Subprocessor List

Maintain a public list of subprocessors at:
- Privacy Policy (summary)
- Dedicated subprocessor page (if needed for enterprise customers)

Update within 30 days of material changes.

---

## 10. Customer Objections

If a customer objects to a subprocessor:

1. Acknowledge within 5 business days
2. Discuss specific concerns
3. Evaluate alternatives if feasible
4. If no resolution, customer may terminate per contract terms
5. Document objection and resolution

---

## 11. Roles & Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Legal/Compliance** | DPA review, approval, compliance monitoring |
| **Technical Lead** | Due diligence, security assessment |
| **CEO** | Final approval for high-risk processors |
| **Engineering** | Implementation, access management |

---

## 12. Exceptions

Any exception to this policy requires:
- Written justification
- Risk assessment
- CEO approval
- Time-limited duration
- Documented compensating controls

---

## 13. Related Documents

- [DPA Tracker](DPA_TRACKER.md)
- [Data Breach Response Plan](DATA_BREACH_RESPONSE_PLAN.md)
- [Privacy Policy](PRIVACY_POLICY.md)

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Claude Code | Initial creation |

---

**Owner:** Legal & Compliance
**Next Review:** January 2027
