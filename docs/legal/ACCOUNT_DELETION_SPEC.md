# Account Deletion Specification

**Clues Intelligence LTD**
**Document Type:** Technical Specification
**Version:** 1.0
**Last Updated:** January 23, 2026

---

## 1. Overview

This document specifies the technical implementation of the "Right to Erasure" (GDPR Article 17) for CLUES Comparison Reports. Users must be able to completely delete their accounts and all associated data.

---

## 2. User Interface

### 2.1 Location

**Path:** Account Settings > Privacy & Data > Delete Account

### 2.2 UI Flow

```
[Delete Account Button]
        ↓
[Confirmation Modal]
  - Warning text explaining consequences
  - List of data that will be deleted
  - Checkbox: "I understand this cannot be undone"
  - Password/re-authentication required
  - [Cancel] [Delete My Account]
        ↓
[Processing Screen]
  - "Deleting your data..."
  - Progress indicator
        ↓
[Confirmation Screen]
  - "Your account has been deleted"
  - "You will receive a confirmation email"
  - [Return to Home]
```

### 2.3 Confirmation Text

```
DELETE YOUR ACCOUNT

This will permanently delete:
• Your profile and preferences
• All saved comparisons ({count} items)
• All AI conversations with Olivia ({count} conversations)
• All generated reports ({count} reports)
• Your subscription (if active)

This action CANNOT be undone.

Data retained for legal purposes:
• Transaction records (7 years, anonymized)
• Security logs (2 years, anonymized)

A confirmation will be sent to {email} before deletion completes.
```

---

## 3. API Specification

### 3.1 Endpoint

```
DELETE /api/user/delete
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "confirmation": "DELETE MY ACCOUNT",
  "password": "string" (for password auth)
  // OR
  "reauthToken": "string" (for OAuth re-auth)
}

Response (200 OK):
{
  "success": true,
  "deletionId": "del_abc123",
  "scheduledDeletion": "2026-01-24T00:00:00Z",
  "confirmationEmailSent": true
}

Response (400 Bad Request):
{
  "error": "CONFIRMATION_MISMATCH" | "AUTH_FAILED" | "ACTIVE_SUBSCRIPTION"
}
```

### 3.2 Implementation

```typescript
// api/user/delete.ts

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { confirmation, password, reauthToken } = req.body;

  // Verify confirmation text
  if (confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ error: 'CONFIRMATION_MISMATCH' });
  }

  // Re-authenticate user
  const authResult = await verifyAuth(req, password, reauthToken);
  if (!authResult.valid) {
    return res.status(400).json({ error: 'AUTH_FAILED' });
  }

  const userId = authResult.userId;

  // Check for active subscription
  const hasActiveSub = await checkActiveSubscription(userId);
  if (hasActiveSub) {
    return res.status(400).json({
      error: 'ACTIVE_SUBSCRIPTION',
      message: 'Please cancel your subscription before deleting your account'
    });
  }

  // Generate deletion ID
  const deletionId = `del_${generateId()}`;

  // Queue deletion (processed by background job)
  await queueDeletion(userId, deletionId);

  // Send confirmation email
  await sendDeletionConfirmationEmail(authResult.email, deletionId);

  // Invalidate all sessions
  await invalidateAllSessions(userId);

  return res.status(200).json({
    success: true,
    deletionId,
    scheduledDeletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    confirmationEmailSent: true
  });
}
```

---

## 4. Deletion Process

### 4.1 Deletion Queue Table

```sql
CREATE TABLE deletion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deletion_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  data_summary JSONB -- What was deleted (counts)
);
```

### 4.2 Deletion Steps (Background Job)

