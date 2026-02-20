# LIFE SCORE Enhanced Report - Gamma AI Prompt Template

**Version:** 4.0
**Generated For:** Gamma Support Team
**Date:** 2026-02-07

---

## OVERVIEW

This document contains the complete prompt template sent to Gamma AI for generating 82-page LIFE SCORE Enhanced Freedom Relocation Guides.

---

## PROMPT STRUCTURE

The full prompt is approximately **80,000-120,000 characters** and consists of:

1. **Header & Instructions** (~2,000 chars)
2. **Report Metadata** (~500 chars)
3. **AI Model Specifications** (~600 chars)
4. **Visual Specifications** (~1,500 chars)
5. **Color Coding Guide** (~800 chars)
6. **Section 1: Executive Summary** (~3,000 chars) - Pages 1-4
7. **Section 2: Life In Each City** (~4,000 chars) - Pages 43-46
8. **Section 3: Persona Recommendations** (~3,000 chars) - Pages 47-49
9. **Section 4: Surprising Findings** (~3,500 chars) - Pages 50-52
10. **Section 5: Law vs Reality** (~8,000 chars) - Pages 5-14
11. **Section 6: Category Deep Dives** (~25,000 chars) - Pages 15-42
12. **Section 7: Hidden Costs** (~3,000 chars) - Pages 53-55
13. **Section 8: Future Outlook** (~4,000 chars) - Pages 56-59
14. **Section 9: Next Steps** (~3,500 chars) - Pages 60-62
15. **Section 10: LLM Consensus** (~4,000 chars) - Pages 63-67
16. **Section 11: Gun Rights** (~2,500 chars) - Pages 68-71
17. **Section 12: Methodology** (~3,000 chars) - Pages 72-75
18. **Section 13: Evidence & Closing** (~5,000 chars) - Pages 76-82
19. **Final Instructions** (~500 chars)

---

## COMPLETE PROMPT TEMPLATE

