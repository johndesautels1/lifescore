# HANDOFF: Ask Olivia Page Audit
**Date:** 2026-01-27
**Conversation ID:** LIFESCORE-2026-0127-JUDGE-CENTER
**Priority:** HIGH

---

## CRITICAL ISSUES TO FIX

### 1. Visual Comparison AI Photos - THROWING ERRORS
**Location:** Ask Olivia page
**Problem:** Integration of AI-generated comparison photos between cities is broken
**Symptoms:** Massive errors when trying to display contrasting images

**Files to investigate:**
- `src/components/AskOlivia.tsx` - Main Olivia component
- `src/services/oliviaService.ts` - Olivia API service
- `api/olivia/` - Backend API routes for Olivia
- Look for image generation calls (DALL-E, Midjourney, Stable Diffusion, etc.)

**Action needed:**
- Find the image generation integration code
- Identify what API is being used for visual comparisons
- Debug the errors and fix the integration

### 2. Olivia Lip Sync Not Working
**Location:** Ask Olivia page - Olivia avatar
**Problem:** Olivia's lips do not move in sync with audio
**Symptoms:** Audio plays but avatar lips are static or misaligned

**Files to investigate:**
- `src/components/AskOlivia.tsx` - Avatar rendering
- `src/components/OliviaChatBubble.tsx` - Chat bubble with avatar
- `api/avatar/simli-speak.ts` - Simli avatar API (Olivia uses this)
- Check for Simli, D-ID, or HeyGen integration

**Olivia's voice ID:**
- Environment variable: `ELEVENLABS_OLIVIA_VOICE_ID`
- Default: `W0Zh57R76zl4xEJ4vCd2`

**Action needed:**
- Audit the lip sync pipeline: TTS → Avatar animation
- Check if audio and video are being synced correctly
- Verify Simli API integration is working
- Test with different audio lengths

---

## RECENT CHANGES (This Session)

1. **Judge Tab fixes:**
   - Removed 3 section headers (SUMMARY OF FINDINGS, DETAILED ANALYSIS, EXECUTIVE SUMMARY)
   - Removed THE JUDGE wordmark and tagline
   - Enlarged download buttons
   - Updated Cristiano voice ID: `ZpwpoMoU84OhcbA2YBBV`
   - Updated Cristiano image: `Cristiano.mp4` from Replicate
   - Cleared `avatar_videos` cache table in Supabase

2. **Saved comparisons fix:**
   - Enhanced comparisons now load correctly (detect by `llmsUsed`/`totalConsensusScore`)
   - Fixed `toUpperCase` crash on undefined `overallConfidence`

3. **Auth improvements:**
   - Better error messages for signup/signin
   - Guidance about email verification

4. **Supabase Pro upgrade:**
   - Reduced auth timeout from 45s to 10s
   - Database no longer sleeps

5. **Tavily cost tracking:**
   - Added `creditsUsed` to TavilyResponse
   - Tracking credits in GPT-4o evaluator
   - (Frontend integration still needed to display on Cost Dashboard)

6. **PDF export expanded:**
   - Now includes detailed metric tables for all categories
   - Added LLM consensus section

---

## ENVIRONMENT VARIABLES TO VERIFY

```
# Olivia
ELEVENLABS_OLIVIA_VOICE_ID=W0Zh57R76zl4xEJ4vCd2

# Cristiano (Judge)
ELEVENLABS_CRISTIANO_VOICE_ID=ZpwpoMoU84OhcbA2YBBV
CRISTIANO_IMAGE_URL=https://replicate.delivery/pbxt/OU2q0kEZmrGm3EB3eWU8AQ5MvYtoL4qu3sezEwj8P5FKix3o/Cristiano.mp4

# APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
SIMLI_API_KEY=
ELEVENLABS_API_KEY=
```

---

## PROJECT STRUCTURE

```
D:\lifescore\
├── src/
│   ├── components/
│   │   ├── AskOlivia.tsx        # MAIN FILE TO AUDIT
│   │   ├── OliviaChatBubble.tsx # Chat bubble avatar
│   │   ├── JudgeTab.tsx         # Judge page (just fixed)
│   │   └── ...
│   ├── services/
│   │   ├── oliviaService.ts     # Olivia API calls
│   │   └── ...
│   └── hooks/
│       └── useOliviaChat.ts     # Olivia chat hook
├── api/
│   ├── olivia/                  # Olivia backend routes
│   └── avatar/
│       ├── simli-speak.ts       # Simli avatar (Olivia)
│       └── generate-judge-video.ts # Judge video
└── HANDOFF_20260127_OLIVIA_AUDIT.md  # THIS FILE
```

---

## KNOWN WORKING FEATURES

- City comparisons (single and multi-LLM)
- Judge video generation (after cache clear)
- Cost tracking dashboard
- Saved comparisons loading
- PDF export

---

## NEXT STEPS

1. **Read** `src/components/AskOlivia.tsx` thoroughly
2. **Search** for image generation code (DALL-E, Stable Diffusion, etc.)
3. **Find** the visual comparison feature and trace the errors
4. **Audit** Simli integration for lip sync issues
5. **Test** Olivia with a simple question to reproduce errors
6. **Fix** and commit each issue separately

---

## ADMIN CREDENTIALS

- User: brokerpinellas@gmail.com
- Has developer bypass active

---

**Good luck!**
