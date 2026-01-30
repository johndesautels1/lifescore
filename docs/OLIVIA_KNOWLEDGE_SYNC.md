# Olivia Knowledge Base Sync Guide

**Document ID:** LS-SYNC-001
**Last Updated:** January 30, 2026

---

## Overview

Olivia uses OpenAI's Assistants API with a knowledge base file (`OLIVIA_KNOWLEDGE_BASE.md`). When app features change, this file must be updated AND synced to OpenAI.

## The Problem

Changes to manuals or app features don't automatically reach Olivia because:
1. The knowledge base is a **static file** in the repo
2. It must be **manually uploaded** to OpenAI's Assistant platform
3. Without sync, Olivia gives outdated or incorrect answers

## Solution: Knowledge Sync Workflow

### Step 1: Update the Knowledge Base

Edit `D:\LifeScore\docs\OLIVIA_KNOWLEDGE_BASE.md` with new information.

**What to update:**
- New features (Section 36)
- Changed tier pricing/limits (Section 36.1)
- New assistants like Emilia (Section 36.3)
- Support contact changes (Section 36.5)
- Any user-facing changes Olivia should know about

### Step 2: Sync to OpenAI

Run the sync script:

```bash
cd D:\LifeScore
npx ts-node scripts/sync-olivia-knowledge.ts
```

**Requirements:**
- `OPENAI_API_KEY` environment variable must be set
- Internet connection to OpenAI API

### Step 3: Verify

Test by asking Olivia about the new feature in the app.

---

## When to Sync

**ALWAYS sync after:**
- Adding new app features
- Changing subscription tiers or pricing
- Adding new assistants (like Emilia)
- Changing domain names or support contacts
- Any Phase completion (Phase 1, 2, 3, etc.)

**Sync checklist for manual updates:**
1. [ ] Updated OLIVIA_KNOWLEDGE_BASE.md
2. [ ] Ran sync script
3. [ ] Tested Olivia responses in app

---

## Assistant Details

| Property | Value |
|----------|-------|
| Assistant ID | `asst_3wbVjyY629u7fDylaK0s5gsM` |
| Model | GPT-4 Turbo |
| Knowledge File | OLIVIA_KNOWLEDGE_BASE.md |
| Platform | https://platform.openai.com/assistants |

---

## Manual Sync (if script fails)

1. Go to https://platform.openai.com/assistants
2. Select assistant `asst_3wbVjyY629u7fDylaK0s5gsM`
3. Under "Files", delete the old knowledge base
4. Upload new `OLIVIA_KNOWLEDGE_BASE.md`
5. Save changes

---

## Future Improvement: Automated Sync

Add to CI/CD pipeline (Vercel):

```json
// vercel.json (example)
{
  "buildCommand": "npm run build && npm run sync-olivia"
}
```

```json
// package.json
{
  "scripts": {
    "sync-olivia": "ts-node scripts/sync-olivia-knowledge.ts"
  }
}
```

**Warning:** Automated sync on every deploy may cause API costs. Consider triggering only when the knowledge base file changes.

---

## Related Files

| File | Purpose |
|------|---------|
| `docs/OLIVIA_KNOWLEDGE_BASE.md` | The knowledge base (310KB) |
| `scripts/sync-olivia-knowledge.ts` | Sync script |
| `docs/OLIVIA_GPT_INSTRUCTIONS.md` | Olivia's personality/instructions |
| `api/olivia/chat.ts` | Chat API using the assistant |

---

## Troubleshooting

**"Olivia doesn't know about X feature"**
→ Check if OLIVIA_KNOWLEDGE_BASE.md includes it, then run sync

**"Sync script fails with auth error"**
→ Verify OPENAI_API_KEY is set: `echo $OPENAI_API_KEY`

**"File too large to upload"**
→ OpenAI limit is 512MB. Current file is ~310KB (well under limit)

---

*This document ensures Olivia always has current knowledge.*
