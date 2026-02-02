# LIFE SCORE - Development Handoff Document

**Date:** January 25, 2026
**Project:** LIFE SCORE - Legal Independence & Freedom Evaluation
**Company:** Clues Intelligence LTD

---

## CRITICAL: Environment Variables to Set in Vercel

### Simli AI Video (NOT WORKING - MISSING VITE_ PREFIX!)

The Simli video connection works but returns "NO SESSION" because client-side env vars need `VITE_` prefix:

```
VITE_SIMLI_API_KEY=your_simli_api_key_here
VITE_SIMLI_FACE_ID=your_simli_face_id_here
```

**Note:** If you have `SIMLI_API_KEY` (without VITE_), rename it to `VITE_SIMLI_API_KEY`

### Developer Bypass (NEW - Just Added)

Add your email to bypass all tier restrictions:

```
VITE_DEV_BYPASS_EMAILS=your@email.com,another@email.com
```

This grants SOVEREIGN (enterprise) tier access to listed emails.

### Other Required Variables

```
# Supabase (Required)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# OpenAI (Required for Olivia)
OPENAI_API_KEY=sk-xxx

# ElevenLabs (Optional - for TTS)
ELEVENLABS_API_KEY=xxx
ELEVENLABS_OLIVIA_VOICE_ID=xxx

# D-ID (Optional - fallback avatar)
DID_API_KEY=xxx
DID_AGENT_ID=xxx

# Perplexity (for enhanced search)
PERPLEXITY_API_KEY=xxx
```

---

## Current State of Features

### Working Features

1. **City Comparison (100 metrics)** - Fully functional
2. **Olivia Voice Chat** - Working (voice + text responses)
3. **Database Sync** - Comparisons save to Supabase
4. **Authentication** - Sign up, Sign in, Password reset
5. **Saved Comparisons** - LocalStorage + Supabase sync
6. **Weight Presets** - 6 personas (Balanced, Digital Nomad, etc.)
7. **Usage Tracking** - Tier limits enforced

### Partially Working

1. **Simli AI Video Avatar**
   - WebRTC connection: WORKING
   - Video stream received: YES
   - Video displayed: NO (credentials issue)
   - Fix: Add `VITE_` prefix to Simli keys in Vercel

2. **Olivia Context**
   - 100 metrics: PASSED
   - Saved comparisons: PASSED (25 loaded)
   - Gamma reports: NOT TESTED

### Not Yet Implemented

1. **Judge Report Page** - Needs report selector dropdown
2. **Gamma Reports** - UI exists but generation not wired
3. **Payment Integration** - Stripe not connected

---

## TODO: Ask Olivia Improvements

### Current Issues

1. **Video not showing** - Fix Simli credentials (VITE_ prefix)
2. **Audio may be muted** - Added fallback to muted autoplay

### Next Steps

1. Test video after fixing env vars
2. Add visual indicator when Simli session active
3. Improve error messages for connection failures
4. Add reconnect button if connection drops

---

## TODO: Judge Report Page

### Current State

The Judge page displays a message "Run a report first" but has no way to:
- Select a saved comparison
- Upload a report
- Load from dropdown

### Required Changes

**File:** `src/components/JudgeTab.tsx` or `src/pages/JudgePage.tsx`

Add:
1. Dropdown to select from saved comparisons (like AskOlivia has)
2. "Load Report" button
3. State management to pass selected comparison to judge logic

**Reference Implementation:** See `AskOlivia.tsx` lines 503-540 for the report dropdown pattern:

```tsx
<select
  className="report-dropdown"
  value={selectedComparisonId || ''}
  onChange={(e) => setSelectedComparisonId(e.target.value || null)}
>
  <option value="">Select a report...</option>
  {savedComparisons.map((saved) => (
    <option key={saved.id} value={saved.result.comparisonId}>
      {saved.result.city1.city} vs {saved.result.city2.city}
    </option>
  ))}
</select>
```

---

## File Structure - Key Files

```
src/
├── components/
│   ├── AskOlivia.tsx          # Olivia chat interface
│   ├── AskOlivia.css          # Olivia styles
│   ├── JudgeTab.tsx           # Judge report (NEEDS WORK)
│   ├── JudgeVideo.tsx         # Judge video player
│   ├── LoginScreen.tsx        # Auth UI
│   ├── WeightPresets.tsx      # 6 persona buttons
│   ├── SavedComparisons.tsx   # Saved reports manager
│   └── FeatureGate.tsx        # Tier-based feature gating
├── hooks/
│   ├── useSimli.ts            # Simli WebRTC hook
│   ├── useOliviaChat.ts       # OpenAI chat + context
│   ├── useTierAccess.ts       # Tier/subscription logic
│   ├── useAvatarProvider.ts   # Simli/D-ID facade
│   └── useDIDStream.ts        # D-ID fallback
├── contexts/
│   └── AuthContext.tsx        # Authentication state
├── services/
│   ├── savedComparisons.ts    # Save/load comparisons
│   └── databaseService.ts     # Supabase operations
└── lib/
    └── supabase.ts            # Supabase client

api/
├── avatar/
│   ├── simli-speak.ts         # TTS -> PCM audio for Simli
│   └── simli-session.ts       # Simli credentials endpoint
├── olivia/
│   ├── chat.ts                # OpenAI chat endpoint
│   └── context.ts             # 100 metrics context builder
└── compare/
    ├── standard.ts            # Standard comparison
    └── enhanced.ts            # Enhanced comparison
```

---

## Recent Commits (Latest First)

1. `4735c7f` - Fix Simli video WebSocket message handling
2. `f579c27` - Fix AskOlivia control buttons overflow
3. `addec2a` - Fix mobile header overlap and brighten persona icons
4. `20ab4bd` - Fix SavedComparisons button overlap and faint text
5. `33347b4` - Fix auth system and improve UI visibility

---

## Known Bugs

1. **406 Error on usage_tracking** - ✅ FIXED (2026-02-02) - Changed `.single()` to `.maybeSingle()` in useTierAccess.ts
2. **Zustand deprecation warning** - `import { create } from 'zustand'` should be used
3. **Session timeout logs** - Profile fetch timeout after 15s (network/Supabase issue)

---

## Testing Checklist

After setting `VITE_DEV_BYPASS_EMAILS`:
- [ ] Login with your email
- [ ] Check console for "Developer bypass active"
- [ ] Access Enhanced Comparison (should work now)
- [ ] Access Judge Report (should work now)
- [ ] Access Gamma Reports (should work now)

After setting `VITE_SIMLI_API_KEY` and `VITE_SIMLI_FACE_ID`:
- [ ] Go to Ask Olivia
- [ ] Click "VIDEO CHAT" button
- [ ] Check console for "Received track: video"
- [ ] Video should display Olivia avatar

---

## Contact

**Developer:** John DeSautels
**Company:** Clues Intelligence LTD
**Phone:** (727) 452-3506
**Website:** cluesnomad.com
