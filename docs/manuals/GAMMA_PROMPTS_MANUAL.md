# LIFE SCORE - GAMMA Prompt Templates

**Version:** 4.1
**Last Updated:** 2026-02-14
**Access:** Admin Only

---

## Overview

This manual documents the prompt templates used to generate LIFE SCORE Enhanced Freedom Relocation Guides via the Gamma AI platform. The system generates 82-page visual reports from comparison data.

---

## Prompt Architecture

### How It Works

1. **User runs Enhanced comparison** (1-5 LLMs evaluate 100 metrics across 2 cities)
2. **OPUS Judge synthesizes** consensus scores from all LLM evaluations
3. **gammaService.ts** dynamically builds an 80,000-120,000 character prompt
4. **Gamma API** receives the prompt and generates an 82-page visual report
5. **Report is delivered** with interactive slides, charts, and data visualizations

### Source of Truth

The prompt is **dynamically generated** in:
- **File:** `src/services/gammaService.ts`
- **Function:** `formatEnhancedReportForGamma()`
- **Template Reference:** `docs/GAMMA_PROMPT_TEMPLATE.md` (v4.0)

The prompt is NOT stored in the database. It is constructed in-memory from the `EnhancedComparisonResult` and `JudgeReport` data each time a report is requested.

---

## Report Sections (82 Pages)

| Section | Pages | Content |
|---------|-------|---------|
| Executive Summary | 1-4 | Winner, scores, key findings |
| Law vs Reality | 5-14 | Legal scores vs enforcement scores |
| Category Deep Dives | 15-42 | All 6 categories with 100 metrics |
| Your Life In Each City | 43-46 | Day-in-the-life scenarios |
| Personalized Recommendations | 47-49 | Based on user persona/weights |
| Surprising Findings | 50-52 | Unexpected metric differences |
| Hidden Costs | 53-55 | Financial freedom implications |
| Future Outlook | 56-59 | Trend analysis (rising/stable/declining) |
| Next Steps | 60-62 | Actionable recommendations |
| LLM Consensus | 63-67 | How the 5 LLMs agreed/disagreed |
| Gun Rights | 68-71 | Optional unscored comparison |
| Methodology | 72-75 | Scoring system explanation |
| Evidence & Closing | 76-82 | Sources and citations |

---

## 6 Category Breakdown

| Category | Metrics | Weight | Icon |
|----------|---------|--------|------|
| Personal Freedom | 15 | 20% | :statue_of_liberty: |
| Housing & Property | 20 | 20% | :house: |
| Business & Work | 25 | 20% | :briefcase: |
| Transportation | 15 | 15% | :train: |
| Policing & Courts | 15 | 15% | :scales: |
| Speech & Lifestyle | 10 | 10% | :performing_arts: |

---

## AI Models Used

| Model | Role | Provider |
|-------|------|----------|
| Claude Sonnet 4.5 | Evaluator #1 | Anthropic |
| GPT-4o | Evaluator #2 | OpenAI |
| Gemini 3 Pro | Evaluator #3 | Google |
| Grok 4 | Evaluator #4 | xAI |
| Perplexity Sonar Pro | Evaluator #5 | Perplexity |
| Claude Opus 4.5 | Final Judge | Anthropic |

---

## Visual Specifications

The prompt includes Gamma-specific layout directives:
- **semiCircle** - Gauge charts for category scores
- **barStats** - Horizontal bar comparisons
- **processSteps** - Sequential analysis flows
- **textLeftMediaRight** - Split layouts with data + visuals

### Color System
- **Winner:** Gold (#D4AF37)
- **Loser:** Sapphire Blue (#0F4C81)
- **Legal Scores:** Purple (#8B5CF6)
- **Enforcement Scores:** Teal (#14B8A6)

---

## Trophy Placement Rule (Added 2026-02-14)

The Gamma AI was incorrectly placing the 🏆 trophy emoji next to the **losing** city instead of the winner in the Executive Summary page. This was fixed by adding three explicit safeguards to the standard report prompt (`formatComparisonForGamma()` in gammaService.ts):

1. **TROPHY PLACEMENT RULE** — Added to the "CRITICAL INSTRUCTIONS FOR GAMMA AI" header section. Explicitly states: "The 🏆 trophy emoji MUST ONLY appear next to the WINNER city. NEVER place the 🏆 next to the loser."
2. **Winner marker in data table** — The winner's row in the city scores table now includes `🏆 WINNER` text so Gamma can clearly see which city won.
3. **Explicit Page 2 instruction** — The report structure instruction for Page 2 (Executive Summary) now names both the winner and loser with their scores and directs trophy placement.

**Root cause:** The original prompt provided the data table without marking the winner, and the page structure instructions simply said "executive summary" without specifying trophy placement. Gamma AI was left to interpret on its own and often placed the trophy next to the wrong city.

---

## Editing the Prompt

To modify the GAMMA report output:

1. Edit `src/services/gammaService.ts` (the runtime source)
2. Update `docs/GAMMA_PROMPT_TEMPLATE.md` (the reference doc)
3. Test with a comparison to verify Gamma renders correctly
4. Push to main and let Vercel deploy

**Important:** The `.md` template file is documentation only. The actual prompt sent to Gamma is built dynamically by `formatEnhancedReportForGamma()` in gammaService.ts.
