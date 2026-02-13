# LIFE SCORE Voice & TTS Architecture

**Last Updated:** 2026-01-30
**Conversation ID:** LIFESCORE-20260130-JUDGEVIDEO-001

---

## Executive Summary

The LIFE SCORE app uses a multi-character voice system with 3 AI personas:
- **Olivia** - Primary AI advisor (warm, conversational female)
- **Emilia** - Secondary AI advisor (soft, expressive female)
- **Christiano** - Judge avatar (deep, authoritative male)

Each character has redundant TTS providers with automatic fallback to ensure voice never fails.

---

## Complete Voice Flow Table

### Character: OLIVIA

| Endpoint | Purpose | Primary TTS | Primary Voice | Fallback TTS | Fallback Voice | Fallback Triggers |
|----------|---------|-------------|---------------|--------------|----------------|-------------------|
| `api/olivia/tts.ts` | Audio-only TTS | ElevenLabs | `W0Zh57R76zl4xEJ4vCd2` | OpenAI | `nova` | 401, 429, any error |
| `api/avatar/simli-speak.ts` | Simli WebRTC avatar | ElevenLabs | `W0Zh57R76zl4xEJ4vCd2` | OpenAI | `nova` | No key, any error |
| `api/olivia/avatar/streams.ts` | D-ID WebRTC avatar | Microsoft (D-ID built-in) | `en-GB-SoniaNeural` | N/A | N/A | N/A (D-ID handles) |
| `api/olivia/avatar/heygen.ts` | HeyGen avatar | HeyGen built-in | Configurable | N/A | N/A | N/A (HeyGen handles) |

**Olivia Voice Consistency:**
- Audio-only & Simli: ElevenLabs voice → OpenAI `nova`
- D-ID Streams: Microsoft Sonia (British female)
- HeyGen: Platform-managed voice

---

### Character: EMILIA

| Endpoint | Purpose | Primary TTS | Primary Voice | Fallback TTS | Fallback Voice | Fallback Triggers |
|----------|---------|-------------|---------------|--------------|----------------|-------------------|
| `api/emilia/speak.ts` | Audio-only TTS | ElevenLabs | `21m00Tcm4TlvDq8ikWAM` (Rachel) | OpenAI | `shimmer` | 401, 429, any error |

**Emilia Voice Consistency:**
- Uses `shimmer` (not `nova`) to be distinct from Olivia

---

### Character: CHRISTIANO (Judge)

| Endpoint | Purpose | Primary TTS | Primary Voice | Fallback TTS | Fallback Voice | Fallback Triggers |
|----------|---------|-------------|---------------|--------------|----------------|-------------------|
| `api/avatar/generate-judge-video.ts` | Replicate Wav2Lip video | ElevenLabs | `ZpwpoMoU84OhcbA2YBBV` | OpenAI | `onyx` | 401, 429, any error |
| `api/judge-video.ts` | D-ID Talks video (fallback) | ElevenLabs | `ZpwpoMoU84OhcbA2YBBV` | OpenAI | `onyx` | 401, 429, no key |

**Christiano Voice Consistency:**
- Always deep, authoritative male
- ElevenLabs Christiano → OpenAI `onyx`

---

## Voice ID Reference

| Character | ElevenLabs Voice ID | OpenAI Voice | Voice Type |
|-----------|---------------------|--------------|------------|
| Olivia | `W0Zh57R76zl4xEJ4vCd2` | `nova` | Warm, conversational female |
| Emilia | `21m00Tcm4TlvDq8ikWAM` (Rachel) | `shimmer` | Soft, expressive female |
| Christiano | `ZpwpoMoU84OhcbA2YBBV` | `onyx` | Deep, authoritative male |

---

## Environment Variables

### ElevenLabs
```
ELEVENLABS_API_KEY=xxx
ELEVENLABS_OLIVIA_VOICE_ID=W0Zh57R76zl4xEJ4vCd2
ELEVENLABS_EMILIA_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_CHRISTIANO_VOICE_ID=ZpwpoMoU84OhcbA2YBBV
```

### OpenAI (Fallback)
```
OPENAI_API_KEY=xxx
# Voices are hardcoded: nova, shimmer, onyx
```

### Avatar Platforms
```
# Simli (Olivia primary)
VITE_SIMLI_API_KEY=xxx
VITE_SIMLI_FACE_ID=xxx
SIMLI_API_KEY=xxx
SIMLI_FACE_ID=xxx

# D-ID (Olivia/Judge fallback)
DID_API_KEY=xxx
DID_PRESENTER_URL=xxx
DID_JUDGE_PRESENTER_URL=xxx

# HeyGen (Olivia streaming avatar + video, Christiano avatar)
HEYGEN_API_KEY=xxx
HEYGEN_AVATAR_ID=xxx
HEYGEN_VOICE_ID=xxx
HEYGEN_CHRISTIAN_AVATAR_ID=xxx
HEYGEN_CHRISTIAN_VOICE_ID=xxx

# Replicate (Judge video)
REPLICATE_API_TOKEN=xxx
REPLICATE_DEPLOYMENT_OWNER=xxx
REPLICATE_DEPLOYMENT_NAME=xxx
CHRISTIANO_IMAGE_URL=xxx
```

---

