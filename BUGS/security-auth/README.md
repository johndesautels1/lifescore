# SECURITY & AUTHENTICATION — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line reading of all api/*.ts, AuthContext.tsx, migrations, CORS config

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | Hardcoded credentials, auth bypass, XSS via dangerouslySetInnerHTML |
| HIGH | 5 | CORS open, API config leak, missing auth validation, PII logging |
| MEDIUM | 3 | Weak token validation, localStorage PII, Stripe init |
| **TOTAL** | **11** | |

**RLS Status:** All Supabase tables have proper Row Level Security with `auth.uid()` checks.

---

## CRITICAL VULNERABILITIES

### 1. Hardcoded Demo Credentials in Client Code
**File:** `src/contexts/AuthContext.tsx:81-85`
**Attack:** Anyone inspects source → finds admin@clues.com / admin123

```typescript
const DEMO_CREDENTIALS = [
  { email: 'demo@lifescore.com', password: 'demo123', name: 'Demo User' },
  { email: 'admin@clues.com', password: 'admin123', name: 'Admin' },
  { email: 'john@clues.com', password: 'clues2026', name: 'John D.' },
];
```

**Fix:** Remove from client entirely. Move to server-side env vars if needed for demo.
**Effort:** 15 min

### 2. Universal Password Bypass — Any Email with "lifescore"
**File:** `src/contexts/AuthContext.tsx:328-333`
**Attack:** Enter ANY email + password "lifescore" → authenticated as that user

```typescript
if (match || password === 'lifescore') {  // Line 333 — BYPASSES ALL AUTH
  const user: User = { id: crypto.randomUUID(), email: email.toLowerCase(), ... };
  localStorage.setItem('lifescore_user', JSON.stringify(user));
```

**Fix:** Remove universal password bypass. Use demo credentials list only or disable in production.
**Effort:** 10 min

### 3. XSS via Unescaped Markdown → dangerouslySetInnerHTML
**File:** `src/components/ManualViewer.tsx:38-94, 375`
**Attack:** Malicious markdown `[click](javascript:alert('xss'))` executes arbitrary JS

`markdownToHtml()` does raw regex replacements with no HTML sanitization, then output goes directly into `dangerouslySetInnerHTML`.

**Fix:** Install DOMPurify: `npm install dompurify`. Sanitize before render.
**Effort:** 30 min

---

## HIGH VULNERABILITIES

### 4. CORS Allows Any Origin on Sensitive Endpoints
**File:** `api/shared/cors.ts:30-38`
**Endpoints affected:** `/api/health`, `/api/stripe/create-portal-session`

`mode: 'open'` returns `Access-Control-Allow-Origin: *`

**Fix:** Restrict Stripe endpoint to `'restricted'` mode. Remove open CORS.
**Effort:** 10 min

### 5. Health Endpoint Leaks API Key Configuration
**File:** `api/health.ts:19-41`
**Info leaked:** Which LLM providers are active (boolean per key)

**Fix:** Remove `envStatus` from response. Return only `{ status: 'ok' }`.
**Effort:** 5 min

### 6. Judge Report Accepts userId from Request Body
**File:** `api/judge-report.ts:404-413`
**Attack:** POST with different userId → generate reports as other users

**Fix:** Extract userId from authenticated session token, not request body.
**Effort:** 30 min

### 7. PII Logged to Console in Production
**Files:** `AuthContext.tsx:136-174`, `api/user/delete.ts:95,167`, `App.tsx:689`
**Data leaked:** User IDs, emails, comparison costs

**Fix:** Remove all console.log with PII. Use error-only logging.
**Effort:** 30 min

### 8. Auth Deadlock — fetchingRef Never Resets on Hang
**File:** `src/contexts/AuthContext.tsx:129-141`

**Fix:** Add `finally { fetchingRef.current = null; }` block.
**Effort:** 5 min

---

## MEDIUM ISSUES

| # | File | Issue | Fix |
|---|------|-------|-----|
| 9 | api/consent/log.ts:96-101 | JWT extraction doesn't fail on invalid token | Acceptable for logging endpoint |
| 10 | AuthContext.tsx:196-341 | Full user object in localStorage (demo mode) | Store only session token |
| 11 | api/stripe/create-portal-session.ts:20-26 | Stripe client initialized with empty key | Check key before init |

---

## WHAT'S SECURE (Good Findings)

- All API keys read from `process.env`, not hardcoded
- RLS enabled on ALL Supabase tables with `auth.uid()` checks
- Service role bypass properly gated to webhooks/admin only
- Supabase auth session persistence enabled with auto-refresh

---

## FIX PRIORITY

| Phase | Effort | Items |
|-------|--------|-------|
| IMMEDIATE (today) | 1 hour | #1 credentials, #2 bypass, #3 XSS |
| This week | 1.5 hours | #4 CORS, #5 health leak, #6 judge auth, #7 PII |
| Next sprint | 30 min | #8-11 medium issues |

---

Co-Authored-By: Claude
