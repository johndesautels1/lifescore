# HANDOFF: GPT Sora Image Enhancement - Ask Olivia Page

**Date:** January 26, 2026
**Conversation ID:** SIMLI-FIX-20260126-001
**Status:** Ready for next phase

---

## Project Context

The Ask Olivia page (`src/components/AskOlivia.tsx`) features an AI avatar named Olivia powered by:
- **Simli AI** - Real-time lip-syncing avatar (WebRTC)
- **ElevenLabs** - Text-to-speech voice generation
- **OpenAI** - Chat intelligence (the "brain")

The avatar is working correctly with:
- Voice ID: `W0Zh57R76zl4xEJ4vCd2`
- Lip pacing: 50ms
- Voice speed: 1.0x

---

## Next Phase: GPT Sora Image Enhancement

### Goal
Add 2 additional display screens to the Ask Olivia page:
1. **Left/Right side panels** - Flanking Olivia's video screen
2. **Below panel** - Under Olivia's video screen

These screens will display GPT Sora-generated images/videos to enhance the conversation experience.

### Proposed Layout
```
┌─────────────────────────────────────────────────────────┐
│                    COCKPIT HEADER                        │
├──────────┬─────────────────────────┬────────────────────┤
│          │                         │                    │
│  SORA    │    OLIVIA AVATAR        │    SORA           │
│  LEFT    │    (existing video)     │    RIGHT          │
│  PANEL   │                         │    PANEL          │
│          │                         │                    │
├──────────┴─────────────────────────┴────────────────────┤
│                                                         │
│              SORA BOTTOM PANEL                          │
│         (wider, cinematic display)                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 CONTROL PANEL                           │
└─────────────────────────────────────────────────────────┘
```

### Technical Considerations

1. **Sora API Integration**
   - Will need OpenAI Sora API access
   - API endpoint for image/video generation
   - Handling async generation (Sora can take time)

2. **Display Triggers**
   - When Olivia discusses a city → show city imagery
   - When comparing metrics → show relevant visualizations
   - Contextual image generation based on conversation

3. **Files to Modify**
   - `src/components/AskOlivia.tsx` - Add new display panels
   - `src/components/AskOlivia.css` - Layout styling
   - New: `src/hooks/useSoraGeneration.ts` - Sora API hook
   - New: `api/sora/generate.ts` - Server-side Sora API calls

4. **Existing Structure Reference**
   - Olivia's video is in `.viewport-screen` div (line ~382)
   - Current layout uses CSS Grid/Flexbox
   - Cockpit/aviation theme styling

---

## Current File Locations

| Component | Path |
|-----------|------|
| Ask Olivia Page | `src/components/AskOlivia.tsx` |
| Olivia Styles | `src/components/AskOlivia.css` |
| Simli Hook | `src/hooks/useSimli.ts` |
| Olivia Chat Hook | `src/hooks/useOliviaChat.ts` |
| TTS API | `api/avatar/simli-speak.ts` |

---

## Environment Variables Needed

For Sora integration, will likely need:
- `OPENAI_API_KEY` - Already exists (used for chat)
- Sora-specific keys if separate

---

## Recent Fixes Applied

1. Simli SDK integration (replaced broken custom WebRTC)
2. Voice/lip sync tuning (50ms pacing, 1.0x speed)
3. Context reset on report switch (Olivia now sees correct report)
4. Auto-greeting disabled (was causing crashes)

---

## Notes for Next Agent

- User prefers direct action over explanations
- Commit frequently to GitHub
- The cockpit/aviation theme is intentional - maintain it
- Test on Vercel deployment after commits

---

*Handoff created by Claude Opus 4.5*
