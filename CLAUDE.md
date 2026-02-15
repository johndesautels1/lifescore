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
