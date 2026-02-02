# Phase 2 Handoff - Manual Updates

**Created:** 2026-01-30
**Document ID:** LS-HANDOFF-PHASE2-001
**Previous Phase:** Phase 1 Critical Fixes (COMPLETE)
**Conversation ID:** LS-20260130-001

---

## Phase 1 Completion Summary

### Completed Tasks (6/6)

| Task | Status | Files Modified |
|------|--------|----------------|
| Fix domain names (all now clueslifescore.com) | ✅ DONE | USER_MANUAL.md, CUSTOMER_SERVICE_MANUAL.md, all code files |
| Fix password requirements | DONE | USER_MANUAL.md (L66) - now matches CSM "8+ chars, 1 uppercase, 1 number" |
| Fix environment variables | DONE | TECHNICAL_SUPPORT_MANUAL.md (L700-730) - added 17 missing vars |
| Fix database table count | DONE | TECHNICAL_SUPPORT_MANUAL.md (L242) - changed 15 to 16, added 2 tables |
| Add missing tables | DONE | Added api_quota_settings, api_quota_alert_log |
| Fix tier comparison limits | DONE | USER_MANUAL.md (L412-421), CUSTOMER_SERVICE_MANUAL.md (L81-89) |

### Version Updates Applied

| Manual | Old Version | New Version |
|--------|-------------|-------------|
| USER_MANUAL.md | 1.0 (2026-01-28) | 2.0 (2026-01-30) |
| CUSTOMER_SERVICE_MANUAL.md | 1.0 (2026-01-28) | 2.0 (2026-01-30) |
| TECHNICAL_SUPPORT_MANUAL.md | 2.0 (2026-01-30) | Already current |

---

## Phase 2 Tasks (High Priority)

### 2.1 Add Cost Dashboard Section to User Manual

**Location:** Add as new §15 after §14 FAQs

**Content to Add:**
```markdown
## 15. Cost Dashboard & Usage Monitoring

### What is the Cost Dashboard?

The Cost Dashboard shows real-time API usage across all providers. Access it by clicking the 💰 icon in the app header.

### Understanding Quota Colors

| Color | Usage Level | Meaning |
|-------|-------------|---------|
| 🟢 Green | 0-49% | Normal - plenty of quota remaining |
| 🟡 Yellow | 50-69% | Caution - over half used |
| 🟠 Orange | 70-84% | Warning - approaching limit |
| 🔴 Red | 85-99% | Critical - near limit |
| ⚫ Exceeded | 100%+ | Limit reached - fallback active |

### Quota Alerts

When quotas reach warning levels, you'll receive email alerts at:
- support@clueslifescore.com (your registered email)

### Fallback Behavior

When a provider exceeds its quota:
- **TTS:** ElevenLabs → OpenAI TTS automatically
- **Avatar:** Simli → D-ID → Replicate automatically
- You may notice slight quality or voice differences during fallback
```

### 2.2 Add Emilia Section to All Manuals

**User Manual - Add as §16:**
```markdown
## 16. Emilia Help Assistant

### Who is Emilia?

Emilia is a help widget assistant (different from Olivia). She appears as a floating help button and can:
- Answer quick questions about using LifeScore
- Guide you through features
- Provide contextual help

### Emilia vs. Olivia

| Feature | Emilia | Olivia |
|---------|--------|--------|
| Purpose | App help & guidance | Comparison analysis |
| Location | Floating widget | Dedicated tab |
| Voice | Shimmer (softer) | Nova (warm) |
| Context | App navigation | Your comparison data |
```

**Customer Service Manual - Add as §8.7:**
```markdown
### 8.7 Emilia Help Assistant

Emilia is the in-app help widget (separate from Olivia):
- Floating help button in bottom corner
- Answers questions about app features
- Uses shimmer voice (OpenAI TTS fallback)
- Does NOT have access to comparison data

**Common Support Issues:**
| Issue | Solution |
|-------|----------|
| Emilia not appearing | Check if widget blocked by ad blocker |
| Voice not playing | Check browser audio permissions |
| Wrong answers | Emilia is for app help, redirect to Olivia for comparison questions |
```

