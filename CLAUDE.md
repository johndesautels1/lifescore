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

## Git Commit Rules

- Commit messages should be descriptive
- Include `Co-Authored-By: Claude` footer
- Don't commit .env files or temp files
