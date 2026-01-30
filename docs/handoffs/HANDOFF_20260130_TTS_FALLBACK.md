# HANDOFF: TTS Fallback Implementation

**Date:** 2026-01-30
**Session ID:** TTS-FALLBACK-0130
**Status:** PARTIAL FIX APPLIED

---

## CRITICAL ISSUE RESOLVED

**Root Cause:** ElevenLabs quota exceeded (0 credits remaining)
- Error: `"status":"quota_exceeded","message":"You have 0 credits remaining"`
- This caused 401 errors that looked like auth failures but were actually quota limits

**Fix Applied:** Added OpenAI TTS fallback to `api/avatar/generate-judge-video.ts`
- Now tries ElevenLabs first
- If ElevenLabs fails (quota, auth, any error), falls back to OpenAI TTS
- Uses OpenAI "onyx" voice (deep authoritative male)

---

## REMAINING WORK: Add Fallback to Other TTS Files

These 4 files still need OpenAI fallback logic:

| # | File | Priority |
|---|------|----------|
| 1 | `api/olivia/tts.ts` | HIGH - Olivia voice |
| 2 | `api/emilia/speak.ts` | MEDIUM - Emilia voice |
| 3 | `api/avatar/simli-speak.ts` | MEDIUM - Simli avatar |
| 4 | `api/judge-video.ts` | LOW - D-ID fallback (already a fallback) |

### Pattern to Apply

```typescript
// Try ElevenLabs first, fallback to OpenAI if it fails
if (elevenLabsKey) {
  try {
    // ElevenLabs API call
    const response = await fetch(...);
    if (!response.ok) {
      throw new Error(`ElevenLabs failed: ${response.status}`);
    }
    return audioBuffer;
  } catch (elevenLabsError) {
    console.warn('[TTS] ElevenLabs failed, trying OpenAI fallback:', elevenLabsError);
    if (!openaiKey) {
      throw elevenLabsError;
    }
    // Fall through to OpenAI
  }
}

// OpenAI TTS fallback
if (openaiKey) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'nova', // or 'onyx' for male, 'nova' for female
      input: text,
      response_format: 'mp3',
    }),
  });
  // ... handle response
}
```

---

## ENV VARS REQUIRED

| Variable | Purpose | Status |
|----------|---------|--------|
| `ELEVENLABS_API_KEY` | Primary TTS | Set but OUT OF CREDITS |
| `OPENAI_API_KEY` | Fallback TTS | Should already be set |
| `ELEVENLABS_CHRISTIANO_VOICE_ID` | Judge voice | ZpwpoMoU84OhcbA2YBBV |
| `ELEVENLABS_OLIVIA_VOICE_ID` | Olivia voice | W0Zh57R76zl4xEJ4vCd2 |

---

## REPLICATE/SADTALKER STATUS

- Token: Updated to "lifescore" token
- Deployment: `johndesautels1/james-bond`
- Settings: Minimal for T4 GPU (256px, no enhancer, batch_size=1)
- Image: PNG at `https://replicate.delivery/pbxt/OUrlfPYTJP3dttVkSYXUps6yUmzZbLTdVdrut77q48Tx7GfI/enhanced_avatar_max.png`

---

## KNOWN ISSUES

1. **ElevenLabs quota:** User needs to add credits or upgrade plan
2. **Stuck predictions:** Some Replicate predictions may be stuck in "processing"
3. **Database records:** May need to clean up stuck avatar_videos with `DELETE FROM avatar_videos WHERE status = 'processing'`

---

## FILES MODIFIED THIS SESSION

- `api/avatar/generate-judge-video.ts` - Added OpenAI TTS fallback
- `src/services/judgePregenService.ts` - Script was shortened then reverted to original

---

## DO NOT

- Change Replicate to D-ID (user explicitly forbade this)
- Shorten the Judge script without permission
- Assume env vars are missing (they are set correctly)

---

Clues Intelligence LTD - 2026
