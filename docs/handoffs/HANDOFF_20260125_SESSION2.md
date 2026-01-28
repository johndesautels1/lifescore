# LIFE SCORE™ Handoff Document
**Session:** 2026-01-25 Session 2
**Conversation ID:** LS-20260125-S2

---

## COMPLETED THIS SESSION

1. **Perplexity JSON Truncation Fix** - Added conciseness instructions for large categories (15+ metrics)
   - Commit: `0423c54`
   - **ISSUE:** Fix made it WORSE - now fails 3/6 categories instead of 1/6. NEEDS ROLLBACK OR DIFFERENT APPROACH.

2. **Cost Tracking Additions** - Added 7 new API pricing services
   - ElevenLabs TTS, OpenAI TTS, OpenAI TTS HD
   - Replicate SadTalker, D-ID, Simli, HeyGen
   - Commit: `da31674`

3. **Judge Video Webhook Fix** - Changed webhook URL to use stable domain
   - Added `WEBHOOK_BASE_URL` env var support
   - Commit: `5a155f9`

4. **Judge Video Polling Fix** - Added direct Replicate query via predictionId
   - Bypasses database issues
   - Commits: `bf17220`, `a241878`

5. **Supabase Table Created** - `avatar_videos` table SQL provided and user ran it

---

## CRITICAL ISSUES - NEXT SESSION

### 1. PERPLEXITY REGRESSION (HIGH PRIORITY)
**Problem:** After adding conciseness fix, Perplexity now fails 3/6 categories instead of 1/6
**Files:** `api/evaluate.ts` lines 1214-1233
**Action:** Either rollback the change or try a different approach. The conciseness instructions may be confusing the model.

### 2. OLIVIA AVATAR NOT SPEAKING (HIGH PRIORITY)
**Problem:** Olivia's mouth doesn't move when she speaks on Ask Olivia page
**Files:**
- `src/hooks/useSimli.ts` - WebRTC connection to Simli
- `src/hooks/useAvatarProvider.ts` - Provider facade
- `api/avatar/simli-speak.ts` - TTS endpoint
**Env Vars Required:**
- `VITE_SIMLI_API_KEY` (must have VITE_ prefix for browser access)
- `VITE_SIMLI_FACE_ID` (must have VITE_ prefix for browser access)
**Debug:** Check browser console when clicking "Start Video Chat" for Simli connection logs

### 3. OLIVIA FIELD KNOWLEDGE (MEDIUM PRIORITY)
**Problem:** Olivia only knows about 25 data fields, needs full 100 field knowledge
**Files:**
- `api/olivia/context.ts` - Context building for Olivia
- `src/hooks/useOliviaChat.ts` - Chat hook
**Action:** Expand the context to include all 100 LIFE SCORE metrics

### 4. SCORE CONVERGENCE ISSUE (MEDIUM PRIORITY)
**Problem:** LLM scores converge toward center (40-60 range) instead of using full 0-100 scale
**Files:** `api/evaluate.ts` - All evaluator functions
**Note:** Some models work fine, others show convergence. May need model-specific calibration.

### 5. JUDGE VIDEO NOT DISPLAYING (MEDIUM PRIORITY)
**Problem:** Replicate shows success but video doesn't play in app
**Status:** Fixed polling to use predictionId directly - needs testing after deploy
**Files:**
- `api/avatar/video-status.ts` - Status endpoint
- `src/hooks/useJudgeVideo.ts` - Client hook
- `api/avatar/generate-judge-video.ts` - Generation endpoint

---

## UI/UX ISSUES

### 6. ASK OLIVIA CHAT SCROLL POSITION
**Problem:** When Olivia responds, screen scrolls to bottom of chat. Should start at top of chat window.
**File:** `src/components/AskOlivia.tsx`
**Look for:** `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` around line 188

### 7. SAVED COMPARISONS EXPORT/IMPORT BUTTONS
**Problem:** Export and Import text too close together in top right
**Action:** Move each 1 inch toward center AND 1 inch apart from each other
**File:** Find the SavedComparisons component

