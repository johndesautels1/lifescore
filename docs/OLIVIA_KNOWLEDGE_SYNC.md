# Olivia and Emilia Knowledge — How It Reaches Them

**Document ID:** LS-SYNC-001
**Last Updated:** October 3, 2026

---

## Overview

Olivia and Emilia run on Claude (model `AI_MODELS.writer` in `api/shared/models.ts`).
They read their instructions and knowledge **straight from the deployed `docs/` files**
on every conversation (`api/shared/knowledge.ts`). There is no upload and no sync step.

Until August 2026 both ran on OpenAI's Assistants service, which needed every edit to be
uploaded with a "sync" button. OpenAI switched that service off on 26 August 2026; the
sync routes and scripts were removed on 3 October 2026.

## The files

| Assistant | File | Role |
|-----------|------|------|
| Olivia | `docs/OLIVIA_GPT_INSTRUCTIONS.md` | Who she is and how she speaks |
| Olivia | `docs/OLIVIA_KNOWLEDGE_BASE.md` | Everything she knows about LIFE SCORE |
| Emilia | `docs/EMILIA_INSTRUCTIONS.md` | Who she is and how she answers |
| Emilia | `docs/manuals/USER_MANUAL.md` | How to use every feature |
| Emilia | `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` | Support, plans, billing, contact |
| Emilia | `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md` | How the app works |
| Emilia | `docs/manuals/LEGAL_COMPLIANCE_MANUAL.md` | Privacy and data rights |
| Emilia | `docs/manuals/APP_SCHEMA_MANUAL.md` | What the app stores |

The list itself lives in `api/shared/knowledge.ts`; change it there.

## Updating what they know

1. Edit the file.
2. Commit and push to `main`.
3. Vercel deploys; the next conversation uses the new text.
4. Admin panel → Help → APIs → **Check knowledge files** confirms every file reached the
   live server, with its size.

The model names Olivia quotes ("the judge is …") are added from `AI_MODELS` at request
time, so the documents never need a model version written into them.

## Cost

The instructions and knowledge are sent as one block marked for Claude's prompt cache
(one hour). The first conversation after a change pays the full input price for it;
later messages read it from the cache at a small fraction of that.
