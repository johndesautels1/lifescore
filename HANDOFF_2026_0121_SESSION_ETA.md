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

# NEW FEATURE: Judges Report

## Toolbar Button Addition
**Location:** Right side of toolbar, LEFT of "About" button

**New Button:** "Judges Report" (or "📋 Report")

## Judges Report Modal/Page Content

When user clicks "Judges Report", Opus generates a comprehensive executive summary:

### 1. Executive Summary
- Overall winner declaration with confidence level
- Key differentiators between cities
- Data quality assessment (how many LLMs contributed, coverage %)

### 2. Source Analysis
- All sources cited by LLMs, deduplicated
- Source credibility assessment
- Data freshness (2024 vs 2025 laws)
- Gaps in sourcing (metrics with no citations)

### 3. Key Findings
- Top 5 metrics where City A dominates
- Top 5 metrics where City B dominates
- Surprising findings (unexpected scores)
- Areas of high LLM agreement (trustworthy)
- Areas of high LLM disagreement (needs verification)

### 4. Future Forecast
- Pending legislation that could change scores
- Trends in each city (becoming more/less free)
- Risk factors for score changes

### 5. User Recommendations
- "If you value X, choose City A"
- "If you value Y, choose City B"
- Dealbreaker warnings based on user preferences
- Suggested follow-up research

### 6. Data Visualizations Summary
- Reference to charts/graphs generated
- Key visual insights

## Implementation Notes
- Opus should receive ALL raw LLM data + sources
- Generate report AFTER judge consensus is complete
- Cache report (don't regenerate on every view)
- Allow PDF export of report

---

# TOOLBAR LAYOUT CHANGES

## Current Layout:
```
[Ask Olivia] [Visuals] [Saved] [Export] ... [About]
```

## New Layout:
```
[Visuals] [Ask Olivia] [Saved] [Export] ... [Judges Report] [About]
```

**Changes:**
1. Move "Ask Olivia" to RIGHT of "Visuals"
2. Move "Saved" to where "Ask Olivia" was (now 3rd position)
3. Add "Judges Report" button LEFT of "About"

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

## UI Design: Option B - Expandable Row Detail (APPROVED)

Each metric row shows summary, click to expand for full LLM breakdown:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Housing, Property & HOA Control (20%)                                        [-]    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  METRIC               │  PHILADELPHIA  │  GLASGOW  │  Δ   │  LLMs  │  σ    │           │
│  ─────────────────────┼────────────────┼───────────┼──────┼────────┼───────┼───────────│
│  🏘️ HOA Prevalence    │      70        │    44     │ +26  │  5/5   │  3.2  │    [▼]    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  LLM BREAKDOWN:                                                                 │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────┐                       │   │
│  │  │ 📝Sonnet │ 🤖GPT-4o │ 💎Gemini │  𝕏Grok  │ 🔮Perplx │                       │   │
│  │  ├──────────┼──────────┼──────────┼──────────┼──────────┤                       │   │
│  │  │ Philly:70│ Philly:65│ Philly:68│ Philly:72│ Philly:70│  Median → 70         │   │
│  │  │ Glasgow:45│Glasgow:40│Glasgow:42│Glasgow:48│Glasgow:44│  Median → 44         │   │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────┘                       │   │
│  │  Sources: [Sonnet: city-code.org] [GPT-4o: zillow.com] [Gemini: hoa-laws.com]   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│  📄 HOA Docs           │      80        │    58     │ +22  │  4/5   │  2.8  │    [▶]    │
│  💰 Property Tax       │      44        │    71     │ -27  │  5/5   │  3.1  │    [▶]    │
│  🔒 Rent Control       │      58        │    82     │ -24  │  4/5   │  2.5  │    [▶]    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[▶] = Click to expand    [▼] = Expanded    LLMs = How many scored this    σ = Variance
```

**Benefits of Option B:**
1. Keeps default view clean and scannable
2. Power users can drill into any field they care about
3. Shows LLM count + variance at a glance (5/5, σ=3.2)
4. Expanded view has room for sources/evidence
5. Mobile-friendly (columns don't get too cramped)
6. User can verify consensus math: "Median of [40,45,40,42,43] = 42"

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
3. `3e25255` - Initial handoff document
4. `baa1298` - Bug E clarification (LLM breakdown at field level)
5. `[THIS COMMIT]` - Final session handoff with all features/bugs documented

---

# SESSION SUMMARY

## Completed This Session:
- [x] Fixed agreement percentage inflation bug
- [x] Fixed confidenceLevel/stdDev mismatch bug
- [x] Fixed Law vs Reality button styling
- [x] Fixed dark mode deviation level classes
- [x] Documented all critical bugs
- [x] Designed Option B expandable row UI
- [x] Documented Judges Report feature
- [x] Documented toolbar layout changes

## TODO Next Session:
- [ ] Implement Option B expandable row detail for all 100 metrics
- [ ] Add "Where LLMs AGREED" section
- [ ] Show BOTH cities in disagreement section
- [ ] Add city labels to all columns
- [ ] Implement Judges Report feature
- [ ] Reorder toolbar buttons
- [ ] Add sources to deciding factors
- [ ] Fix two inconsistent disagreement lists
- [ ] Diagnose Perplexity early timeout

---

# QUICK START NEXT SESSION

```
Read D:\LifeScore\HANDOFF_2026_0121_SESSION_ETA.md
```

Priority order:
1. Bug E - Expandable row with LLM breakdown (biggest UX gap)
2. Bug B - Add "Agreement" section
3. Bug A - Show both cities in disagreement
4. Judges Report feature
5. Toolbar reordering
