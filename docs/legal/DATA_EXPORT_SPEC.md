# Data Export Specification

**Clues Intelligence LTD** — LIFE SCORE
**Version:** 2.0 · **Last updated:** 3 October 2026
**Implements:** UK/EU GDPR Articles 15 (access) and 20 (portability); US state "right to know"

> Rewritten 2026-10-03 to describe what is built. Version 1.0 specified a ZIP of
> JSON and PDF reports behind an expiring link, from an "Account Settings →
> Privacy & Data" screen that did not exist; the route that did exist returned
> six tables. This version is the implementation.

---

## 1. Door

**Settings (header) → Data → Download My Data** — `src/components/SettingsModal.tsx`. The browser saves `lifescore-my-data-YYYY-MM-DD.json`. Failures show the server's own message (for example, the one-per-hour limit).

---

## 2. API

```
POST /api/user/export
Authorization: Bearer <the user's session token>
```

- **200** — the JSON file (`Content-Disposition: attachment`).
- **401** — no valid session. The data is always the caller's own, never an id from the request.
- **429** — more than one export an hour from one address.
- **500** `EXPORT_FAILED` — a table could not be read; no partial file is sent.

Every database read has a 10-second limit; the route has 60 seconds.

---

## 3. What the file contains

```json
{
  "exportInfo": { "generatedAt": "…", "userId": "…", "email": "…", "format": "CLUES_DATA_EXPORT_V2", "version": "2.0" },
  "profile": { … },
  "preferences": [ … ],
  "comparisons": [ … ],
  "visualReports": [ … ],
  "judgeReports": [ … ],
  "courtOrders": [ … ],
  "videos": [ … ],
  "savedReports": [ … ],
  "reportShareLinks": [ … ],
  "reportViews": [ … ],
  "subscriptions": [ … ],
  "usage": [ … ],
  "notifications": [ … ],
  "jobs": [ … ],
  "consentRecords": [ … ],
  "serviceCostRecords": [ … ],
  "betaInvitation": { … },
  "oliviaConversations": [ { "id": "…", "title": "…", "createdAt": "…", "messages": [ { "role": "…", "content": "…", "createdAt": "…" } ] } ]
}
```

Each section is every row the user owns in one table, as stored, except a share link's `password_hash`, which is never exported. The tables are listed in `USER_TABLES` in `api/user/export.ts`:

| Section | Table | Owner column |
|---|---|---|
| profile | `profiles` | `id` |
| preferences | `user_preferences` | `user_id` |
| comparisons | `comparisons` | `user_id` |
| visualReports | `gamma_reports` | `user_id` |
| judgeReports | `judge_reports` | `user_id` |
| courtOrders | `court_orders` | `user_id` |
| videos | `grok_videos` | `user_id` |
| savedReports | `reports` | `user_id` |
| reportShareLinks | `report_shares` | `shared_by` |
| reportViews | `report_access_logs` | `user_id` |
| subscriptions | `subscriptions` | `user_id` |
| usage | `usage_tracking` | `user_id` |
| notifications | `notifications` | `user_id` |
| jobs | `jobs` | `user_id` |
| consentRecords | `consent_logs` | `user_id` |
| serviceCostRecords | `api_cost_records` | `user_id` |

Plus `betaInvitation` (`beta_testers`, matched by sign-in email) and `oliviaConversations` (`olivia_conversations` with their `olivia_messages`, read in one query).

Files the user uploaded or saved (videos, report pages) are referenced by their storage paths and links inside these rows.

---

## 4. Tests

`tests/privacyRoutes.test.ts` (runs on every push): every table the migrations link to a user is exported or named with a reason; the beta invitation is exported; the password hash never is; Settings calls this route. `tests/complianceDocs.test.ts` fails if this document stops listing a table in `USER_TABLES`.

---

## 5. Related

- `ACCOUNT_DELETION_SPEC.md` — the companion "Delete My Account" route.
- `DATA_RETENTION_POLICY.md` — the retention schedule.
