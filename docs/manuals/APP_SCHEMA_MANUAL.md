# LIFE SCORE Application Schema Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-ASM-001
**For:** administrators and developers (restricted in the admin panel)

Where LIFE SCORE keeps its data: accounts, the database's tables and columns, who may read each row, stored files, database functions, and what the app keeps in the browser. Every table, column, policy, bucket, function and browser key below is written into this manual from the code each time it is opened. Each written section names the code it explains and is brought up to date automatically when that code changes (Technical Support Manual, section 14).

Routes, components, hooks, services, settings and AI models are in the **Technical Support Manual** (sections 2, 3, 5 and 10); plans and allowances in section 4 there.

---

## 1. Accounts and sign-in
<!-- covers: src/contexts/AuthContext.tsx, src/components/LoginScreen.tsx, src/components/ResetPasswordScreen.tsx, src/lib/supabase.ts -->

Accounts are **Supabase Auth**. Supabase keeps the sign-in records (`auth.users`, passwords hashed) — they are not in the migrations and the app never reads a password. The session is kept in the browser under `lifescore-auth`.

**Ways to sign in** (the sign-in screen, `LoginScreen.tsx`):

- email and password;
- Google;
- GitHub.

`AuthContext` also has an email sign-in link (`signInWithMagicLink`), but no screen offers it.

**A new account** — when Supabase creates the sign-in record, the trigger `on_auth_user_created` runs `handle_new_user()`, which creates the user's `profiles` row (email, name and picture from the sign-up) and a `user_preferences` row with the defaults. Nothing else is created until the user uses the app.

**Forgotten password:**

1. **Forgot your password?** on the sign-in screen calls `resetPasswordForEmail`, with the link returning to `/auth/callback`. The screen says a link was sent whether or not the address has an account.
2. The link signs the user in for the reset only: Supabase reports `PASSWORD_RECOVERY`, `AuthContext` sets `isPasswordRecovery`, and the app shows the **Set New Password** screen in place of everything else.
3. The new password (at least 6 characters, typed twice) is saved with `updateUser`; the screen then returns to the app. **Skip — go to app** leaves the password as it was.

A password reset changes only the sign-in record; every table below is untouched.

**Deleting an account** removes the sign-in record; every table holding the user's data is linked to it and is cleared with it (section 7).

---

## 2. Tables
<!-- covers: src/types/database.ts, api/shared/supabaseAdmin.ts -->

The database is Supabase Postgres. Every table is in the `public` schema and has row-level security on (section 3).

Tables, from the migrations:

<!-- facts:tables -->
<!-- /facts:tables -->

The code that names each table:

<!-- facts:tableusage -->
<!-- /facts:tableusage -->

The columns the code is written against, from its database types (`src/types/database.ts`). Tables in the first list that are missing here are reached only by server code that does not use typed rows.

<!-- facts:columns -->
<!-- /facts:columns -->

- **Customer tables** hold one user's data, keyed by `user_id` (`profiles` by `id`): profiles, preferences, saved comparisons, Judge and Gamma reports, the report library and its share links, Olivia conversations and messages, court orders, jobs, notifications, subscriptions, usage and cost records.
- **Shared tables** hold no personal information and are reused across users: the global comparison cache, the web-research cache, finished Judge, city and movie videos, contrast images, prompts, video overrides and quota settings.
- **Not used by any screen**: the report library — `reports`, its share links (`report_shares`, `report_access_logs`) and the `reports` bucket. The code is in `src/services/reportStorageService.ts`, but nothing in the app saves a report there or opens one (`generateAndSaveEnhancedReport` is never called).
- **Admin tables**: `authorized_manual_access` (manual access) and `beta_testers` (invitations) are written only by the server; a beta tester can read their own invitation.

---

## 3. Who may read what
<!-- covers: supabase/migrations/20261004_record_live_policies.sql, supabase/migrations/20261003_entitlements_hardening.sql, api/shared/supabaseAdmin.ts -->

Row-level security is on for every public table. The policies, from the migrations:

<!-- facts:policies -->
<!-- /facts:policies -->

- **Owner-only** — on customer tables each policy compares the row's `user_id` (or, for `profiles`, its `id`) with the signed-in user, so a user reads and changes only their own rows. Olivia messages follow their conversation's owner. Auth is read once per query (`(SELECT auth.uid())`).
- **Read-only to users** — `subscriptions` and `usage_tracking` can be read by their owner but changed only by the server, so a user cannot raise their own plan or allowance. Usage is counted by `consume_usage()` (section 5).
- **Shared tables** can be read by signed-in users — the comparison cache, contrast images, quota settings and finished Judge videos by anyone — and only the server writes them. City and movie videos are readable once finished, or by the user who asked for them. Grok videos with no owner are shared finished videos.
- **Server-only** tables (`authorized_manual_access`, `api_quota_alert_log`, `tavily_context_cache`) have no policy a user can pass.
- **The server** uses the service-role key (`api/shared/supabaseAdmin.ts`), which passes every policy. It is never sent to the browser.
- **Views** run with the caller's permissions (`security_invoker`): `report_shares_public` (a shared report's public fields) and `ccpa_dns_optouts` (the Do Not Sell audit list, admin use).

---

## 4. Stored files
<!-- covers: api/shared/persistVideo.ts, src/services/reportStorageService.ts, src/services/videoStorageService.ts, api/olivia/contrast-images.ts -->

Supabase Storage keeps files that must outlive the vendors' temporary links. The buckets the code uses:

<!-- facts:buckets -->
<!-- /facts:buckets -->

