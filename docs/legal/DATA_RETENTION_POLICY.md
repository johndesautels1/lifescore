# Data Retention Policy

**Clues Intelligence LTD**
**Effective Date:** January 23, 2026
**Last Updated:** January 23, 2026
**Classification:** Internal Policy

---

## 1. Purpose

This policy defines how long Clues Intelligence LTD retains different categories of data, ensuring compliance with UK GDPR, EU GDPR, and other applicable regulations while meeting business and legal requirements.

---

## 2. Principles

1. **Minimization:** We only retain data as long as necessary
2. **Purpose Limitation:** Data is kept only for its original purpose
3. **Legal Compliance:** We meet all legal retention requirements
4. **Security:** Retained data is protected; deleted data is securely erased
5. **Documentation:** Retention decisions are documented and auditable

---

## 3. Retention Schedule

### 3.1 User Account Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Profile (email, name, avatar) | Account lifetime + 30 days | Account deletion request | Contract |
| Authentication credentials | Account lifetime | Account deletion | Contract |
| Account preferences | Account lifetime + 30 days | Account deletion | Legitimate interest |

### 3.2 Comparison Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Saved comparisons | Account lifetime | Account deletion | Contract |
| Unsaved comparisons | 24 hours | Last access | Legitimate interest |
| Comparison history | Account lifetime | Account deletion | Contract |
| Custom notes | Account lifetime | Account deletion | Contract |

### 3.3 AI Conversation Data (Olivia)

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Active conversations | 90 days of inactivity | Last message | Contract |
| Archived conversations | Account lifetime | Account deletion | Contract |
| OpenAI thread references | 90 days | Last interaction | Contract |

### 3.4 Generated Reports (Gamma)

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Report metadata | Account lifetime | Account deletion | Contract |
| PDF/PPTX files | Account lifetime | Account deletion | Contract |
| Gamma generation IDs | Account lifetime | Account deletion | Contract |

### 3.5 Financial Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Transaction records | 7 years | Transaction date | Legal (tax) |
| Invoices | 7 years | Invoice date | Legal (tax) |
| Subscription history | 7 years | Subscription end | Legal (tax) |
| Payment method details | NOT STORED | - | - |

**Note:** Payment card details are processed by Stripe and never stored on our systems.

### 3.6 Technical/Operational Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Server access logs | 90 days | Log creation | Legitimate interest |
| Error logs | 90 days | Log creation | Legitimate interest |
| API request logs | 30 days | Request time | Legitimate interest |
| Security audit logs | 2 years | Event date | Legal (security) |

### 3.7 Marketing Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Marketing consent | Until withdrawal + 3 years | Withdrawal date | Consent |
| Email campaign data | 3 years | Campaign date | Legitimate interest |
| Unsubscribe records | Indefinite | Unsubscribe date | Legal (compliance) |

### 3.8 Support Data

| Data Type | Retention Period | Trigger | Legal Basis |
|-----------|-----------------|---------|-------------|
| Support tickets | 3 years | Ticket closure | Legitimate interest |
| Chat transcripts | 3 years | Chat end | Legitimate interest |
| Feedback submissions | 3 years | Submission date | Legitimate interest |

---

## 4. Data Deletion Procedures

### 4.1 Automatic Deletion

The following data is automatically deleted:

| Data | Schedule | Method |
|------|----------|--------|
| Unsaved comparisons | Daily at 00:00 UTC | Supabase cron job |
| Inactive AI conversations | Weekly | Archive then delete after 90 days |
| Server logs > 90 days | Daily | Log rotation |
| API logs > 30 days | Daily | Automatic purge |

### 4.2 User-Initiated Deletion

When a user requests account deletion:

1. **Immediate:**
   - Account access disabled
   - Authentication tokens invalidated
   - Email removed from marketing lists

2. **Within 24 hours:**
   - Profile data queued for deletion
   - Comparisons queued for deletion
   - AI conversations queued for deletion
   - Reports queued for deletion

3. **Within 30 days:**
   - All queued data permanently deleted
   - Backups containing user data marked for exclusion
   - Confirmation sent to user's email (before deletion)

4. **Retained (anonymized or required by law):**
   - Anonymized usage statistics
   - Financial records for legal compliance
   - Security audit logs

### 4.3 Deletion Methods

| Storage Type | Deletion Method | Verification |
|--------------|-----------------|--------------|
| Supabase rows | Hard delete with cascade | Query returns empty |
| File storage | Secure delete API | Storage check |
| Backups | Exclusion list + expiration | Backup audit |
| Logs | Overwrite + rotation | Log verification |
| Third-party (OpenAI, etc.) | API deletion request | Confirmation response |

---

## 5. Exceptions to Standard Retention

Data may be retained longer than standard periods when:

### 5.1 Legal Hold

- Active litigation or investigation
- Regulatory inquiry
- Law enforcement request

**Process:** Legal team issues hold notice; affected data excluded from deletion until lifted.

### 5.2 Legal Requirements

- Tax records: 7 years (UK HMRC requirement)
- Security incidents: Duration of investigation + 2 years
- Complaints/disputes: Duration + 6 years (statute of limitations)

### 5.3 User Request

Users may request extended retention of their data (e.g., keeping reports indefinitely). Such requests are documented and honored.

---

## 6. Third-Party Data Retention

We cannot directly control retention by third parties but require DPAs that include:

| Processor | Required Retention Terms |
|-----------|-------------------------|
| Supabase | Delete on our instruction |
| OpenAI | 30-day API log retention |
| Anthropic | Zero retention option |
| Vercel | Log retention < 90 days |
| Stripe | As required by payment law |

---

## 7. Implementation Requirements

### 7.1 Technical Implementation

**Database (Supabase):**
```sql
-- Example: Auto-delete old unsaved comparisons
CREATE OR REPLACE FUNCTION delete_old_unsaved_comparisons()
RETURNS void AS $$
BEGIN
  DELETE FROM comparisons
  WHERE is_saved = false
  AND updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
```

**Scheduled Jobs:**
- Daily: Clean unsaved comparisons
- Weekly: Archive inactive conversations
- Monthly: Audit retention compliance

### 7.2 Monitoring

- Monthly retention compliance report
- Quarterly audit of deletion effectiveness
- Annual policy review

---

## 8. Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Engineering** | Implement automated deletion, maintain systems |
| **Legal/Compliance** | Define requirements, handle legal holds |
| **Support** | Process user deletion requests |
| **Management** | Approve policy changes, resource allocation |

---

## 9. Policy Review

This policy is reviewed:

- **Annually:** Full review and update
- **As needed:** When regulations change, new products launch, or incidents occur

---

## 10. Related Documents

- [Privacy Policy](PRIVACY_POLICY.md)
- [Account Deletion Specification](ACCOUNT_DELETION_SPEC.md)
- [Data Export Specification](DATA_EXPORT_SPEC.md)

---

**Document Version:** 1.0
**Owner:** Legal & Compliance
**Next Review:** January 2027