### 8. SAVE FUNCTIONALITY GLITCH
**Problem:** Save is not consistently working across the app
**Files:**
- `src/services/savedComparisons.ts`
- Check localStorage vs Supabase sync

---

## NEW FEATURES REQUESTED

### 9. CITY IMAGES ON HOME PAGE
**Request:** Generate GPT API images representing each city, displayed as small framed photos below city names
**Implementation:**
- Call DALL-E or GPT-4 Vision API to generate city images
- Display below city input fields on home page
- Frame styling for photos

### 10. COMPARATIVE CITY IMAGES IN ASK OLIVIA
**Request:** Olivia can generate two comparative photos (City A vs City B) showing visual representation of field value differences
**Implementation:**
- Add button/command in Ask Olivia to generate comparative images
- Use DALL-E API to create side-by-side visualizations
- Display within chat or in dedicated panel

---

## INFRASTRUCTURE TASKS

### 11. STRIPE INSTALLATION IN SUPABASE
**Action:** Install Stripe integration in Supabase for payment processing
**Docs:** https://supabase.com/docs/guides/auth/social-login/auth-stripe

### 12. GODADDY DOMAIN POINTING TO VERCEL
**Action:** Point production domain from GoDaddy to Vercel app
**Steps:**
1. In Vercel Dashboard → Project Settings → Domains → Add domain
2. Vercel will provide DNS records (either A record or CNAME)
3. In GoDaddy DNS Management:
   - If using apex domain (example.com): Add A record pointing to Vercel's IP (76.76.21.21)
   - If using subdomain (www.example.com): Add CNAME pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours, usually faster)
5. Vercel will auto-provision SSL certificate

---

## ENVIRONMENT VARIABLES CHECKLIST

Verify these are set in Vercel:

**LLM APIs:**
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY` (Grok)
- `PERPLEXITY_API_KEY`
- `TAVILY_API_KEY`

**Avatar/Video:**
- `REPLICATE_API_TOKEN`
- `ELEVENLABS_API_KEY`
- `VITE_SIMLI_API_KEY` (MUST have VITE_ prefix)
- `VITE_SIMLI_FACE_ID` (MUST have VITE_ prefix)
- `WEBHOOK_BASE_URL` = `https://lifescore.vercel.app`

**Database:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

**Payments:**
- `STRIPE_SECRET_KEY` (needs setup)
- `STRIPE_WEBHOOK_SECRET` (needs setup)

---

## FILES MODIFIED THIS SESSION

1. `api/evaluate.ts` - Perplexity conciseness fix (CAUSED REGRESSION)
2. `src/utils/costCalculator.ts` - Added TTS/Avatar pricing
3. `api/avatar/generate-judge-video.ts` - Webhook URL fix
4. `api/avatar/video-status.ts` - Added predictionId parameter
5. `src/hooks/useJudgeVideo.ts` - Use predictionId for polling
6. `src/types/avatar.ts` - Added replicatePredictionId to JudgeVideo type

---

## PRIORITY ORDER FOR NEXT SESSION

1. **ROLLBACK Perplexity fix** - Making things worse
2. **Debug Olivia avatar** - Check browser console for Simli errors
3. **Test judge video** - After deploy, verify polling works
4. **Fix chat scroll** - Quick UI fix
5. **Fix export/import spacing** - Quick UI fix
6. **Expand Olivia's field knowledge** - Medium effort
7. **City images feature** - New development
8. **GoDaddy DNS setup** - Infrastructure
9. **Stripe integration** - Infrastructure

---

## NOTES

- User is frustrated - be direct, don't ask unnecessary questions
- User prefers action over clarification
- Supabase has timeout issues - connections can be slow
- The `avatar_videos` table was created by user via SQL
- Audio uploads to Supabase work (confirmed via URL test)
- Replicate jobs complete successfully (confirmed via dashboard)

---

*Generated: 2026-01-25*
*Next Agent: Start by checking Perplexity regression - may need to rollback commit 0423c54*