| Bucket | Holds | Public | Size limit |
|---|---|---|---|
| `judge-videos` | Finished Judge videos (`avatar_videos`), copied from the video vendor | yes | 50 MB |
| `court-order-videos` | New Life and Court Order videos (`grok_videos`), copied from Kling 3 or Replicate | yes | 50 MB |
| `user-videos` | Videos a user uploads for a court order, in `{userId}/` | yes | 100 MB |
| `contrast-images` | Olivia's side-by-side city images, kept for reuse | yes | 5 MB |
| `gamma-exports` | Gamma PDF and PowerPoint exports | yes | 50 MB |
| `reports` | The report library's report pages, in `{userId}/` (no screen uses it; section 2) | no — each user reads only their own folder | 200 MB |
| `Avatars` | The Judge's narration audio, read by the video vendor | yes | none |

Bucket names are case-sensitive. `tests/storageBuckets.test.ts` checks that every bucket the code names is created by a migration, and that account deletion clears the report library's bucket.

---

## 5. Database functions
<!-- covers: api/shared/entitlements.ts, supabase/migrations/20261003_entitlements_hardening.sql, supabase/migrations/20261004_reconcile_triggers.sql -->

Functions the code calls:

<!-- facts:rpc -->
<!-- /facts:rpc -->

Functions and triggers the migrations define:

<!-- facts:dbfunctions -->
<!-- /facts:dbfunctions -->

- **`consume_usage(user, column, limit, amount)`** — checks a monthly allowance and counts the use in one locked step, so two requests at once cannot both pass the limit. A limit of -1 means unlimited; a negative amount gives uses back (a failed generation). Only the server may call it.
- **`handle_new_user()`** — creates the profile and preferences rows for a new account (section 1).
- **`increment_share_view_count(share)`** — counts a view of a shared report.
- **`get_quota_status()` / `update_provider_usage(provider, delta)`** — the admin cost dashboard's monthly provider budgets and alerts.
- **`find_cached_movie`, `find_invideo_override`** — look up a finished video to reuse instead of generating again.
- **Timestamps** — `update_updated_at_column()` and its relatives set `updated_at` on every change.
- **Olivia conversations** — two triggers run on each new message: `trg_update_conversation_on_message` adds one to the count, then `update_message_count` recounts, so the stored count is always right.

---

## 6. What the app keeps in the browser
<!-- covers: src/services/savedComparisons.ts, src/components/SettingsModal.tsx, src/components/CookieConsent.tsx -->

<!-- facts:browserstorage -->
<!-- /facts:browserstorage -->

- **Saved work** (comparisons, enhanced comparisons, Gamma and Judge reports, court orders) is kept in the browser and, for a signed-in user, in the account's tables; the two are merged when the user signs in.
- **Preferences** (weights, Law vs Lived, excluded categories, dealbreakers) are kept in the browser and saved to `user_preferences`.
- **Settings → Data → Clear Local Data** removes saved items from this browser only; the account keeps its copy.
- **Cookie and privacy choices** (`clues_cookie_consent`, `clues_ccpa_dns_optout`, with an anonymous id) are kept in the browser and logged in `consent_logs`.
- **GitHub backup** — Saved Comparisons can also copy a user's saved comparisons to a private GitHub Gist with a token the user pastes in. The token is kept for this visit only (`sessionStorage`, `lifescore_github_token`) and forgotten when the tab closes; the Gist's id (`lifescore_github_gist`, not a secret) stays so the next visit updates the same backup (`src/services/githubToken.ts`). A token an older release stored in `lifescore_github_config` is removed when the app starts.

---

## 7. Deleting an account and exporting data
<!-- covers: api/user/delete.ts, api/user/export.ts, supabase/migrations/20261003_account_deletion_foreign_keys.sql -->

- **Download My Data** (`api/user/export.ts`) gathers every customer table's rows for the user into one JSON file.
- **Delete My Account** (`api/user/delete.ts`) cancels the Stripe subscription first (if Stripe cannot be reached, nothing is deleted), removes the user's files in `user-videos/` and `reports/`, removes their beta invitation, then deletes the sign-in record. Every table holding the user's data is linked to the sign-in record and is deleted with it; shared caches and consent records keep their rows with the user removed (`ON DELETE SET NULL`).

---

## 8. Changing the database
<!-- covers: tests/schemaColumns.test.ts, tests/storageBuckets.test.ts -->

- **A change is a new file** in `supabase/migrations/`, applied to production through Supabase migrations, in file order. An applied migration is never edited.
- **Never `db push` against production** — it can drop columns production has and the migrations lack.
- **The code's types follow the tables** — a column added for the code goes in `src/types/database*.ts` with its migration; `tests/schemaColumns.test.ts` fails when a typed column has no migration that names its table.
- **Buckets** — a new bucket is created by a migration (`INSERT INTO storage.buckets`), never by hand; `tests/storageBuckets.test.ts` holds this.

**The 4 October 2026 reconciliation.** Comparing the migrations, the code and production found three migrations never applied, a bucket and policies made by hand, and columns production had that no migration made. In production that meant Gamma reports had not saved to accounts since 15 February, PDF and PowerPoint exports were not kept, and the Do Not Sell opt-out was not stored. (The report library could not save either, but no screen uses it.) Five migrations dated 20261004 put production right (adding only) and record what was made by hand, so a database built from the migrations now matches production: the same tables, policies and triggers. Two functions the migrations define were never created in production, and nothing calls them: `find_cached_grok_video` and `get_user_grok_video_count`.

Tests cannot see production. After applying a migration, compare production with the facts above (the Supabase dashboard, or `list_tables` and `pg_policies`).
