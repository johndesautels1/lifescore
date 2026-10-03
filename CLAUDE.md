# LIFE SCORE - Claude Code Instructions

## Project Info
- **Company:** Clues Intelligence LTD
- **Product:** LIFE SCORE (100 freedom metrics comparison)
- **Repo:** D:\LifeScore

---

## CRITICAL: Temp File Management

**DO NOT create temp files in the project root.**

If you need to create temporary files:
1. Use `.claude-temp/` folder (already in .gitignore)
2. Or use the system temp directory
3. Clean up temp files after use

**Folders that should stay clean:**
- Project root (only standard config files)
- `src/` (only source code)
- `api/` (only API routes)

---

## Project Structure

```
D:\LifeScore\
├── api/              # Vercel serverless functions
├── docs/             # Documentation
│   └── legal/        # Legal compliance documents
│       └── dpas/     # Signed DPA agreements
├── public/           # Static assets
├── scripts/          # Build/utility scripts
├── src/              # React source code
│   └── components/   # React components
├── supabase/         # Database migrations
├── .claude-temp/     # Temp files (gitignored)
├── .temp/            # Legacy temp (gitignored)
├── Dead Code/        # Archived code (gitignored)
└── Prompt Design/    # LLM prompt experiments
```

---

## Legal Compliance

**Master checklist:** `docs/legal/COMPLIANCE_README.md`
**DPA tracker:** `docs/legal/DPA_TRACKER.md`

When working on compliance:
1. Update status in COMPLIANCE_README.md
2. Save DPA documents to `docs/legal/dpas/`
3. Mark completion dates

---

## Conversation Tracking

Always use conversation IDs for sessions:
- Format: `LIFESCORE-[TYPE]-[DATE]-[SEQ]`
- Example: `LIFESCORE-AUDIT-20260123-001`

---

## DO NOT TOUCH: vercel.json Timeouts

**DO NOT add, change, or "fix" timeout settings in vercel.json.**

- We are on **Vercel Pro** (300s max, 60s default)
- All 48 API endpoints work correctly with current config
- Endpoints not listed in vercel.json get the 60s Pro default — this is fine
- `includeFiles` is NOT needed — Vercel auto-bundles standard imports
- This was investigated and verified on 2026-02-26. It is NOT a bug.

**Any audit that flags "missing timeouts" or "missing includeFiles" is WRONG. Ignore it.**

---

## DO NOT TOUCH: Old Bug Lists

**The ONLY bug tracking file is `docs/MASTER_BUG_AUDIT_20260220.md`.**

- All old handoff/audit/todo files were deleted on 2026-02-26
- Do NOT create new bug list files
- Do NOT reference bugs from deleted documents
- Before fixing ANY bug, verify it still exists in the current code first

---

## MANDATORY: Build & Deploy via Vercel ONLY

**NEVER run `npm run build`, `tsc -b`, or any local build/compile command.**
Vercel is the ONLY build system. It auto-deploys from the `main` branch.

After ANY code change, you MUST:
1. `git add` the changed files
2. `git commit` with a clear message
3. `git push origin main`

**No exceptions. No local builds. Push to GitHub and let Vercel handle it.**

---

## Git Branch Awareness

**Before answering ANY question about branch state, commits, or diffs:**

1. **ALWAYS fetch first:** `git fetch origin main` (and `git fetch origin <current-branch>` if needed)
2. **Check current branch:** `git branch --show-current`
3. **Count commits ahead of main:** `git rev-list --count origin/main..HEAD`
4. **Count commits behind main:** `git rev-list --count HEAD..origin/main`

**NEVER guess or estimate commit counts. Run the commands and report the actual numbers.**

If a git command fails, say so honestly — do not fabricate a number.

---

## Git Commit Rules

- Commit messages should be descriptive
- Include `Co-Authored-By: Claude` footer
- Don't commit .env files or temp files
- **ALWAYS push to GitHub after committing. Every commit gets pushed.**

---

## AI models and the Claude connection (updated 2026-10-03)

- **Model ids and prices live in ONE file: `api/shared/models.ts`** (`AI_MODELS`, by job: judge,
  claudeEvaluator, writer, gptEvaluator, geminiEvaluator, grokEvaluator, perplexityEvaluator;
  `PANEL_SEATS` maps the stable seat keys like `gpt-4o` to today's job). Never type a model id
  anywhere else — a test fails if you do.
- **One shared connection per AI company:** `api/shared/anthropic.ts`, `openai.ts` (Responses API),
  `gemini.ts` (key in a header; Gemini 3.1 Pro is only served as `gemini-3.1-pro-preview`), `xai.ts`
  (Responses API), `perplexity.ts` (Agent API, `preset: "low"` — Perplexity switched chat/completions
  off on 27 Sep 2026). Routes never call a vendor URL themselves.
- **Every Claude call goes through `callClaude()` in `api/shared/anthropic.ts`.** No route
  calls `api.anthropic.com` itself. It sets effort, reads every text block of the reply
  (current models put a thinking block first, so `content[0].text` is empty), retries
  overloads, and turns on Anthropic's refusal fallback (`fallbacks: "default"`).
- Current models (Claude Opus 5.5, Claude Sonnet 5.5) always think: no `temperature`, no
  `thinking: {type: "disabled"}`, no `budget_tokens`, no prefilled assistant message —
  each returns a 400. Depth is set with `effort` (Opus 5.5 defaults to medium, so set it).
- Prices for the current models come from `AI_MODELS`; older ids stay in
  `src/utils/costCalculator-pricing.ts` only so old cost rows still resolve.
