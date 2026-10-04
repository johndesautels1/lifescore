# LIFE SCORE Judge Equations Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-JEM-001
**For:** administrators and developers (restricted in the admin panel)

How LIFE SCORE turns what the AI evaluators find into scores, a winner and the Judge's verdict — every step, with the formulas the code uses. The categories, their weights and every metric's levels and scores are written into this manual from the code each time it is opened. Each written section names the code it explains and is brought up to date automatically when that code changes (Technical Support Manual, section 14).

The models that run each step are in the Technical Support Manual, section 5.

---

## 1. What a score means
<!-- covers: api/shared/metrics.ts -->

Every score runs from **0 to 100, and higher always means more freedom.** Each metric is judged twice for each city:

- **Law** (`legal`) — what the written law allows;
- **Enforcement** (`enforcement`, shown as "Lived") — how the law is applied in practice.

A city's score is built up in three layers: **metric → category → city.** A metric with no usable answer is left out of the averages — never counted as 0 or 50.

---

## 2. Categories and weights
<!-- covers: src/components/WeightPresets.tsx -->

<!-- facts:categories -->
<!-- /facts:categories -->

Before a comparison the user can change the category weights (**Customize Priorities** — presets or their own); the weights they choose replace the defaults for that comparison in both modes. Within a category, each metric carries its own weight (section 3).

---

## 3. How each metric is scored
<!-- covers: api/shared/metrics.ts, api/evaluate.ts -->

For each metric and each city, the evaluator chooses one **level** for the law and one for enforcement, from the metric's own list. The code turns each level into its score:

<!-- facts:scoring -->
<!-- /facts:scoring -->

- The level scores already point the freedom way, so they are used as they are.
- Metrics measured on a **range** (a rate or a count) use five bands, each a fifth of the range: 20, 40, 60, 80, 100 when a higher figure is freer, and 100, 80, 60, 40, 20 when a lower figure is freer.
- **Yes/no** metrics score 100 or 0.
- A level the metric does not have, or `insufficient_data` / `transitional`, gives **no score** for that side.
- The evaluator also gives a confidence (high, medium or low), its reasoning and its sources for each metric.

**The setting behind this.** Level scoring is on when the server setting `USE_CATEGORY_SCORING` is `true`, as it is in production (logs, 4 October 2026). With it off, the evaluators are asked for numbers from 0 to 100 against five bands (90–100 fully legal / never enforced … 0–29 prohibited / strictly enforced); the reader takes those numbers, clamps them to 0–100 and leaves out any it cannot read (`tests/evaluateParse.test.ts`).

---

## 4. Standard mode (one model)
<!-- covers: src/hooks/useComparison.ts, src/api/scoring.ts, src/shared/lawLived.ts -->

Standard mode asks one model (the `/api/evaluate` call with `claude-sonnet`), one category at a time, and does the arithmetic in the browser (`src/api/scoring.ts`, run by `tests/standardScoring.test.ts`).

**Metric score.** For each city, with law score *L*, enforcement score *E* and the user's **Law vs Lived** split (*law* % / *lived* %, default 50/50) and **Worst-Case Mode** (Conservative mode in the code):

```
metric = round( (L × law + E × lived) / 100 )
metric = round( min(L, E) )                      when Worst-Case Mode is on
```

When the evaluator rated only one half, the metric takes that half (in either setting); when it rated neither, the metric is missing (`src/shared/lawLived.ts`).

**Category score** — the weighted average of the metrics that have a score, by metric weight *wₘ*:

```
category = Σ(metric × wₘ) / Σ(wₘ)            over metrics with a score; none → no score
```

The same averaging gives a category law score and lived score, shown beside it — each over the metrics that have that half.

