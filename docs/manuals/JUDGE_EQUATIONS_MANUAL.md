# LIFE SCORE - Mathematical Equations & Scoring Manual

**Version:** 1.3.0
**Generated:** 2026-02-26
**Purpose:** Complete technical reference for all scoring algorithms, equations, and mathematical logic

---

## Table of Contents

1. [Scoring Philosophy](#1-scoring-philosophy)
2. [Base Score Scale](#2-base-score-scale)
3. [Dual-Score System](#3-dual-score-system)
4. [Category Weights](#4-category-weights)
5. [Metric-Level Scoring](#5-metric-level-scoring)
6. [Score Aggregation Formulas](#6-score-aggregation-formulas)
7. [Law vs Lived Reality Weighting](#7-law-vs-lived-reality-weighting)
8. [Score Differentiation Algorithms](#8-score-differentiation-algorithms)
9. [Enhanced Mode Consensus](#9-enhanced-mode-consensus)
10. [Confidence Calculations](#10-confidence-calculations)
11. [THE JUDGE Analysis](#11-the-judge-analysis)
12. [Complete Formula Reference](#12-complete-formula-reference)

---

## 1. Scoring Philosophy

LIFE SCORE measures **freedom** across two dimensions:

| Dimension | Description | Score Meaning |
|-----------|-------------|---------------|
| **Legal Score** | What the written law technically says | Higher = more permissive law |
| **Enforcement Score** | How the law is actually enforced | Higher = more lenient enforcement |

**Core Principle:** These dimensions often differ significantly. A city may have strict laws (low legal score) but rarely enforce them (high enforcement score), or vice versa.

### Freedom Direction
- **Higher scores = More freedom**
- Score range: **0-100** (integers)
- All metrics normalized to this scale regardless of original data type

---

## 2. Base Score Scale

All LLM evaluations use a standardized **5-band anchor scale**:

### Legal Score Bands

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 90-100 | Fully Legal/Unrestricted | No legal barriers whatsoever |
| 70-89 | Generally Permissive | Minor limitations only |
| 50-69 | Moderate Restrictions | Some legal limits exist |
| 30-49 | Significant Restrictions | Substantial barriers |
| 0-29 | Prohibited/Illegal | Severe penalties apply |

### Enforcement Score Bands

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 90-100 | Never/Rarely Enforced | Authorities ignore violations |
| 70-89 | Low Priority | Warnings, minimal action |
| 50-69 | Selectively Enforced | Depends on situation |
| 30-49 | Usually Enforced | Regular citations/arrests |
| 0-29 | Strictly Enforced | Zero tolerance policy |

### Letter Grade Conversion (Legacy Support)

```
Grade → Score Mapping:
A = 100
B = 75
C = 50
D = 25
E/F = 0
```

**Formula:**
```
score = letterGradeMap[grade] ?? 50  // Default to C if unknown
```

---

## 3. Dual-Score System

Every metric produces **four raw scores**:

```
City 1:
  - city1LegalScore (0-100)
  - city1EnforcementScore (0-100)

City 2:
  - city2LegalScore (0-100)
  - city2EnforcementScore (0-100)
```

### Normalized Score Calculation

The **normalized score** combines Legal and Enforcement based on user preference:

**Standard Mode (Weighted Average):**
```
normalizedScore = (legalScore × lawWeight + enforcementScore × livedWeight) / 100

Where:
  lawWeight + livedWeight = 100
  Default: lawWeight = 50, livedWeight = 50
```

**Conservative Mode (Worst-Case):**
```
normalizedScore = MIN(legalScore, enforcementScore)
```

**Example:**
```
Legal Score: 80
Enforcement Score: 40
Law/Lived Ratio: 50/50

Standard Mode: (80 × 50 + 40 × 50) / 100 = 60
Conservative Mode: MIN(80, 40) = 40
```

---

## 4. Category Weights

LIFE SCORE evaluates **100 metrics** across **6 categories** with the following weights:

| Category ID | Category Name | Metrics | Weight |
|-------------|---------------|--------:|-------:|
| `personal_freedom` | Personal Autonomy | 15 | **20%** |
| `housing_property` | Housing & Property | 20 | **20%** |
| `business_work` | Business & Work | 25 | **20%** |
| `transportation` | Transportation | 15 | **15%** |
| `policing_legal` | Legal System | 15 | **15%** |
| `speech_lifestyle` | Speech & Lifestyle | 10 | **10%** |
| **TOTAL** | | **100** | **100%** |

### Category Weight Formula

```
categoryContribution = categoryAverageScore × (categoryWeight / 100)
```

**Example:**
```
Personal Freedom Average Score: 72
Personal Freedom Weight: 20%

Contribution to Total: 72 × 0.20 = 14.4 points
```

---

## 5. Metric-Level Scoring

Each metric has its own **weight within its category** and a **scoring type**.

### Metric Weight Distribution

Weights are relative within each category and used for weighted averaging:

```
Category Total Weight = SUM(metric.weight for all metrics in category)
Metric Contribution = (metricScore × metric.weight) / Category Total Weight
```

### Scoring Types

#### 1. Categorical Scoring
Discrete options with predefined scores:

```javascript
// Example: Cannabis Legality
scoringCriteria: {
  type: 'categorical',
  options: [
    { value: 'fully_legal', label: 'Fully Legal (recreational)', score: 100 },
    { value: 'medical_only', label: 'Medical Only', score: 60 },
    { value: 'decriminalized', label: 'Decriminalized', score: 40 },
    { value: 'illegal_minor', label: 'Illegal (minor penalty)', score: 20 },
    { value: 'illegal_severe', label: 'Illegal (severe penalty)', score: 0 }
  ]
}
```

#### 2. Scale Scoring
5-level graduated scale:

```javascript
// Example: LGBTQ+ Rights
scoringCriteria: {
  type: 'scale',
  levels: [
    { level: 5, label: 'Full Rights', score: 100 },
    { level: 4, label: 'Strong Rights', score: 80 },
    { level: 3, label: 'Moderate Rights', score: 60 },
    { level: 2, label: 'Limited Rights', score: 30 },
    { level: 1, label: 'No Rights/Criminalized', score: 0 }
  ]
}
```

#### 3. Boolean Scoring
Binary yes/no:

```javascript
// Example: Curfew Laws
scoringCriteria: {
  type: 'boolean'
}
// Score depends on scoringDirection:
// higher_is_better: true=0, false=100 (no curfew = more free)
// lower_is_better: true=100, false=0
```

#### 4. Range Scoring
Numeric ranges converted to 5 bands:

```javascript
// Example: Property Tax Rate (lower_is_better)
scoringCriteria: {
  type: 'range',
  minValue: 0,
  maxValue: 3  // percent
}
// Converted to:
// very_low (0-0.6%): 100 points
// low (0.6-1.2%): 80 points
// moderate (1.2-1.8%): 60 points
// high (1.8-2.4%): 40 points
// very_high (2.4-3%+): 20 points
```

### Scoring Direction

```javascript
scoringDirection: 'higher_is_better' | 'lower_is_better'
```

- **higher_is_better**: Raw value is used directly
- **lower_is_better**: Score is inverted (100 - normalizedScore)

---

## 6. Score Aggregation Formulas

### Step 1: Metric Score Aggregation

For each metric with valid data:

```
metricNormalizedScore = (legalScore × lawWeight + livedScore × livedWeight) / 100
```

### Step 2: Category Score Calculation

```javascript
function calculateCategoryScore(categoryId, metricScores) {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const metric of categoryMetrics) {
    const score = metricScores.find(m => m.metricId === metric.id);

    if (score && !score.isMissing && score.normalizedScore !== null) {
      totalWeightedScore += score.normalizedScore × metric.weight;
      totalWeight += metric.weight;
    }
    // Missing metrics are EXCLUDED, not defaulted to 50
  }

  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;
  const weightedScore = averageScore × (categoryWeight / 100);

  return { averageScore, weightedScore };
}
```

**Key Point:** Missing data is **excluded** from calculations, not defaulted to 50 (which would cause artificial score convergence).

### Step 3: Total City Score

```javascript
function calculateCityScore(categories) {
  let totalScore = 0;

  for (const category of categories) {
    totalScore += category.weightedScore;
  }

  return Math.round(totalScore);
}
```

**Formula:**
```
totalScore = Σ(categoryAverageScore × categoryWeight) for all 6 categories
```

---

## 7. Law vs Lived Reality Weighting

Users can adjust the balance between Legal and Enforcement scores:

### Default: 50/50 Balance

```
lawLivedRatio = { law: 50, lived: 50 }
```

### User-Adjustable Range

```
law: 0-100
lived: 100-law

Constraint: law + lived = 100
```

### Example Configurations

| Configuration | Law Weight | Lived Weight | Use Case |
|---------------|------------|--------------|----------|
| Default | 50 | 50 | Balanced view |
| Law Focus | 80 | 20 | Care about written law |
| Lived Focus | 20 | 80 | Care about real enforcement |
| Conservative | N/A | N/A | Uses MIN(law, lived) |

### Conservative Mode

Instead of weighted average, uses the **lower** of the two scores:

```
normalizedScore = Math.min(legalScore, enforcementScore)
```

This represents a "worst-case" scenario where you get the less favorable outcome.

---

## 8. Score Differentiation Algorithms

To prevent score convergence (cities scoring too similarly), LIFE SCORE applies differentiation bonuses:

### Category Win Bonus

```javascript
const CATEGORY_WIN_BONUS = 2;  // points per category won

// A city "wins" a category if it leads by >5 points
if (categoryScoreDiff > 5) {
  categoryWinner = leading city;
}

// Bonus calculation
city1WinBonus = city1CategoryWins × CATEGORY_WIN_BONUS;
city2WinBonus = city2CategoryWins × CATEGORY_WIN_BONUS;
```

### Max Spread Bonus

The winner of the preliminary comparison gets a bonus based on the largest category gap:

```javascript
const MAX_SPREAD_MULTIPLIER = 0.5;

// Find the largest category score difference
maxCategorySpread = MAX(|category1Score - category2Score|) for all categories

// Apply to preliminary winner only
if (city1WithWinBonus > city2WithWinBonus) {
  city1SpreadBonus = maxCategorySpread × MAX_SPREAD_MULTIPLIER;
} else {
  city2SpreadBonus = maxCategorySpread × MAX_SPREAD_MULTIPLIER;
}
```

### Final Score Calculation

```javascript
city1FinalScore = MIN(100, baseScore + winBonus + spreadBonus);
city2FinalScore = MIN(100, baseScore + winBonus + spreadBonus);
```

### Winner Determination

```javascript
const scoreDifference = |city1FinalScore - city2FinalScore|;

if (scoreDifference < 1) {
  winner = 'tie';
} else if (city1FinalScore > city2FinalScore) {
  winner = 'city1';
} else {
  winner = 'city2';
}
```

---

## 9. Enhanced Mode Consensus

Enhanced mode uses **5 LLMs** to evaluate each metric, then builds consensus:

### LLM Providers

1. **Claude Sonnet 4.5** - Primary evaluator
2. **GPT-4o** - OpenAI evaluator
3. **Gemini 3.1 Pro** - Google evaluator (with Search grounding)
4. **Grok 4** - xAI evaluator (with X/Twitter search)
5. **Perplexity Sonar** - Research evaluator (with citations)

### Consensus Score Calculation

```javascript
function calculateConsensusScore(llmScores) {
  // Filter out null/missing scores
  const validScores = llmScores.filter(s => s !== null && !isNaN(s));

  if (validScores.length === 0) return null;

  // Simple mean (can be weighted by LLM reliability)
  const sum = validScores.reduce((a, b) => a + b, 0);
  const consensusScore = sum / validScores.length;

  return Math.round(consensusScore);
}
```

### Standard Deviation Calculation

```javascript
function calculateStandardDeviation(scores) {
  const n = scores.length;
  if (n < 2) return 0;

  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;

  return Math.sqrt(variance);
}
```

### Agreement Level

```javascript
function calculateAgreementLevel(stdDev) {
  // Convert StdDev to percentage agreement (inverse relationship)
  // StdDev of 0 = 100% agreement, StdDev of 50 = 0% agreement
  const agreementPct = Math.max(0, 100 - (stdDev × 2));
  return Math.round(agreementPct);
}
```

---

## 10. Confidence Calculations

Confidence levels are determined by the **standard deviation** of LLM scores:

### Confidence Thresholds

```javascript
const CONFIDENCE_THRESHOLDS = {
  UNANIMOUS: 5,      // StdDev < 5
  STRONG: 12,        // StdDev < 12
  MODERATE: 20,      // StdDev < 20
  DISAGREEMENT_FLAG: 20  // StdDev >= 20 flagged as disagreement
};
```

### Confidence Level Function

```javascript
function getConfidenceLevel(stdDev) {
  if (stdDev < 5) return 'unanimous';
  if (stdDev < 12) return 'strong';
  if (stdDev < 20) return 'moderate';
  return 'split';
}
```

### Confidence Level Interpretation

| Level | StdDev | Meaning |
|-------|--------|---------|
| **unanimous** | < 5 | All LLMs agree within 5 points |
| **strong** | 5-11 | High agreement, minor differences |
| **moderate** | 12-19 | Some disagreement, interpret carefully |
| **split** | >= 20 | Significant disagreement, unreliable |

### Disagreement Display Names (Fixed 2026-02-27)

When metrics are flagged as disagreement areas (StdDev >= 20), they are stored as raw metric IDs (e.g., `pf_01_cannabis_legal`). The `disagreementSummary` string in `opusJudge.ts` now maps these IDs through `getMetricDisplayName()` from `src/shared/metricDisplayNames.ts` before displaying to users. This ensures the Judge Tab, Gamma reports, and Olivia narration show human-readable names (e.g., "Cannabis Legality") instead of internal codes.

### Overall Confidence

```javascript
function calculateOverallConfidence(evaluationRate) {
  if (evaluationRate >= 0.8) return 'high';    // 80%+ metrics evaluated
  if (evaluationRate >= 0.5) return 'medium';  // 50-79% evaluated
  return 'low';                                 // <50% evaluated
}
```

---

## 11. THE JUDGE Analysis

THE JUDGE (Claude Opus 4.5) provides final analysis beyond raw scores:

### Trend Analysis

For each city, THE JUDGE assesses freedom trajectory:

| Trend | Meaning | DB Value |
|-------|---------|----------|
| **rising/improving** | Recent reforms expanding freedom | `improving` |
| **stable** | No significant changes expected | `stable` |
| **declining** | Recent restrictions reducing freedom | `declining` |

**Important (Fixed 2026-02-10):** Trend values are normalized to match the database CHECK constraint. All trend values are standardized to `'improving'` (not `'rising'`) before storage to prevent constraint violations.

### Score Passing in Standard Mode (Fixed 2026-02-10)

In standard mode (single LLM), the Judge now receives actual city scores — not just consensus scores. This fix ensures the Judge's winner/loser determination matches the displayed results.

```javascript
// Previously: Judge only received consensus scores (undefined in standard mode)
// Now: Judge receives actual comparison scores in all modes
const judgeInput = {
  city1Scores: comparisonResult.city1Scores,
  city2Scores: comparisonResult.city2Scores,
  // ...
};
```

### Tie Handling (Fixed 2026-02-10, Victory Text Fix 2026-02-26)

When the comparison results in a tie (score difference < 1 point):
- The Judge no longer says "winner is TIE" in video scripts
- Tie verdicts generate a balanced analysis of both cities
- Video scripts properly reference both cities without declaring a winner
- **Victory text fix (2026-02-26):** The report verdict text now shows "evenly matched" for ties instead of blank/undefined winner text. Previously, the victory text template had no handler for the tie case (N4 fix).

### Category Analysis

For each of 6 categories:
- City 1 analysis (2-3 sentences)
- City 2 analysis (2-3 sentences)
- Trend notes

**Category Analysis Deserialization Fix (2026-02-14):**
Previously, when loading saved judge verdicts, the `category_analysis` JSONB field was not being correctly restored into the component state. This caused the 6 freedom category sections to be missing from the displayed verdict when loading from localStorage or Supabase. The fix ensures proper deserialization of saved `category_analysis` data so that all 6 category breakdowns are displayed correctly on reload.

### Executive Summary

| Field | Description |
|-------|-------------|
| recommendation | 'city1', 'city2', or 'tie' |
| rationale | 2-3 paragraph explanation |
| keyFactors | Top 5 decision factors |
| futureOutlook | 3-5 year forecast |
| confidenceLevel | 'high', 'medium', 'low' |

### Judge Override Capability

THE JUDGE can **override** raw score winners if trend analysis suggests:
- The "losing" city is improving rapidly
- The "winning" city is declining
- Political/cultural shifts will change the landscape

### Cost Tracking Fix (2026-02-14)

Accurate cost tracking for comparison evaluations:

**Perplexity API — Token Data Fix:**
- Added `stream: false` to Perplexity API calls to ensure `usage`/token data is returned in the response
- Without this flag, streaming mode does not return token counts, making cost calculation impossible

**Fallback Token Estimation:**
When token usage data is unavailable from any provider, the following estimation formula is used:
```
inputTokens = Math.ceil(promptLength / 4)
outputTokens = Math.ceil(responseLength / 4)
```

**Cost Dashboard Field-by-Field Merge:**
The cost dashboard now performs a field-by-field merge when reconciling DB and localStorage records:
```
For each service cost field:
  mergedValue = Math.max(dbValue, localStorageValue)
```
If the patched record has a higher `grandTotal` than the DB record, it is automatically re-saved to Supabase.

---

## 12. Complete Formula Reference

### Master Score Equation

```
TOTAL_SCORE = Σ [
  (
    Σ [metricScore(law, lived, ratio) × metricWeight] / Σ [metricWeight]
  ) × categoryWeight
] + winBonus + spreadBonus

Where:
  metricScore(law, lived, ratio) =
    Standard: (law × lawWeight + lived × livedWeight) / 100
    Conservative: MIN(law, lived)

  winBonus = categoryWins × 2

  spreadBonus = (isWinner ? maxCategorySpread × 0.5 : 0)

  Final capped at 100
```

### Consensus Score Equation (Enhanced Mode)

```
CONSENSUS_SCORE = MEAN(validScores from all LLMs)

STANDARD_DEVIATION = SQRT(
  Σ[(score - mean)²] / n
)

CONFIDENCE =
  'unanimous' if StdDev < 5
  'strong' if StdDev < 12
  'moderate' if StdDev < 20
  'split' if StdDev >= 20

AGREEMENT_PERCENT = MAX(0, 100 - StdDev × 2)
```

### Category Score Equation

```
CATEGORY_SCORE = (
  Σ [metricNormalizedScore × metricWeight]
) / (
  Σ [metricWeight for metrics with valid data]
)

CATEGORY_CONTRIBUTION = CATEGORY_SCORE × (categoryWeight / 100)
```

### Winner Determination

```
SCORE_DIFF = |city1Total - city2Total|

WINNER =
  'tie' if SCORE_DIFF < 1
  'city1' if city1Total > city2Total
  'city2' otherwise

CATEGORY_WINNER(cat) =
  'tie' if |cat1Score - cat2Score| < 2
  'city1' if cat1Score > cat2Score
  'city2' otherwise
```

---

## Appendix A: Sample Calculation

### Input
- City 1: Austin, Texas
- City 2: Miami, Florida
- Law/Lived Ratio: 50/50 (default)
- Mode: Standard

### Metric Example (Cannabis Legality)

```
Austin:
  Legal Score: 60 (medical only)
  Enforcement Score: 75 (low priority)
  Normalized: (60×50 + 75×50) / 100 = 67.5

Miami:
  Legal Score: 40 (illegal minor)
  Enforcement Score: 50 (selective)
  Normalized: (40×50 + 50×50) / 100 = 45
```

### Category Aggregation (Personal Freedom)

```
Austin metrics: [67.5, 80, 55, 70, 65, 85, 90, 40, 75, 80, 70, 60, 55, 100, 65]
Weights: [7, 6, 5, 5, 6, 8, 8, 5, 4, 4, 3, 3, 3, 5, 4]

Weighted sum: 67.5×7 + 80×6 + ... = 5,247.5
Total weight: 7 + 6 + 5 + ... = 76

Category average: 5,247.5 / 76 = 69.04
Category contribution: 69.04 × 0.20 = 13.81
```

### Final Scores

```
Austin:
  Base: 68.2
  Category wins: 4 (×2 = +8)
  Max spread bonus: 12 (×0.5 = +6)
  Final: MIN(100, 68.2 + 8 + 6) = 82.2 → 82

Miami:
  Base: 61.5
  Category wins: 2 (×2 = +4)
  Max spread bonus: 0 (not winner)
  Final: MIN(100, 61.5 + 4) = 65.5 → 66

Winner: Austin by 16 points
```

---

## Appendix B: Algorithm Pseudocode

### Complete Comparison Flow

```python
def compare_cities(city1, city2, options):
    # 1. Initialize
    city1_metrics = []
    city2_metrics = []
    law_weight = options.law_weight or 50
    lived_weight = 100 - law_weight

    # 2. Evaluate each category
    for category in CATEGORIES:
        metrics = get_metrics_for_category(category.id)

        # Call LLM API
        response = api_evaluate(city1, city2, metrics)

        # Process scores
        for score in response.scores:
            if options.conservative_mode:
                c1_norm = min(score.city1_legal, score.city1_enforcement)
                c2_norm = min(score.city2_legal, score.city2_enforcement)
            else:
                c1_norm = (score.city1_legal * law_weight +
                          score.city1_enforcement * lived_weight) / 100
                c2_norm = (score.city2_legal * law_weight +
                          score.city2_enforcement * lived_weight) / 100

            city1_metrics.append({
                'metric_id': score.metric_id,
                'normalized': c1_norm,
                'legal': score.city1_legal,
                'lived': score.city1_enforcement
            })
            city2_metrics.append({...})

    # 3. Calculate category scores
    city1_categories = []
    city2_categories = []

    for category in CATEGORIES:
        cat1 = calculate_category_score(category.id, city1_metrics, options.custom_weights)
        cat2 = calculate_category_score(category.id, city2_metrics, options.custom_weights)
        city1_categories.append(cat1)
        city2_categories.append(cat2)

    # 4. Calculate base totals
    city1_base = sum(cat.weighted_score for cat in city1_categories)
    city2_base = sum(cat.weighted_score for cat in city2_categories)

    # 5. Apply differentiation bonuses
    c1_wins = count_category_wins(city1_categories, city2_categories, threshold=5)
    c2_wins = count_category_wins(city2_categories, city1_categories, threshold=5)

    c1_win_bonus = c1_wins * 2
    c2_win_bonus = c2_wins * 2

    max_spread = max_category_spread(city1_categories, city2_categories)

    c1_with_bonus = city1_base + c1_win_bonus
    c2_with_bonus = city2_base + c2_win_bonus

    if c1_with_bonus > c2_with_bonus:
        c1_spread_bonus = max_spread * 0.5
        c2_spread_bonus = 0
    else:
        c1_spread_bonus = 0
        c2_spread_bonus = max_spread * 0.5

    # 6. Final scores (capped at 100)
    city1_final = min(100, round(city1_base + c1_win_bonus + c1_spread_bonus))
    city2_final = min(100, round(city2_base + c2_win_bonus + c2_spread_bonus))

    # 7. Determine winner
    diff = abs(city1_final - city2_final)
    if diff < 1:
        winner = 'tie'
    elif city1_final > city2_final:
        winner = 'city1'
    else:
        winner = 'city2'

    return {
        'city1': { 'score': city1_final, 'categories': city1_categories },
        'city2': { 'score': city2_final, 'categories': city2_categories },
        'winner': winner,
        'score_difference': diff
    }
```

---

## Appendix C: Video Generation Progress Formula (Added 2026-02-13)

The video progress bar in `useGrokVideo.ts` uses a formula that smoothly scales from 0% to 95%:

```javascript
// Each completed video contributes 50% (winner + loser = 100%)
const completedPct = (winnerDone ? 50 : 0) + (loserDone ? 50 : 0);

// Remaining percentage to fill with poll progress
const remainingPct = 100 - completedPct;

// Poll fraction: how far through the max poll attempts (capped at 90%)
const pollFraction = Math.min(pollAttempts / MAX_POLL_ATTEMPTS, 0.9);

// Progress = completed base + (remaining × poll fraction)
let progressPct = completedPct + (remainingPct * pollFraction);

// Never exceed 95% while videos are still generating
if (!winnerDone || !loserDone) {
  progressPct = Math.min(progressPct, 95);
}
```

**Previous formula (broken, capped at 73%):**
```
progressPct = 50 + min(pollAttempts * 2, 45) / 2
// Max: 50 + 45/2 = 72.5%
```

**Constants:**
- `MAX_POLL_ATTEMPTS = 120` (6 minutes at 3-second intervals)
- Poll interval: 3 seconds

---

## Appendix D: Storyboard QA Word Count Validation (Added 2026-02-14)

Storyboard QA now validates word count per scene before submission to HeyGen:

### HeyGen API Character Limit

```
MAX_TOTAL_CHARACTERS = 10,000 (per HeyGen API requirement)
```

### Per-Scene Validation

Each scene script is checked against HeyGen's API limits before render submission:

```javascript
function validateSceneWordCount(scene) {
  const charCount = scene.script.length;
  const wordCount = scene.script.split(/\s+/).length;

  // HeyGen rejects scripts that are too long per scene
  // QA validation now aligned with render validation
  return charCount <= MAX_SCENE_CHARS;
}
```

### QA-Render Alignment

Previously, QA validation and render validation used different thresholds, causing:
- Storyboards that passed QA would fail at render time with 422 errors from HeyGen
- Fix: QA validation now uses the same character count limits as the render step

---

## Appendix E: GoToMyNewCity Multi-Scene Storyboard Structure (Added 2026-02-14)

The `GoToMyNewCity` component generates a HeyGen multi-scene relocation video displayed at the bottom of the Judge page.

### Storyboard Structure

| Scene | Content | Purpose |
|-------|---------|---------|
| Scene 1 | Introduction / Welcome | Greet viewer, introduce the relocation comparison |
| Scenes 2-N | Winning city feature highlights | Each scene covers a key advantage of the winning city |
| Final Scene | CTA with Cluesnomads.com branding | Call-to-action directing viewer to Cluesnomads.com |

### Validation Pipeline

```
1. Generate storyboard from comparison data
2. Validate each scene's character count against HeyGen limits
3. Trim or split scenes that exceed per-scene character limit
4. Submit validated storyboard to HeyGen Video Generate v2 API
5. Poll for completion (5s intervals, 10-min timeout)
```

### Scene Character Validation

Each scene is validated before submission:
```
For each scene in storyboard:
  if scene.script.length > MAX_SCENE_CHARS:
    trim or split scene
  total_chars += scene.script.length

if total_chars > 10,000:
  reject storyboard (HeyGen API limit)
```

---

## Document Info

- **Generated by:** Claude Opus 4.6
- **For:** LIFE SCORE Emilia Help System
- **Source Files:**
  - `api/evaluate.ts`
  - `api/judge-report.ts`
  - `src/hooks/useComparison.ts`
  - `src/hooks/useGrokVideo.ts`
  - `src/data/metrics.ts` (barrel — actual data in `metrics-{category}.ts` files)
  - `src/constants/scoringThresholds.ts`
- **Last Updated:** 2026-02-27
- **2026-02-27 Update:** Added Disagreement Display Names section (§10) — `opusJudge.ts` now maps raw metric IDs through `getMetricDisplayName()` before user-facing display.