## Fallback Chain Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OLIVIA VOICE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │ Audio Only   │    │ Simli Avatar     │    │ D-ID Avatar      │          │
│  │ /olivia/tts  │    │ /avatar/simli-*  │    │ /olivia/streams  │          │
│  └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘          │
│         │                     │                       │                     │
│         ▼                     ▼                       ▼                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │ ElevenLabs   │    │ ElevenLabs       │    │ Microsoft Sonia  │          │
│  │ W0Zh57R76... │    │ W0Zh57R76...     │    │ (D-ID built-in)  │          │
│  └──────┬───────┘    └────────┬─────────┘    └──────────────────┘          │
│         │ 401/429             │ 401/429                                     │
│         ▼                     ▼                                             │
│  ┌──────────────┐    ┌──────────────────┐                                  │
│  │ OpenAI TTS   │    │ OpenAI TTS       │                                  │
│  │ voice: nova  │    │ voice: nova      │                                  │
│  └──────────────┘    └──────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EMILIA VOICE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                           │
│  │ Audio Only   │                                                           │
│  │ /emilia/speak│                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ ElevenLabs   │                                                           │
│  │ 21m00Tcm4... │  (Rachel voice)                                          │
│  └──────┬───────┘                                                           │
│         │ 401/429                                                            │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ OpenAI TTS   │                                                           │
│  │ voice:shimmer│  (distinct from Olivia's nova)                            │
│  └──────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHRISTIANO (JUDGE) VOICE FLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐                              │
│  │ Replicate Video  │    │ D-ID Video       │                              │
│  │ /avatar/generate │    │ /judge-video     │                              │
│  │ -judge-video     │    │ (fallback)       │                              │
│  └────────┬─────────┘    └────────┬─────────┘                              │
│           │                       │                                         │
│           ▼                       ▼                                         │
│  ┌──────────────────┐    ┌──────────────────┐                              │
│  │ ElevenLabs       │    │ ElevenLabs       │                              │
│  │ ZpwpoMoU84...    │    │ ZpwpoMoU84...    │                              │
│  └────────┬─────────┘    └────────┬─────────┘                              │
│           │ 401/429               │ 401/429                                 │
│           ▼                       ▼                                         │
│  ┌──────────────────┐    ┌──────────────────┐                              │
│  │ OpenAI TTS       │    │ OpenAI TTS       │                              │
│  │ voice: onyx      │    │ voice: onyx      │                              │
│  └────────┬─────────┘    └────────┬─────────┘                              │
│           │                       │                                         │
│           ▼                       ▼                                         │
│  ┌──────────────────┐    ┌──────────────────┐                              │
│  │ Replicate        │    │ D-ID Talks API   │                              │
│  │ Wav2Lip          │    │ (lip-sync)       │                              │
│  │ (lip-sync)       │    │                  │                              │
│  └──────────────────┘    └──────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pricing Comparison

| Provider | Cost Model | Olivia | Emilia | Christiano |
|----------|------------|--------|--------|------------|
| **ElevenLabs** | $0.18/1K chars | Primary | Primary | Primary |
| **OpenAI TTS** | $0.015/1K chars | Fallback (12x cheaper) | Fallback | Fallback |
| **OpenAI TTS-HD** | $0.030/1K chars | - | - | Used for video |

### Avatar Platforms

| Platform | Cost Model | Used For |
|----------|------------|----------|
| **Simli** | $0.02/sec | Olivia real-time avatar (primary) |
| **D-ID Streams** | $0.025/sec | Olivia real-time avatar (fallback) |
| **D-ID Talks** | $0.025/sec | Judge video (fallback) |
| **Replicate Wav2Lip** | $0.0014/sec | Judge video (primary, ~18x cheaper than D-ID) |
| **HeyGen** | $0.032/sec | Deprecated |

---

## Files Reference

### API Endpoints (Server-Side)
1. `api/olivia/tts.ts` - Olivia TTS with OpenAI fallback
2. `api/emilia/speak.ts` - Emilia TTS with OpenAI fallback
3. `api/avatar/simli-speak.ts` - Simli TTS (already had fallback)
4. `api/avatar/simli-session.ts` - Simli WebRTC session
5. `api/avatar/generate-judge-video.ts` - Replicate Wav2Lip + TTS
6. `api/judge-video.ts` - D-ID Talks + TTS
7. `api/olivia/avatar/streams.ts` - D-ID Streams WebRTC
8. `api/olivia/avatar/heygen.ts` - HeyGen (deprecated)

### React Hooks (Client-Side)
1. `src/hooks/useTTS.ts` - Generic TTS playback
2. `src/hooks/useSimli.ts` - Simli avatar control
3. `src/hooks/useDIDStream.ts` - D-ID avatar control
4. `src/hooks/useAvatarProvider.ts` - Avatar selection

### Services
1. `src/services/oliviaService.ts` - Olivia API wrapper
2. `src/utils/costCalculator.ts` - Cost tracking

---

## Monitoring Gaps (FIXED)

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| ElevenLabs 401/429 crashes Judge video | FIXED | OpenAI `onyx` fallback |
| ElevenLabs 401/429 crashes Olivia TTS | FIXED | OpenAI `nova` fallback |
| ElevenLabs 401/429 crashes Emilia TTS | FIXED | OpenAI `shimmer` fallback |
| No proactive quota warnings | TODO | See `UsageWarningBanner` |
| No real-time usage monitoring | TODO | See `useApiUsageMonitor` |

---

## Next Steps

1. **Implement `UsageWarningBanner`** - Show warnings at 50%, 70%, 85% of quotas
2. **Implement `useApiUsageMonitor`** - Real-time usage tracking hook
3. **Add server-side quota checking** - Pre-flight checks before API calls
4. **Add ElevenLabs usage API integration** - Query actual remaining credits

---

*Document maintained by Claude Code*
