# LIFE SCORE - Session ETA Handoff
## Date: 2026-01-21
## Conversation ID: LIFESCORE-2026-0121-ETA

---

# FIXES COMPLETED THIS SESSION

## Fix 1: Agreement Percentage Bug (CRITICAL)
**Commit:** `7b0c249`

**Problem:** Agreement percentage (e.g., "98%") was falsely inflated because metrics with only 1 LLM score had stdDev=0, which was treated as "perfect agreement" instead of "insufficient data."

**Root Cause:** `calculateStdDev()` returns 0 for arrays with < 2 values.

**Fix Applied:**
```javascript
// api/judge.ts - NOW filters to only count metrics with 2+ LLM scores
const validConsensuses = [...city1Consensuses, ...city2Consensuses].filter(c => c.llmScores.length >= 2);
const validStdDevs = validConsensuses.map(c => c.standardDeviation);
```

**Files Changed:**
- `api/judge.ts:508-515`
- `src/services/opusJudge.ts:75-97`

---

## Fix 2: ConfidenceLevel/StdDev Mismatch Bug (CRITICAL)
**Commit:** `fc355c7`

**Problem:** Opus could override `confidenceLevel` independently of `stdDev`, causing UI to show σ=47 with "Strong" label when it should show "Split".

**Root Cause:** `mergeOpusJudgments()` allowed Opus to set confidence level.

**Fix Applied:**
- Removed `confidence` field from `OpusJudgment` interface
- Removed lines that let Opus override `confidenceLevel`
- Updated Opus prompt to not ask for confidence
- confidenceLevel now ONLY derived from stdDev via `getConfidenceLevel()`

**Files Changed:**
- `api/judge.ts:65-73` (interface)
- `api/judge.ts:402-413` (merge function)
- `api/judge.ts:341` (prompt)
- `src/components/EnhancedComparison.tsx:872, 915`

---

## Fix 3: Law vs Reality Button Styling
**Commit:** `7b0c249`

**Problem:** Law vs Reality buttons were smaller (40px) than Lived Freedom buttons (68px), no glassmorphism.

**Fix Applied:** Updated `.law-score` and `.enforce-score` CSS to match `.metric-score`:
- 68px min-width
- Glassmorphism with `::before` pseudo-elements
- Proper dark mode support

**Files Changed:**
- `src/components/EnhancedComparison.css:3891-4020`
- `src/components/EnhancedComparison.css:4149-4240` (dark mode)

---

## Fix 4: Dark Mode Deviation Level Classes
**Commit:** `7b0c249`

**Problem:** `.deviation-level.unanimous`, `.strong`, `.moderate`, `.split` had no dark mode styles - text was unreadable.

**Fix Applied:** Added dark mode styles at `EnhancedComparison.css:2343-2366`

---

# CRITICAL BUGS IDENTIFIED (NOT YET FIXED)

## Bug A: Disagreement Section Only Shows ONE City
**Location:** `src/components/EnhancedComparison.tsx` - `findDisputedMetrics()` function

**Problem:** The "Where LLMs Disagreed Most" section only shows Philadelphia metrics. It should show BOTH cities side-by-side with their differences.

**Current Code:**
```javascript
// Only looks at city1 (Philadelphia)
if (metric1.standardDeviation > 10) {
  disputed.push({...})
}
```

**Required Fix:**
- Show both cities' scores for each disputed metric
- Show the DIFFERENCE between cities
- Allow comparison of how each city scored on disputed metrics

---

## Bug B: Missing "Agreement" Section
**Problem:** We show where LLMs DISAGREED but never highlight where they AGREED. Users need to see:
- Which metrics had unanimous agreement across all LLMs
- Which metrics both CITIES scored similarly on (city-to-city agreement)
- High-confidence metrics that users can trust

**Required Fix:** Add new section "Where LLMs Strongly Agreed" showing:
- Metrics with σ < 5 (unanimous)
- Both cities' scores
- Evidence/sources for high-confidence scores

---

## Bug C: Top 5 Deciding Factors Missing City Labels
**Location:** Results display showing "Top 5 Deciding Factors"

**Problem:** The two score columns don't indicate which city is which. User sees:
```
| Metric | 75 | 42 |
```
But can't tell if 75 is Philadelphia or Glasgow.

**Required Fix:** Add city name headers to columns.

---

## Bug D: Top 5 Deciding Factors Missing Sources
**Problem:** Category-wide scores shown but no indication of WHERE this data came from. No citations or evidence.

**Required Fix:** Add source indicators or expandable evidence section for deciding factors.

---

## Bug E: Individual Field Rows Don't Show LLM Breakdown (MAJOR)
**Location:** ALL 100 metric rows in the results grid

**Problem:** When viewing ANY individual field (e.g., "Cannabis Laws"), the user sees:
```
| Cannabis Laws | Philadelphia: 65 | Glasgow: 42 |
```

But has ZERO visibility into:
- Which LLMs actually returned scores for this field?
- What did each LLM score for each city?
- How was the consensus "65" derived from individual LLM scores?

