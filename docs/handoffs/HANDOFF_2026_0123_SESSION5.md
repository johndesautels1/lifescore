# HANDOFF - January 23, 2026 - Session 5

**Conversation ID:** LS-AUDIT-20260123-001
**Status:** STABLE - Ready for comprehensive audit

---

## SESSION 5 SUMMARY

This session recovered from Session 4 disaster and fixed two critical bugs:

1. **Olivia GPT Instructions** - Rewrote for speech-optimized output (no markdown)
2. **Database Hanging** - Fixed with timeout + maybeSingle()
3. **D-ID Session Cleanup** - Added beforeunload handler

---

## CURRENT STATE

### Working Features
- Login/Auth (email: test@lifescore.com / password: lifescore123)
- City comparison with 100 freedom metrics
- 5 LLM evaluators + Opus judge
- Olivia AI assistant (OpenAI brain + D-ID avatar)
- Microsoft Sonia voice (lip-sync when D-ID not rate-limited)
- Gamma report generation
- Knowledge base with 200 city profiles

### Known Issues
- D-ID has session limits ("Max user sessions reached") - wait 5-10 min if hit
- Database tables may need manual profile creation for existing users

---

## KEY COMMITS

```
eca81e2 - Fix database hanging + D-ID session cleanup
43d357a - Rewrite Olivia GPT instructions for speech-optimized output
4d69920 - Add disaster recovery handoff for Session 4
fc1caa4 - Add complete Supabase database scaffolding
0407622 - Test: use Microsoft voice to isolate ElevenLabs issue
```

---

## VERCEL ENVIRONMENT VARIABLES

```
VITE_SUPABASE_URL=https://henghuunttmaowypiyhq.supabase.co
VITE_SUPABASE_ANON_KEY=[set]
DID_PRESENTER_URL=https://create-images-results.d-id.com/google-oauth2%7C106424260884380540893/upl_vGCA0WX2x0LA4chS7QIKU/image.png
DID_API_KEY=[set]
OPENAI_API_KEY=[set]
OPENAI_ASSISTANT_ID=asst_3wbVjyY629u7fDylaK0s5gsM
```

---

## TASK 1: DATABASE TESTING CHECKLIST

### Prerequisites
1. Go to https://supabase.com and log into the lifescore project
2. Open SQL Editor in Supabase dashboard

### Test 1: Verify Tables Exist
Run in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```
Expected tables: profiles, comparisons, olivia_conversations, olivia_messages, gamma_reports, user_preferences

### Test 2: Verify RLS Policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';
```
Should show policies for SELECT, INSERT, UPDATE, DELETE on each table.

### Test 3: Check Test User Profile
```sql
SELECT * FROM auth.users WHERE email = 'test@lifescore.com';
```
Note the user ID (uuid).

```sql
SELECT * FROM profiles WHERE id = '[user-id-from-above]';
```
If no profile exists, the handle_new_user trigger didn't fire. Create manually:
```sql
INSERT INTO profiles (id, email, full_name)
VALUES ('[user-id]', 'test@lifescore.com', 'Test User');
```

### Test 4: Check Trigger Exists
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Test 5: Live App Test
1. Open https://lifescore.vercel.app
2. Log in with test@lifescore.com / lifescore123
3. Open browser console (F12)
4. Look for: `[Auth] Profile loaded:` or `[Auth] No profile found`
5. If you see `[Auth] Database query timeout` - RLS policy is blocking

### Test 6: Save a Comparison
1. Run a city comparison (e.g., Austin vs Denver)
2. Click "Save" if available
3. Check Supabase: `SELECT * FROM comparisons;`

---

## TASK 2: COMPREHENSIVE CODEBASE AUDIT

### Audit Scope

#### Frontend (src/)
```
src/
├── components/          # React components
│   ├── AskOlivia.tsx   # Main Olivia chat interface
│   ├── AskOlivia.css   # Olivia styling
│   ├── CitySelector.tsx
│   └── ...
├── contexts/
│   └── AuthContext.tsx # Authentication state
├── hooks/
│   ├── useDIDStream.ts # D-ID WebRTC connection
│   ├── useOliviaChat.ts # OpenAI chat
│   ├── useTTS.ts       # Text-to-speech fallback
│   └── useVoiceRecognition.ts
├── lib/
│   └── supabase.ts     # Supabase client
├── services/
│   └── databaseService.ts # DB operations
└── types/              # TypeScript definitions
```

#### Backend (api/)
```
api/
├── olivia/
│   ├── avatar/
│   │   └── streams.ts  # D-ID Streams API
│   ├── chat.ts         # OpenAI Assistant API
│   └── tts.ts          # ElevenLabs TTS fallback
├── compare.ts          # LLM comparison endpoint
└── ...
```

#### Documentation (docs/)
```
docs/
├── OLIVIA_GPT_INSTRUCTIONS.md  # OpenAI Assistant instructions
├── OLIVIA_KNOWLEDGE_BASE.md    # 300k char knowledge base
├── handoffs/                   # Session handoffs
└── ...
```

### Audit Checklist

#### Security Audit
- [ ] No API keys in client-side code
- [ ] All sensitive ops go through /api/ endpoints
- [ ] Supabase RLS policies correctly configured
- [ ] No SQL injection vulnerabilities
- [ ] Input sanitization on user inputs
- [ ] CORS headers properly set

#### Code Quality Audit
- [ ] No console.log statements that leak sensitive data
- [ ] Proper error handling (try/catch, error boundaries)
- [ ] No memory leaks (cleanup in useEffect)
- [ ] TypeScript types properly defined
- [ ] No unused imports/variables
- [ ] Consistent code style

#### Performance Audit
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Bundle size reasonable
- [ ] API calls have timeouts
- [ ] Rate limiting implemented