```typescript
async function processAccountDeletion(deletionId: string) {
  const deletion = await getDeletion(deletionId);
  const userId = deletion.user_id;

  const summary = {
    comparisons: 0,
    conversations: 0,
    messages: 0,
    reports: 0,
    preferences: 0
  };

  try {
    // 1. Delete Olivia messages
    const { count: msgCount } = await supabase
      .from('olivia_messages')
      .delete()
      .in('conversation_id',
        supabase.from('olivia_conversations')
          .select('id')
          .eq('user_id', userId)
      );
    summary.messages = msgCount;

    // 2. Delete Olivia conversations
    const { count: convCount } = await supabase
      .from('olivia_conversations')
      .delete()
      .eq('user_id', userId);
    summary.conversations = convCount;

    // 3. Delete Gamma reports
    const { count: reportCount } = await supabase
      .from('gamma_reports')
      .delete()
      .eq('user_id', userId);
    summary.reports = reportCount;

    // 4. Delete comparisons
    const { count: compCount } = await supabase
      .from('comparisons')
      .delete()
      .eq('user_id', userId);
    summary.comparisons = compCount;

    // 5. Delete user preferences
    const { count: prefCount } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);
    summary.preferences = prefCount;

    // 6. Anonymize financial records (don't delete)
    await supabase
      .from('transactions')
      .update({
        user_id: null,
        email: 'DELETED',
        anonymized_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // 7. Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 8. Delete auth user (Supabase Admin API)
    await supabaseAdmin.auth.admin.deleteUser(userId);

    // 9. Request deletion from third parties
    await requestThirdPartyDeletion(userId);

    // 10. Mark deletion complete
    await supabase
      .from('deletion_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        data_summary: summary
      })
      .eq('deletion_id', deletionId);

    // 11. Send final confirmation (to stored email before deletion)
    await sendDeletionCompleteEmail(deletion.email_backup, summary);

  } catch (error) {
    await supabase
      .from('deletion_queue')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('deletion_id', deletionId);

    // Alert engineering team
    await alertDeletionFailure(deletionId, error);
  }
}
```

### 4.3 Third-Party Deletion Requests

```typescript
async function requestThirdPartyDeletion(userId: string) {
  // OpenAI - Delete assistant threads
  const threads = await getOpenAIThreads(userId);
  for (const threadId of threads) {
    await openai.beta.threads.del(threadId);
  }

  // Other providers don't store persistent user data
  // (they process on our behalf and don't retain)

  // Log completion
  await logThirdPartyDeletion(userId, {
    openai: threads.length,
    timestamp: new Date().toISOString()
  });
}
```

---

## 5. Cancellation Window

Users have 24 hours to cancel deletion:

### 5.1 Cancellation Endpoint

```
POST /api/user/cancel-deletion
Authorization: Bearer {token} (re-auth required)

Request Body:
{
  "deletionId": "del_abc123"
}

Response (200 OK):
{
  "success": true,
  "message": "Deletion cancelled. Your account has been restored."
}
```

### 5.2 Cancellation Email

Sent immediately after deletion request:

```
Subject: Your CLUES Account Deletion Request

Hi {name},

We received your request to delete your CLUES account.

Your account and all data will be permanently deleted on {date} at {time}.

Changed your mind? Cancel deletion here: {cancellation_link}
(Link expires in 24 hours)

If you did not request this, please contact support immediately.
```

---

## 6. Data That Is NOT Deleted

Per GDPR Article 17(3), we retain:

| Data | Reason | Retention |
|------|--------|-----------|
| Transaction records | Tax/legal compliance | 7 years (anonymized) |
| Security audit logs | Legal obligation | 2 years (anonymized) |
| Abuse reports | Legal proceedings | Case duration |
| Anonymized analytics | Legitimate interest | Indefinite |

---

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Deletion request requires re-authentication
- [ ] Confirmation text must match exactly
- [ ] Active subscription blocks deletion
- [ ] Deletion ID is unique and logged

### 7.2 Integration Tests

- [ ] All user data deleted from all tables
- [ ] Auth user deleted from Supabase
- [ ] Sessions invalidated
- [ ] Confirmation email sent
- [ ] Third-party deletion requests made

### 7.3 Manual Tests

- [ ] Full UI flow works
- [ ] Cancellation within 24 hours works
- [ ] Deletion after 24 hours cannot be cancelled
- [ ] Re-registration with same email works after deletion

---

## 8. Audit Trail

All deletion operations are logged:

```sql
CREATE TABLE deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_id TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  records_affected INTEGER,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by TEXT -- 'system' or admin user
);
```

---

**Implementation Status:** Specification Complete
**Next Step:** Engineering implementation
**Estimated Effort:** 8-12 hours

