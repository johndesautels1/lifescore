# Account Deletion Specification

**Clues Intelligence LTD** — LIFE SCORE
**Version:** 2.0 · **Last updated:** 3 October 2026
**Implements:** UK/EU GDPR Article 17 (erasure); US state "right to delete"

> Rewritten 2026-10-03 to describe what is built. Version 1.0 (January 2026)
> specified a deletion queue, a 30-day cancellation window and emails; none was
> built, and the route that did exist crashed on every call (a rate limiter
> called with the wrong arguments), never cancelled Stripe, and could not
> remove the sign-in account of anyone who had shared a report or started a
> film. This version is the implementation.

---

## 1. Door

**Settings (header) → Data → Delete My Account** — `src/components/SettingsModal.tsx`.

1. The user presses **Delete My Account**.
2. A box asks them to type `DELETE MY ACCOUNT`; **Delete Forever** stays disabled until they do.
3. On success the app clears this browser's LifeScore data, signs out, closes Settings and shows "Your account and all its data have been deleted."
4. On failure the server's reason is shown and the account is kept.

Users may also write to info@cluesintelligence.com; the same route is used on their behalf.

---

## 2. API

```
DELETE /api/user/delete
Authorization: Bearer <the user's session token>
Content-Type: application/json

{ "confirmation": "DELETE MY ACCOUNT" }
```

| Answer | Meaning |
|---|---|
| 200 `{ success: true, message, summary: { subscriptionsCancelled, filesRemoved } }` | Deleted |
| 400 `CONFIRMATION_MISMATCH` | The phrase was not sent |
| 401 `UNAUTHORIZED` / `INVALID_TOKEN` | No valid session; the account is always the caller's own, never an id from the body |
| 429 | More than 3 requests a minute from one address |
| 502 `DELETION_FAILED`, step `billing` | Stripe could not cancel the subscription — **nothing was deleted** |
| 500 `DELETION_FAILED`, step `files` / `account` | A later step failed; anything already removed stays removed; retry is safe |

---

## 3. Steps (in this order)

Implementation: `api/user/delete.ts`. Every step has a 15-second limit; the route has 60 seconds.

1. **Stop the billing.** Read the user's Stripe customer ids from `subscriptions`; list each customer's subscriptions in Stripe; cancel every one in a billable state (`active`, `trialing`, `past_due`, `unpaid`, `incomplete`, `paused`). If Stripe is not configured or does not answer, stop and answer 502.
2. **Remove the user's files.** Every object under `user-videos/{userId}/` and `Reports/{userId}/` in Supabase storage.
3. **Remove the beta invitation.** The `beta_testers` row matching the sign-in email (lower case). Done before step 4, so a failure leaves the account in place for a retry.
4. **Delete the sign-in account** (`auth.admin.deleteUser`). The database removes the rest (section 4). Only when this succeeds does the route answer "deleted".

---

## 4. What the database does

Every table holding a user's rows is linked to the sign-in account (`auth.users`) or to `profiles` (itself linked to `auth.users`) with `ON DELETE CASCADE`: `profiles`, `user_preferences`, `comparisons`, `olivia_conversations` → `olivia_messages`, `gamma_reports`, `judge_reports`, `court_orders`, `grok_videos`, `reports` → `report_shares`, `report_access_logs`, `subscriptions`, `usage_tracking`, `notifications`, `jobs`, `api_cost_records`.

Links that must survive the account are set to null instead:

| Column | Why kept |
|---|---|
| `consent_logs.user_id` | Proof of consent, without the account link |
| `report_access_logs.user_id` | A viewer's visit to someone else's report |
| `cristiano_city_videos.generated_by` | Shared city film; holds no personal data |
| `movie_videos.generated_by` | Shared city-pair film; holds no personal data |

Migration `20261003_account_deletion_foreign_keys` set these four (they were `NO ACTION`, which blocked deletion).

---

## 5. What is not deleted

- Payment and invoice records held by **Stripe** (tax and accounting law); the Stripe customer is kept by Stripe.
- **Consent records**, without the account link (section 4).
- **Shared caches** that hold no personal data.
- **Backups**, which expire on Supabase's backup schedule.
- What suppliers already processed under their data processing terms (see `DATA_RETENTION_POLICY.md` section 6).

---

## 6. Tests

`tests/privacyRoutes.test.ts` (runs on every push):

- the rate limiter is called with its four arguments;
- the order is billing → files → invitation → account;
- success is never reported when the account could not be removed;
- Settings offers the door and keeps **Delete Forever** locked until the phrase is typed;
- every user-linked table in the migrations is covered by the data export.

---

## 7. Related

- `DATA_EXPORT_SPEC.md` — the companion "Download My Data" route.
- `DATA_RETENTION_POLICY.md` — the retention schedule.
- `PRIVACY_POLICY.md` — the public promise (generated from `src/legal/legalContent.ts`).