#### Functionality Audit
- [ ] All 100 metrics scoring correctly
- [ ] LLM evaluators all working
- [ ] Olivia responds with correct knowledge
- [ ] Voice/lip-sync working (when D-ID available)
- [ ] Database save/load working
- [ ] Gamma reports generating

---

## TASK 3: D-ID ALTERNATIVES RESEARCH

### Why Replace D-ID?
- $0.05-0.10 per minute of video
- Session limits
- API rate limits
- Dependency on external service

### Self-Hosted Avatar Options

#### 1. SadTalker (Open Source)
- GitHub: sadtalker/SadTalker
- Generates talking head from single image + audio
- Runs on GPU (requires CUDA)
- Can self-host on cloud GPU (RunPod, Vast.ai, Lambda)
- Cost: ~$0.50/hour for GPU vs D-ID per-minute pricing

#### 2. Wav2Lip (Open Source)
- GitHub: Rudrabha/Wav2Lip
- Lip-sync any video to any audio
- Very accurate lip movements
- Requires GPU for real-time
- Can pre-render if not real-time needed

#### 3. LivePortrait (Open Source - 2024)
- GitHub: KwaiVGI/LivePortrait
- State-of-the-art single-image animation
- Supports stitching (seamless background)
- Runs on consumer GPU

#### 4. EMO (Alibaba - 2024)
- Expressive audio-driven portrait animation
- Not open source but papers available
- Very high quality

#### 5. GFPGAN + First Order Motion
- Combine face restoration with motion transfer
- Older but well-tested pipeline

### Recommended Approach for LIFE SCORE

**Option A: Hybrid (Immediate)**
- Keep D-ID for production (reliability)
- Build self-hosted for dev/testing
- Gradually migrate when self-hosted is stable

**Option B: Full Self-Host**
1. Set up GPU server (RunPod/Vast.ai)
2. Deploy SadTalker or Wav2Lip
3. Create API endpoint: POST /api/avatar/speak
4. Send audio + get video stream back
5. Replace D-ID calls with self-hosted

**Option C: Pre-rendered Responses**
- Pre-render common Olivia responses as video clips
- Only use real-time avatar for custom responses
- Dramatically reduces costs

### Architecture for Self-Hosted

```
Client                    Your Server              GPU Server
  |                           |                        |
  |-- "Speak: Hello" -------->|                        |
  |                           |-- Generate TTS audio ->|
  |                           |<- Audio file ----------|
  |                           |-- Audio + Image ------>|
  |                           |<- Video stream --------|
  |<-- Video stream ----------|                        |
```

### Cost Comparison

| Solution | Cost per Minute | Notes |
|----------|-----------------|-------|
| D-ID | $0.05-0.10 | Easy, reliable |
| Self-hosted GPU | ~$0.01-0.02 | Requires setup |
| Pre-rendered | ~$0.001 | Limited flexibility |

---

## TASK 4: FILES TO REVIEW FOR AUDIT

### Critical Files (Review First)
1. `src/contexts/AuthContext.tsx` - All auth logic
2. `api/olivia/avatar/streams.ts` - D-ID integration
3. `api/olivia/chat.ts` - OpenAI integration
4. `src/hooks/useDIDStream.ts` - WebRTC handling
5. `src/services/databaseService.ts` - All DB operations

### Configuration Files
1. `vite.config.ts` - Build config
2. `vercel.json` - Deployment config
3. `package.json` - Dependencies

### Types (Check for completeness)
1. `src/types/database.ts`
2. `src/types/metrics.ts`
3. `src/types/olivia.ts`

---

## MASTER FILE DIRECTORY

```
D:\LifeScore\
├── api/                        # Vercel serverless functions
│   ├── olivia/
│   │   ├── avatar/streams.ts   # D-ID Streams API
│   │   ├── chat.ts             # OpenAI Assistant
│   │   └── tts.ts              # ElevenLabs fallback
│   ├── compare.ts              # LLM comparison
│   └── ...
├── docs/
│   ├── OLIVIA_GPT_INSTRUCTIONS.md   # UPLOAD TO OPENAI
│   ├── OLIVIA_KNOWLEDGE_BASE.md     # UPLOAD TO OPENAI (300k chars)
│   ├── BATTLE_PLAN.md
│   ├── DATABASE_SETUP.md
│   └── handoffs/
├── src/
│   ├── components/
│   ├── contexts/AuthContext.tsx
│   ├── hooks/
│   ├── lib/supabase.ts
│   ├── services/databaseService.ts
│   └── types/
├── supabase/
│   └── migrations/001_initial_schema.sql
├── .env.example
├── package.json
└── vite.config.ts
```

---

## PROMPT TO START NEW SESSION

Copy this to start the audit session:

```
I need a comprehensive audit of the LIFE SCORE codebase.

READ FIRST:
- D:\LifeScore\docs\handoffs\HANDOFF_2026_0123_SESSION5.md

TASKS:
1. Database Testing - Run through the database testing checklist
2. Codebase Audit - Security, code quality, performance, functionality
3. D-ID Alternatives - Research self-hosted avatar solutions

Key files to examine:
- src/contexts/AuthContext.tsx
- api/olivia/avatar/streams.ts
- api/olivia/chat.ts
- src/hooks/useDIDStream.ts
- src/services/databaseService.ts

Current working state:
- App is functional but needs thorough review
- D-ID has session limits (consider alternatives)
- Database fix was just deployed (needs testing)

DO NOT make changes without approval. This is an audit/research session.
```

---

## CREDENTIALS

- Supabase Project: henghuunttmaowypiyhq
- Test User: test@lifescore.com / lifescore123
- OpenAI Assistant: asst_3wbVjyY629u7fDylaK0s5gsM

---

**END OF HANDOFF**