**Current State:** Only consensus scores shown. LLM breakdown is INVISIBLE at field level.

**Required State:** Every field row should show per-LLM columns:
```
| Cannabis Laws | Sonnet | GPT-4o | Gemini | Grok  | Perplexity | Consensus |
| Philadelphia  |   70   |   60   |   65   |   60  |     70     |    65     |
| Glasgow       |   40   |   45   |   40   |   42  |     43     |    42     |
```

**Data Exists But Not Displayed:**
The `MetricConsensus.llmScores` array DOES contain individual LLM scores, but the UI only shows the aggregated `consensusScore`. Need to expose this data.

**Required UI Changes:**
1. Add 5 LLM columns to each metric row (or expandable detail)
2. Show both cities' scores per LLM in each column
3. Make columns compact enough to fit (smaller buttons/text)
4. Indicate missing data (if an LLM didn't score this field)
5. Allow user to verify: "Median of [40,45,40,42,43] = 42" ✓

**Alternative: Expandable Row Detail**
If 5 columns is too wide, each row could expand to show LLM breakdown on click.

---

## Bug F: Two Inconsistent "Disagreement" Lists
**Problem:** TOP section shows "LLMs disagreed most on: Cannabis, Sex Work Laws..." but BOTTOM section shows different metrics (Curfews, Right to Work...).

**Root Cause:**
- TOP list: From `judgeOutput.disagreementAreas` (Opus can override, threshold stdDev > 15, BOTH cities)
- BOTTOM list: From `findDisputedMetrics()` (statistical, threshold stdDev > 10, city1 ONLY)

**Required Fix:**
- Remove Opus override of `disagreementAreas`
- Use same source for both lists
- Make them consistent

---

## Bug G: Summary Scores Not Verifiable
**Problem:** User sees "Score: 60" but cannot verify how this was derived from individual LLM scores.

**Example:**
```
Individual: Sonnet=60, GPT-4o=100, Gemini=20, Perplexity=100
Score: 60
```
Median of [20, 60, 100, 100] = 80, not 60. (Opus may have overridden)

**Required Fix:**
- Show calculation method (median vs Opus override)
- If Opus adjusted, indicate that
- Allow user to see raw calculation

---

# ARCHITECTURE CHANGES NEEDED

## Proposed New Section Structure

```
## LLM Consensus Analysis

### Where LLMs AGREED (NEW)
- Metrics with σ < 5 across all LLMs
- Both cities' scores shown
- High confidence badge

### Where LLMs DISAGREED
- Show BOTH cities side by side
- 5 LLM columns with paired scores (City1 | City2)
- Clear indication of which score belongs to which city
- Sources/evidence for each LLM's score

### Top Deciding Factors
- City names as column headers
- Category sources expandable
- Clear winner indication
```

## Data Structure Changes

Current `MetricConsensus.llmScores`:
```typescript
llmScores: Array<{
  llmProvider: LLMProvider;
  normalizedScore: number;  // Which city is this for?? Ambiguous!
}>
```

Required:
```typescript
llmScores: Array<{
  llmProvider: LLMProvider;
  city1Score: number;
  city2Score: number;
  city1Evidence?: Evidence[];
  city2Evidence?: Evidence[];
}>
```

---

# FILES TO MODIFY

1. **api/judge.ts** - Remove Opus override of disagreementAreas
2. **src/components/EnhancedComparison.tsx** - Major refactor of disagreement section
3. **src/types/enhancedComparison.ts** - Update data structures
4. **api/evaluate.ts** - Ensure scores are tagged with city

---

# TESTING CHECKLIST

- [ ] Agreement percentage reflects actual LLM consensus (not inflated)
- [ ] Confidence labels match displayed stdDev values
- [ ] Both cities shown in disagreement section
- [ ] City labels on all score columns
- [ ] Individual LLM scores show both cities
- [ ] Agreement section shows high-confidence metrics
- [ ] Sources visible for deciding factors
- [ ] TOP and BOTTOM disagreement lists are consistent

---

# CONTEXT FOR NEXT SESSION

The user is building a "Freedom Index" comparing cities based on 100 legal metrics across 6 categories. 5 LLMs (Claude, GPT-4o, Gemini, Grok, Perplexity) independently evaluate each metric, then Claude Opus judges consensus.

**Key Files:**
- `api/judge.ts` - Opus judge and consensus building
- `api/evaluate.ts` - LLM evaluation logic
- `src/components/EnhancedComparison.tsx` - Main results UI
- `src/services/opusJudge.ts` - Client-side result building

**Recent Issues:**
- Perplexity timing out early (not 240s limit)
- Housing category failing for one city
- Grok "failed to fetch" error (browser-level, not in code)

---

# COMMIT LOG THIS SESSION

1. `7b0c249` - Fix critical agreement calculation bug + UI improvements
2. `fc355c7` - Fix confidenceLevel/stdDev mismatch bug
3. `[PENDING]` - This handoff document