```
LIFE SCORE™ ENHANCED FREEDOM RELOCATION GUIDE - GAMMA AI GENERATION INSTRUCTIONS v4.0

CRITICAL: Generate ALL 82 pages. Do NOT truncate or summarize any section.
This is a PREMIUM report with unique insights NOT available in the web UI.

================================================================================
REPORT METADATA:
================================================================================

Report Type: LIFE SCORE™ Enhanced Freedom Relocation Guide
Cities: ${city1Name}, ${city1Country} vs ${city2Name}, ${city2Country}
Winner: ${winner} (Score: ${winnerScore}/100)
Loser: ${loser} (Score: ${loserScore}/100)
Score Difference: ${scoreDifference} points
Generated: ${generatedAt}
Report ID: ${comparisonId}

================================================================================
CORRECT AI MODELS (CRITICAL - USE THESE EXACT NAMES):
================================================================================

5 LLMs Used for Evaluation:
📝 Claude Sonnet 4.5 (Anthropic) - Primary evaluator with web search
🤖 GPT-4o (OpenAI) - Cross-validation with Tavily search
💎 Gemini 3 Pro (Google) - Native Google Search grounding
𝕏 Grok 4 (xAI) - Real-time X/Twitter data integration
🔮 Sonar Reasoning Pro (Perplexity) - Deep web research

Final Judge: 🎭 Claude Opus 4.5 (Anthropic) - Synthesizes all 5 evaluations

================================================================================
VISUAL SPECIFICATIONS (USE DIVERSE VISUALS):
================================================================================

Gauges/Dials: <smart-layout variant="semiCircle"> — radial gauges for headline metrics and cost severity
Bars/Charts: <smart-layout variant="barStats"> — horizontal progress bars for heat maps (bar length = confidence)
Process Steps: <smart-layout variant="processSteps" numbered="true">
Solid Boxes: <smart-layout variant="solidBoxes"> — use sparingly, colors may not render
Outline Boxes: <smart-layout variant="outlineBoxes"> or variant="outlineBoxesWithTopCircle">
Images with Text: <smart-layout variant="imagesText" imagePosition="left">
Tables: <table colwidths="[30,35,35]">
Diagrams: <diagram type="rings"> or type="venn"> or type="target">
Labels: <labels><label variant="solid" color="#HEX">Text</label></labels>
Blockquotes: <blockquote>Quote text</blockquote>
Asides: <aside variant="note"> or variant="warning">

IMAGE LAYOUTS:
- image-layout="behind" for full-page backgrounds
- image-layout="right" or "left" for side images
- Use <columns> with two images for side-by-side comparisons

================================================================================
COLOR CODING:
================================================================================

Winner: Gold #FFD700 / Green #10B981
Loser: Blue #1E90FF
Legal Scores: Purple #6B46C1
Lived Scores: Teal #14B8A6
Agreement >90%: Dark Green #1C5D1F
Agreement 85-90%: Green #10B981
Agreement 70-85%: Yellow #FBBF24
Agreement <70%: Orange #F97316
Warning/Caution: Red #DC2626 / Orange #F97316
Success: Green #10B981
Info: Blue #3B82F6

================================================================================
REPORT SECTIONS (Generate in this order):
================================================================================

## SECTION 1: EXECUTIVE SUMMARY (Pages 1-4)

---

### PAGE 1: COVER

image-layout="behind"
prompt="dramatic cityscape comparison, ${city1Name} and ${city2Name}, modern skyline, professional photography, high contrast"

# LIFE SCORE™
## Legal Independence & Freedom Evaluation

<display size="xl" color="#FFD700">${city1Name} vs ${city2Name}</display>

<labels>
<label variant="solid" color="#10B981">📊 100 Metrics Analyzed</label>
<label variant="solid" color="#6B46C1">🤖 5 AI Models Verified</label>
<label variant="solid" color="#14B8A6">⚖️ Judge: Claude Opus 4.5</label>
</labels>

**Generated:** ${generatedAt}
**Report ID:** ${comparisonId}

*LIFE SCORE™ by Clues Intelligence LTD*

---

### PAGE 2: THE VERDICT

<display size="xl" color="#FFD700">🏆 ${winner} WINS</display>

<smart-layout variant="semiCircle">
<item label="${city1Name}" value="${city1Score}" max="100" color="${city1Color}"/>
<item label="${city2Name}" value="${city2Score}" max="100" color="${city2Color}"/>
</smart-layout>

**Score Difference:** ${scoreDifference} points

<blockquote>
"${judgeQuote}"
— Claude Opus 4.5, Final Judge
</blockquote>

---

### PAGE 3: CATEGORY SHOWDOWN

<table colwidths="[20,15,15,25,25]">
| Category | ${city1Name} | ${city2Name} | Winner | Key Insight |
|----------|-------------|-------------|--------|-------------|
| 🗽 Personal | ${cat1Score1} | ${cat1Score2} | ${cat1Winner} | ${cat1Insight} |
| 🏠 Housing | ${cat2Score1} | ${cat2Score2} | ${cat2Winner} | ${cat2Insight} |
| 💼 Business | ${cat3Score1} | ${cat3Score2} | ${cat3Winner} | ${cat3Insight} |
| 🚇 Transport | ${cat4Score1} | ${cat4Score2} | ${cat4Winner} | ${cat4Insight} |
| ⚖️ Policing | ${cat5Score1} | ${cat5Score2} | ${cat5Winner} | ${cat5Insight} |
| 🎭 Speech | ${cat6Score1} | ${cat6Score2} | ${cat6Winner} | ${cat6Insight} |
</table>

---

### PAGE 4: TABLE OF CONTENTS

## What's Inside This 82-Page Report

<smart-layout variant="outlineBoxes">
<item label="📊 Executive Summary" subtitle="Pages 1-4">The verdict and key insights</item>
<item label="🌅 Your Life In Each City" subtitle="Pages 43-46">What daily life actually looks like</item>
<item label="👤 Personalized Recommendations" subtitle="Pages 47-49">Based on your profile type</item>
<item label="🎯 Surprising Findings" subtitle="Pages 50-52">Things that may shock you</item>
<item label="📋 Category Deep Dives" subtitle="Pages 5-42">All 6 categories with 100 metrics</item>
<item label="💰 Hidden Costs of Freedom" subtitle="Pages 53-55">Financial trade-offs</item>
<item label="🔮 Future Outlook" subtitle="Pages 56-59">5-year trajectory</item>
<item label="🗺️ Next Steps" subtitle="Pages 60-62">Your action plan</item>
<item label="🤖 LLM Consensus" subtitle="Pages 63-67">How AI models agreed/disagreed</item>
<item label="🔫 Gun Rights (Optional)" subtitle="Pages 68-71">Unscored factual comparison</item>
<item label="📚 Methodology" subtitle="Pages 72-75">How LIFE SCORE works</item>
<item label="📎 Evidence & Citations" subtitle="Pages 76-82">Sources and legal notices</item>
</smart-layout>

================================================================================
## SECTION 4: YOUR LIFE IN EACH CITY (Pages 43-46)
================================================================================

---

### PAGE 43: A WEEK IN ${city1Name.toUpperCase()}

image-layout="behind"
prompt="beautiful morning cityscape of ${city1Name}, lifestyle photography, warm golden hour light"

# 🌅 A Week Living in ${city1Name}

**Monday Morning:**
You wake up in ${city1Name}, ${city1Country}. The city offers ${housingDesc1}...

[Detailed narrative about daily life, housing, transit, business environment]

---

### PAGE 44: A WEEK IN ${city2Name.toUpperCase()}

image-layout="behind"
prompt="beautiful morning cityscape of ${city2Name}, lifestyle photography, warm golden hour light"

# 🌅 A Week Living in ${city2Name}

**Monday Morning:**
You wake up in ${city2Name}, ${city2Country}. The city offers ${housingDesc2}...

[Detailed narrative about daily life, housing, transit, business environment]

---

### PAGE 45: SIDE-BY-SIDE LIFESTYLE

<columns>
<column>
image-layout="full"
prompt="${city1Name} lifestyle, daily life, people enjoying city"

**${city1Name} Lifestyle:**
- Housing: ${housingDesc1}
- Transit: ${transitDesc1}
- Business: ${businessDesc1}
</column>
<column>
image-layout="full"
prompt="${city2Name} lifestyle, daily life, people enjoying city"

**${city2Name} Lifestyle:**
- Housing: ${housingDesc2}
- Transit: ${transitDesc2}
- Business: ${businessDesc2}
</column>
</columns>

---

### PAGE 46: VERDICT - WHICH CITY FITS YOU?

<smart-layout variant="solidBoxes">
<item label="Choose ${city1Name} If..." color="#10B981">
${city1Reasons}
</item>
<item label="Choose ${city2Name} If..." color="#1E90FF">
${city2Reasons}
</item>
</smart-layout>

================================================================================
## SECTION 5: PERSONA RECOMMENDATIONS (Pages 47-49)
================================================================================

---

### PAGE 47: DIGITAL NOMAD & ENTREPRENEUR

<smart-layout variant="imagesText" imagePosition="left">
<item label="💻 Digital Nomad">
**Recommendation:** ${nomadRecommendation}
${nomadAnalysis}
</item>
<item label="🚀 Entrepreneur">
**Recommendation:** ${entrepreneurRecommendation}
${entrepreneurAnalysis}
</item>
</smart-layout>

---

### PAGE 48: FAMILY & RETIREE

<smart-layout variant="imagesText" imagePosition="left">
<item label="👨‍👩‍👧‍👦 Family">
**Recommendation:** ${familyRecommendation}
${familyAnalysis}
</item>
<item label="🏖️ Retiree">
**Recommendation:** ${retireeRecommendation}
${retireeAnalysis}
</item>
</smart-layout>

---

### PAGE 49: LIBERTARIAN & INVESTOR

<smart-layout variant="imagesText" imagePosition="left">
<item label="🗽 Libertarian">
**Recommendation:** ${libertarianRecommendation}
${libertarianAnalysis}
</item>
<item label="💰 Investor">
**Recommendation:** ${investorRecommendation}
${investorAnalysis}
</item>
</smart-layout>

================================================================================
## SECTIONS 5-6: LAW VS REALITY & CATEGORY DEEP DIVES (Pages 5-42)
================================================================================

[Contains detailed metric comparisons for all 100 metrics across 6 categories]
[Each category includes: gauges, tables, color-coded scores, AI insights]

================================================================================
## SECTION 7: HIDDEN COSTS (Pages 53-55)
================================================================================

---

### PAGE 53: FREEDOM HAS A PRICE TAG

<smart-layout variant="outlineBoxes">
<item label="💰 ${city1Name} Costs">
Monthly living costs, tax implications, hidden fees
</item>
<item label="💰 ${city2Name} Costs">
Monthly living costs, tax implications, hidden fees
</item>
</smart-layout>

---

### PAGE 54: ANNUAL FREEDOM TAX COMPARISON

[Detailed tax comparison tables]

---

### PAGE 55: OPPORTUNITY COSTS

[Analysis of career/business opportunities in each city]

================================================================================
## SECTION 8: FUTURE OUTLOOK (Pages 56-59)
================================================================================

---

### PAGE 56: 5-YEAR TRAJECTORY FORECAST

<smart-layout variant="processSteps" numbered="true">
[Predictions for both cities over 5 years]
</smart-layout>

---

### PAGE 57: ${city1Name.toUpperCase()} - NEXT 5 YEARS

[Detailed forecast for city 1]

---

### PAGE 58: ${city2Name.toUpperCase()} - NEXT 5 YEARS

[Detailed forecast for city 2]

---

### PAGE 59: SCENARIO PLANNING

[Best case / worst case scenarios for each city]

================================================================================
## SECTION 9: NEXT STEPS (Pages 60-62)
================================================================================

---

### PAGE 60: IF YOU CHOOSE ${city1Name.toUpperCase()}

<smart-layout variant="processSteps" numbered="true">
[Actionable checklist for relocating to city 1]
</smart-layout>

---

### PAGE 61: IF YOU CHOOSE ${city2Name.toUpperCase()}

<smart-layout variant="processSteps" numbered="true">
[Actionable checklist for relocating to city 2]
</smart-layout>

---

### PAGE 62: KEY CONTACTS & RESOURCES

[Important contacts, embassies, visa information]

================================================================================
## SECTION 10: LLM CONSENSUS (Pages 63-67)
================================================================================

---

### PAGE 63: AI MODELS USED

<smart-layout variant="solidBoxes">
<item label="📝 Claude Sonnet 4.5" color="#6B46C1">Primary evaluator</item>
<item label="🤖 GPT-4o" color="#10B981">Cross-validation</item>
<item label="💎 Gemini 3 Pro" color="#4285F4">Google grounding</item>
<item label="𝕏 Grok 4" color="#1DA1F2">Real-time data</item>
<item label="🔮 Sonar Pro" color="#14B8A6">Deep research</item>
</smart-layout>

---

### PAGE 64: OVERALL CONSENSUS CONFIDENCE

<diagram type="rings">
Consensus Level: ${overallConfidence}
</diagram>

---

### PAGE 65: AGREEMENT BY CATEGORY

[Category-by-category agreement visualization]

---

### PAGE 66: TOP DISAGREEMENT POINTS

[Metrics where AI models disagreed most]

---

### PAGE 67: HOW WE GENERATE REPORTS

[Technical explanation of multi-LLM consensus]

================================================================================
## SECTION 11: GUN RIGHTS (Pages 68-71) - OPTIONAL
================================================================================

---

### PAGE 68: GUN RIGHTS DISCLAIMER

<labels><label variant="solid" color="#F97316">⚠️ UNSCORED - FACTS ONLY</label></labels>

# Why Gun Rights Are Separated

We have separated gun rights into a standalone comparison because of the enormous polarizing opinions on whether guns mean more freedom or less freedom.

**We do NOT assign a winner for gun rights.**

---

### PAGE 69: GUN LAW COMPARISON (Part 1)

<table colwidths="[30,35,35]">
| Category | ${city1Name} | ${city2Name} |
|----------|--------------|--------------|
[Gun law data for first half of categories]
</table>

---

### PAGE 70: GUN LAW COMPARISON (Part 2)

<table colwidths="[30,35,35]">
| Category | ${city1Name} | ${city2Name} |
|----------|--------------|--------------|
[Gun law data for second half of categories]
</table>

---

### PAGE 71: GUN LAW SUMMARY

[Summary and key differences]

================================================================================
## SECTION 12: METHODOLOGY (Pages 72-75)
================================================================================

---

### PAGE 72: WHAT IS LIFE SCORE™?

# LIFE SCORE™
## Legal Independence & Freedom Evaluation

**Definition:** A comprehensive 100-metric system measuring legal and lived freedom across cities worldwide.

<smart-layout variant="solidBoxes">
<item label="📜 Concrete Laws" color="#6B46C1">
We measure actual statutes, regulations, and official policies
</item>
<item label="🏙️ Real Enforcement" color="#14B8A6">
We capture how laws are actually applied in daily life
</item>
<item label="🤖 Multi-AI Consensus" color="#10A37F">
5 independent AI models research each metric
</item>
<item label="🎭 Expert Judgment" color="#7C3AED">
Claude Opus 4.5 synthesizes all data
</item>
</smart-layout>

---

### PAGE 73: THE 6 CATEGORIES

| Category | Metrics | Weight | What It Measures |
|----------|---------|--------|------------------|
| 🗽 Personal Autonomy | 15 | 20% | Vice laws, bodily autonomy, lifestyle choices |
| 🏠 Housing & Property | 20 | 20% | Property rights, HOA rules, housing flexibility |
| 💼 Business & Work | 25 | 20% | Licensing, employment laws, economic freedom |
| 🚇 Transportation | 15 | 15% | Mobility freedom, transit options |
| ⚖️ Policing & Courts | 15 | 15% | Legal system fairness, accountability |
| 🎭 Speech & Lifestyle | 10 | 10% | Expression, privacy, tolerance |

---

### PAGE 74: PERSONALIZATION PRESETS

[Different weight presets for different personas]

---

### PAGE 75: EVIDENCE QUALITY BY CATEGORY

[Confidence levels and evidence sources]

================================================================================
## SECTION 13: EVIDENCE & CLOSING (Pages 76-82)
================================================================================

---

### PAGE 76: ${city1Name.toUpperCase()} - KEY CITATIONS

image-layout="right"
prompt="research documents, legal books, government documents"

# 📚 Evidence Sources: ${city1Name}

<smart-layout variant="outlineBoxesWithSideLine">
[List of 8 key sources with titles, snippets, URLs]
</smart-layout>

---

### PAGE 77: ${city2Name.toUpperCase()} - KEY CITATIONS

image-layout="right"
prompt="research documents, legal books, government documents"

# 📚 Evidence Sources: ${city2Name}

<smart-layout variant="outlineBoxesWithSideLine">
[List of 8 key sources with titles, snippets, URLs]
</smart-layout>

---

### PAGE 78: DATA QUALITY & LIMITATIONS

<smart-layout variant="outlineBoxes">
<item label="⏱️ Temporal">Laws change frequently</item>
<item label="🌍 Geographic">City-level analysis</item>
<item label="📊 Data Quality">Some metrics difficult to quantify</item>
<item label="🤖 AI Limitations">Knowledge cutoffs exist</item>
<item label="⚖️ Legal">Not legal advice</item>
<item label="👤 Personalization">Results vary by individual</item>
</smart-layout>

---

### PAGE 79: ABOUT CLUES INTELLIGENCE LTD

image-layout="right"
prompt="modern tech company office, data analytics"

# About LIFE SCORE™

**Our Mission:** Making freedom measurable, one city at a time.

[Company information and contact details]

---

### PAGE 80: LEGAL NOTICES & COPYRIGHT

**Copyright © 2025-2026 Clues Intelligence LTD. All Rights Reserved.**

**LIFE SCORE™** is a trademark of Clues Intelligence LTD.

[Permitted/Prohibited uses, disclaimer, governing law]

---

### PAGE 81: THANK YOU

image-layout="behind"
prompt="beautiful sunset over global cityscape, freedom and opportunity"

# Thank You for Using LIFE SCORE™

<display size="lg" color="#FFD700">Your Freedom Journey Starts Here</display>

<smart-layout variant="processSteps" numbered="true">
<item label="1. Review">Digest this report</item>
<item label="2. Research">Visit your top choice</item>
<item label="3. Plan">Use our checklists</item>
<item label="4. Move">Execute with confidence</item>
</smart-layout>

---

### PAGE 82: BACK COVER

image-layout="behind"
prompt="elegant minimalist design, world map silhouette, compass"

<display size="xl" color="#FFD700">LIFE SCORE™</display>

<display size="lg" color="#FFFFFF">Legal Independence & Freedom Evaluation</display>

**Making freedom measurable, one city at a time.**

---

**Clues Intelligence LTD**
🌐 clueslifescore.com | 📧 cluesnomads@gmail.com

*© 2025-2026 All Rights Reserved*

================================================================================
END OF LIFE SCORE™ ENHANCED RELOCATION GUIDE DATA
================================================================================

CRITICAL FINAL INSTRUCTIONS:
1. Generate a COMPLETE 82 PAGE visual report from the above data
2. Use DIVERSE visual elements - vary between gauges, bars, boxes, diagrams
3. Generate BEAUTIFUL AI images for lifestyle sections using image-layout prompts
4. DO NOT TRUNCATE - include ALL sections, ALL metrics, ALL insights
5. Use EXACT AI model names as specified above
6. Apply COLOR CODING consistently throughout
7. Gun Rights section is UNSCORED - facts only, no winner
8. Make this feel like a PREMIUM deliverable, not just a data dump
9. Include citations from BOTH cities in the evidence section
```

---

## KEY POINTS FOR GAMMA SUPPORT

1. **Every page has an explicit page number** (e.g., `### PAGE 43: TITLE`)
2. **82 pages total** - numbered 1-4, 5-42, 43-82
3. **Each `---` separator creates a page break**
4. **Image prompts use `image-layout` attribute** (behind, left, right)
5. **Color coding is consistent** (winner = gold/green, loser = blue)
6. **Visual components use Gamma's `<smart-layout>` syntax**
7. **Tables use explicit `colwidths` for consistent formatting**

---

## ISSUE: Report Truncation

**Problem:** Gamma sometimes generates only 56 pages instead of 82.

**Root Cause:** Some sections were using unnumbered pages like `### PAGE:` instead of `### PAGE 43:`.

**Solution:** All pages now have explicit numbers (PAGE 1 through PAGE 82).

---

## FILE LOCATION

The source code generating this prompt is in:
```
src/services/gammaService.ts
Function: formatEnhancedReportForGamma()
```

---

*Generated for Gamma Support - Session 17*
