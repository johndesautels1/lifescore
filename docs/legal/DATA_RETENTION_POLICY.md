# Data Retention Policy

**Clues Intelligence LTD** — LIFE SCORE
**Effective:** 3 October 2026 (replaces the version of 23 January 2026)
**Classification:** Internal policy

> Rewritten 2026-10-03 to describe what the code actually does. The January
> version promised a deletion queue, a 30-day grace period, nightly purges of
> "unsaved comparisons" and 90-day archiving of Olivia conversations; none of
> them was ever built. Where something is still only an intention, it is listed
> under **Open items**, not stated as fact. The public promises are in the
> Privacy Policy (`PRIVACY_POLICY.md`, generated from `src/legal/legalContent.ts`);
> this document must never promise less or more than that page.

---

## 1. Principles

1. **Minimisation** — keep only what the service needs, only as long as the account exists.
2. **Purpose limitation** — data is used only for the purpose it was collected for.
3. **One deletion path** — deleting the sign-in account removes everything linked to it (section 4).
4. **Honesty** — this policy states what the system does today; intentions go under Open items.

---

## 2. Retention schedule

### 2.1 Held for the life of the account (deleted with it)

| Data | Where | Deleted by |
|---|---|---|
| Profile: email, name, profile picture, plan | `profiles` | Account deletion (cascade from the sign-in account) |
| Preferences: weights, dealbreakers, favourites, display | `user_preferences` | Cascade |
| Comparisons, notes, nicknames, favourites | `comparisons` | Cascade |
| Olivia conversations and messages | `olivia_conversations`, `olivia_messages` | Cascade |
| Visual reports (Gamma) and their files | `gamma_reports` | Cascade |
| Judge reports | `judge_reports` | Cascade |
| Saved reports and their share links and view records | `reports`, `report_shares`, `report_access_logs` | Cascade (files in `Reports/{userId}/` removed by the deletion route) |
| Court orders and uploaded videos | `court_orders`, storage `user-videos/{userId}/` | Cascade; files removed by the deletion route |
| City videos the user started | `grok_videos` | Cascade |
| Subscription references, monthly usage | `subscriptions`, `usage_tracking` | Cascade (the Stripe subscription is cancelled first) |
| Notifications and background jobs | `notifications`, `jobs` | Cascade |
| Service cost records | `api_cost_records` | Cascade |
| Beta invitation | `beta_testers` (by email) | Removed by the deletion route before the account |

### 2.2 Kept after the account is deleted

| Data | Why | How |
|---|---|---|
| Consent records (`consent_logs`: choice, time, IP address, browser) | Proof of what was consented to | `consent_logs.user_id` is set to null; the record keeps no account link |
| Payment and invoice records | Tax and accounting law | Held by Stripe in its own systems, not by us |
| Shared caches: city comparisons, contrast images, Cristiano city films, Moving Movies, web research per city pair | Reused for every user; hold no personal data | The starter's id is set to null (`cristiano_city_videos`, `movie_videos`); `tavily_context_cache` holds no id at all |
| Database backups | Disaster recovery | Held by Supabase and expire on its backup schedule |

### 2.3 Never held by us

- Card details — typed on Stripe's page only.
- Emilia conversations — kept only in the user's browser tab (session storage).
- Speech audio — the browser's speech recognition turns speech into text before anything reaches us.

### 2.4 Logs

| Log | Held by | Retention |
|---|---|---|
| Web and function logs | Vercel | Vercel's standard log period for the project's plan |
| Database and sign-in logs | Supabase | Supabase's standard log period for the project's plan |

---

## 3. Timed jobs

The timed jobs (`vercel.json` → `crons`) are:

| Job | Schedule | What it does |
|---|---|---|
| `/api/warmup` | Every 5 minutes | Keeps the database connection warm; deletes nothing |
| `/api/cron/vendor-check` | Mondays 08:00 UTC | Checks the AI vendors still serve the app's models and that Google sign-in starts; emails the admins on a failure. Reads and deletes no personal data |

**No automatic deletion job runs today.** See Open items.

---

## 4. Account deletion (user-initiated)

Door: **Settings → Data → Delete My Account** (or a request to info@cluesintelligence.com).
Implementation: `api/user/delete.ts`; specification: `ACCOUNT_DELETION_SPEC.md`.

1. Every billable Stripe subscription is cancelled. If Stripe cannot be reached, the account is **not** deleted.
2. The user's own files are removed (`user-videos/{userId}/`, `Reports/{userId}/`).
3. The beta invitation (keyed by email) is removed.
4. The sign-in account is deleted; every table in 2.1 follows by `ON DELETE CASCADE`, and the links in 2.2 are set to null (migration `20261003_account_deletion_foreign_keys`).

The route answers "deleted" only when step 4 succeeds. Deletion is immediate — there is no grace period.

---

## 5. Exceptions

Data may be kept longer where the law requires it, or to establish, exercise or defend legal claims, prevent fraud or process refunds. Any such hold is recorded with its reason and lifted when the reason ends.

---

## 6. Third-party retention

Suppliers process data on our instructions under their data processing terms; the list is `src/legal/subProcessors.ts` (shown in the Privacy Policy), and agreement status is tracked in `DPA_TRACKER.md`. Their own retention of what we send (for example, abuse-monitoring logs) is governed by those terms and is reviewed at each annual review.

---

## 7. Open items (not built yet)

| Item | Why it matters | Status |
|---|---|---|
| Purge expired rows in the shared caches (`global_comparison_cache`, `contrast_image_cache`, `cristiano_city_videos`, `movie_videos`, `tavily_context_cache`) | They carry an `expires_at` (or, for `tavily_context_cache`, a 30-minute life from `created_at`) but nothing deletes expired rows; only the Cristiano film reader ignores expired films, and a `tavily_context_cache` row is replaced when its city pair is next compared. No personal data is held, so this is housekeeping, not a privacy risk. | Not built |
| A stated backup period | Supabase's backup retention depends on the plan; record the plan's period here | To confirm |
| Annual review reminder | Section 8 | Not scheduled |

---

## 8. Review

Reviewed once a year, and whenever a supplier, a table or a timed job changes. `tests/complianceDocs.test.ts` fails the build if a timed job is added without being listed in section 3, or if a table that holds user data is missing from section 2.

---

**Owner:** Clues Intelligence LTD · **Contact:** info@cluesintelligence.com · **Next review:** October 2027