**Technical Manual - Add §3.4:**
```markdown
### 3.4 Emilia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/emilia/speak | POST | Generate TTS response (shimmer voice) |
| /api/emilia/chat | POST | Chat completion for help queries |
```

### 2.3 Update Avatar Provider Hierarchy

**Files to Update:**
- TECHNICAL_SUPPORT_MANUAL.md §2.4 (L133-134)

**Current (WRONG):**
```
| D-ID | Avatar video (legacy) |
| Simli | Avatar video (alternative) |
```

**Correct:**
```
| Simli | Avatar video (PRIMARY) |
| D-ID | Avatar video (fallback) |
```

### 2.4 Add All Missing API Endpoints

**Technical Manual §3.3 - Add these:**
```markdown
### 3.4 Emilia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/emilia/speak | POST | TTS with shimmer voice |
| /api/emilia/chat | POST | Help chat completion |

### 3.5 Usage/Quota Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/usage/check-quotas | GET | Get all quota statuses |
| /api/usage/check-quotas | POST | Update usage, trigger alerts |
| /api/usage/elevenlabs | GET | Real-time ElevenLabs usage |

### 3.6 Avatar Endpoints (Additional)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/avatar/simli-speak | POST | Simli avatar with audio |
```

### 2.5 Add Quota Alert Templates to CSM

**Customer Service Manual §10 - Add §10.5:**
```markdown
### 10.5 Quota Warning Response Template

```
Subject: Re: API Quota Warning

Hi [Name],

You received an automated alert because your LifeScore usage reached [X]% of the [Provider] monthly quota.

What this means:
- Your account is still fully functional
- If the quota is exceeded, automatic fallback providers will be used
- Service quality may vary slightly during fallback

What you can do:
- Continue using LifeScore normally (fallbacks handle quota limits)
- Quotas reset on the 1st of each month
- Contact us if you have questions about your usage

Best,
[Your Name]
LifeScore Support
```
```

### 2.6 Update Glossary in CSM

**Add to Customer Service Manual §12:**

| Term | Definition |
|------|------------|
| **Cost Dashboard** | Admin panel showing API quota usage across all providers |
| **Emilia** | In-app help widget assistant (separate from Olivia) |
| **Fallback** | Backup provider activated when primary exceeds quota |
| **Quota** | Monthly usage limit for an API provider |
| **TTS** | Text-to-Speech - converts text to spoken audio |

---

## Remaining Issues from Original Audit

### Still To Do After Phase 2:

**Phase 3 (Medium Priority):**
1. Add TTS fallback info to User Manual §6 (Olivia section)
2. Verify city count in metros.ts (claimed "200 cities")
3. Add Kling AI mentions where missing
4. Update video generation timing ("2-5 minutes" → "90-180 seconds")
5. Add annual pricing if available
6. Verify live chat availability

**Phase 4 (Low Priority):**
1. Add minor FAQ items (Enhanced mode details)
2. Verify browser support list
3. Add PWA mention if applicable
4. Minor wording improvements

---

## Verification Steps After Phase 2

1. Search all manuals for "Emilia" - should find entries in all 3
2. Search for "Cost Dashboard" - should find in all 3
3. Verify Simli listed as PRIMARY in Tech Manual
4. Check that all new API endpoints are documented
5. Verify glossary has new terms

---

## Files to Modify

```
D:\LifeScore\docs\manuals\USER_MANUAL.md
D:\LifeScore\docs\manuals\CUSTOMER_SERVICE_MANUAL.md
D:\LifeScore\docs\manuals\TECHNICAL_SUPPORT_MANUAL.md
```

---

## Quick Start for Next Agent

1. Read this handoff document
2. Start with §2.1 (Add Cost Dashboard to User Manual)
3. Work through §2.2-2.6 in order
4. Update version numbers to 2.1 when complete
5. Create Phase 3 handoff

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Claude Opus 4.5 | Phase 1 complete, Phase 2 handoff created |

---

*This handoff document contains all remaining high-priority tasks from the original 127-issue audit.*