**City base score** — the weighted average of the categories that have a score, by their weights *w꜀* (default or the user's). A category with no score is left out and the others share its weight; with all six scored the weights add up to 100, so this is each category's share:

```
base = Σ(category × w꜀) / Σ(w꜀)            over categories with a score
```

The city's law and lived totals are averaged the same way, each over the categories that have that average.

**Differentiation** (so close cities do not blur together). Over the categories both cities have a score for:

```
wins(city)   = number of categories it leads by more than 5 points
spread       = the largest gap between the two cities in any one category
bonus(city)  = 2 × wins(city)
             + 0.5 × spread           only for the city ahead after the win bonus
final(city)  = round( min(100, base + bonus) )
```

**Winner.** The cities tie when their final scores differ by less than 1; otherwise the higher wins. A category is a tie when the two differ by less than 2, or when either city has no score for it.

**Confidence** shown for each city — how much of the 100 metrics returned a score: 80 % or more is high, 50 % or more is medium, below that low.

If a category's call fails, the comparison goes on without it and says how many metrics it shows.

---

## 5. Enhanced mode (several models and the Judge)
<!-- covers: src/services/llmEvaluators.ts, api/judge.ts, src/services/opusJudge.ts, api/shared/scoringThresholds.ts -->

Enhanced mode asks several models the same questions (Technical Support Manual, section 5), combines their answers on the server (`/api/judge`) and builds the result in the browser.

**Each model's metric score** — the same rule as Standard mode, with the user's **Law vs Lived** split and **Worst-Case Mode**:

```
model metric = round( (L × law + E × lived) / 100 )
model metric = round( min(L, E) )                Worst-Case Mode on
```

With one half missing the model's score is the other half; with neither, the model gives no answer for that metric.

**Consensus for a metric** (per city; one answer per model):

```
weight(model) = 1.0 high · 0.7 medium · 0.4 low · 0.5 none
consensus     = Σ(score × weight) / Σ(weight)          rounded
σ             = √( Σ(score − mean)² / n )               population standard deviation of the models' scores
```

Law and enforcement consensus are weighted the same way, each over the models that rated that half. A metric no model answered is left out.

**Agreement level** from σ (the limits live once, in `api/shared/scoringThresholds.ts`):

| σ | Level |
|---|---|
| below 5 | unanimous |
| below 12 | strong |
| below 20 | moderate |
| 20 or more | split |

**The Judge.** Metrics where σ is above **15** for either city are marked "high disagreement". The Judge model is shown the models' scores for every metric any model answered and may replace the consensus for a metric with its own scores and explanation; its scores are kept between 0 and 100. It never changes the agreement level, which always follows σ. It may also name the disagreement areas; the five first are shown.

**If the Judge does not answer**, partial results are built from the models alone (`partialJudgeOutput`): each metric takes the first model's score that covers it, with that model's own law and enforcement halves; its blended score stands in only for a half it did not give.

**Overall agreement** — over metrics answered by at least two models:

```
agreement = clamp( round(100 − 2 × average σ), 0, 100 )     no such metric → average σ taken as 25
```

**Category score** — weighted by metric weight over metrics with a consensus; its agreement is `100 − 2 × (weighted average σ)` over metrics with two or more answers (25 when none).

**City score** — the weighted average of the categories that have a score, by the category weights (default or the user's). A category with no score is left out and the others share its weight:

```
base = Σ(category × w꜀) / Σ(w꜀)             over categories with a score
```

**Differentiation** as in Standard mode (2 points per category won by more than 5; half the largest category gap to the leader; capped at 100). Final scores are rounded; equal rounded scores tie. A category is a tie when the two differ by less than 5, or when either has no score.

**Overall confidence**: agreement above 75 is high, above 50 medium, otherwise low.

---

## 6. The Judge's verdict
<!-- covers: api/judge-report.ts -->

The Judge's Report (`/api/judge-report`) is written by the judge model from the finished comparison. The scores stay in charge:

- **The recommendation must match the scores.** If the model recommends the lower-scoring city, the code changes the recommendation to the higher one. On an exact tie the model's choice stands.
- **Trends** for each city are one of improving, stable or declining; anything else is replaced.
- **Freedom highlights** ("why the winner wins") keep only metrics where the overall winner leads by **10 points or more** in the comparison's own scores — the model's numbers are replaced by the real ones — and drop categories left with none.

---

## 7. A worked example (Standard mode, default settings)

One metric, Cannabis Legality (weight 7 in Personal Autonomy): the evaluator chooses *Decriminalized* (40) for City A's law and *Fully Legal* (100) for its enforcement; *Illegal (minor penalty)* (20) for both sides in City B.

```
City A: (40 × 50 + 100 × 50) / 100 = 70        City B: (20 × 50 + 20 × 50) / 100 = 20
Worst-Case Mode:    City A = min(40, 100) = 40   City B = 20
```

If City A's Personal Autonomy average comes to 68 and City B's to 52, the category adds 68 × 20 / 100 = 13.6 and 10.4 to their base scores. With base scores 71.0 and 62.4, City A leading three categories by more than 5 points and City B one, and a largest gap of 22: City A = 71.0 + 6 + 11 = 88; City B = 62.4 + 2 = 64. City A wins by 24.

---

## 8. Video progress and script limits
<!-- covers: src/hooks/useGrokVideo.ts, api/shared/heygen/videoAgentRequest.ts -->

**City videos progress bar** (winner and loser videos):

```
done      = 50 if the winner video is ready + 50 if the loser video is ready
fraction  = min(polls / 120, 0.9)                 a poll every 3 seconds, 120 polls (6 minutes) at most
progress  = done + (100 − done) × fraction        held at 95 until both are ready
```

**Cristiano's video scripts** — the request's prompt is limited to 10,000 characters (`AGENT_PROMPT_LIMIT`, the vendor's limit).

---

## 9. Known faults in the scoring (4 October 2026)

Found while writing this manual, read from the code. Each changes what users see, so each waits for a ruling (or says how it was ruled); the bug list (`docs/MASTER_BUG_AUDIT_20260220.md`) carries them.

1. ~~The disagreement mark differs~~ — **fixed 4 October 2026**: the server's own copy (15) and the shared file (20, read only by tests) are now one copy at 15, the value that ran and that the judge is told; nothing users see changed (`tests/judgeConsensus.test.ts`).
2. ~~The Judge sees 30 of 100 metrics~~ — **fixed 4 October 2026** (John: "show all 100"; `tests/judgeConsensus.test.ts`).
3. ~~Enhanced mode ignores Law vs Lived and Worst-Case Mode~~ — **fixed 4 October 2026** (John: "use their settings"): the model buttons pass the user's settings to every evaluation.
4. ~~A missing side counts as 0~~ — **fixed 4 October 2026** (John: "leave it out"): a half that was not rated is left out in both modes and in the server's consensus (`src/shared/lawLived.ts`, `tests/lawLived.test.ts`).
5. ~~Standard mode counts a missing category as 0~~ — **fixed 4 October 2026** (John: "same as Enhanced"): a missing category is left out, its weight shared, and it earns no bonus (`tests/standardScoring.test.ts`).
6. ~~The numbers fallback cannot be read~~ — **fixed 4 October 2026**: the reader takes the numbers the numbers prompt asks for (no change while the setting is on, as in production).
7. ~~A second copy of the Standard-mode arithmetic~~ — **fixed 4 October 2026**: the comparison hook now uses `src/api/scoring.ts`, the copy the tests run; no change to scores.
