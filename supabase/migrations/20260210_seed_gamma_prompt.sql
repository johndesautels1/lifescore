-- ============================================================================
-- LIFE SCORE - Seed Gamma Enhanced Report Prompt into app_prompts
-- Date: 2026-02-10
--
-- Adds the Gamma "Enhanced 82-Page Report" visual formatting reference
-- to the app_prompts table so it appears in Help Modal > Prompts > Gamma tab.
--
-- NOTE: The actual Gamma prompt is generated DYNAMICALLY in TypeScript
-- (src/services/gammaService.ts → formatEnhancedReportForGamma()).
-- This entry is a FORMATTING REFERENCE for admins to review the visual
-- specifications, color coding, and layout rules applied to reports.
-- Editing this entry does NOT change the generated prompt — code changes
-- in gammaService.ts are required for that.
--
-- Safe to re-run (uses ON CONFLICT DO UPDATE).
-- ============================================================================

INSERT INTO public.app_prompts (
  category,
  prompt_key,
  display_name,
  description,
  prompt_text,
  last_edited_by
) VALUES (
  'gamma',
  'enhanced_report_v2',
  'Enhanced 82-Page Report — Visual Formatting Reference',
  'Visual specifications, color coding, and layout rules for the Gamma enhanced report. This is a REFERENCE — the actual prompt is generated dynamically in gammaService.ts.',
  '== LIFE SCORE™ ENHANCED REPORT — GAMMA VISUAL FORMATTING REFERENCE v2 ==

⚠️ NOTE: This is a formatting REFERENCE for admin review.
The actual prompt is built dynamically in src/services/gammaService.ts.
To change the prompt, edit the TypeScript code and push to GitHub.

================================================================================
VISUAL SPECIFICATIONS (USE DIVERSE VISUALS):
================================================================================

Gauges/Dials: <smart-layout variant="semiCircle"> — radial gauges for headline metrics
Bars/Charts: <smart-layout variant="barStats"> — horizontal progress bars for heat maps + comparisons
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
HEAT MAP VISUALIZATION (barStats — bar length conveys data):
================================================================================

Bar length represents AI consensus strength per metric:
95% = Unanimous — all LLMs aligned (longest bar)
85% = Strong — most LLMs agreed
70% = Moderate — generally aligned
50% = Split — significant divergence (shortest bar)
Hidden Costs use semiCircle gauges for cost severity dials.
Myth vs Reality uses structured tables (always renders correctly).

================================================================================
METRIC TABLE FORMAT:
================================================================================

Column headers: # | Metric | City1 (L) | City1 (E) | City2 (L) | City2 (E) | Winner | Confidence
Column widths: [5, 25, 12, 12, 12, 12, 10, 12]
Confidence values: Unanimous / Strong / Moderate / Split (full words, not abbreviated)
Legend: L = Legal Score | E = Enforcement Score

================================================================================
CLICKABLE LINKS:
================================================================================

All URLs formatted as markdown hyperlinks: [title](url)
Email addresses use mailto: links: [email](mailto:email)
Applied to: Contact info, evidence sources, key resources

================================================================================
REPORT SECTIONS (13 sections, 82 pages):
================================================================================

1. Executive Summary (Pages 1-6)
2. Life In Each City (Pages 7-10)
3. Persona-Based Recommendations (Pages 11-14)
4. Biggest Surprises (Pages 15-18)
5. Law vs Reality (Pages 19-22)
6. Category Deep Dives × 6 (Pages 23-52) — includes metric tables + heat maps
7. Hidden Costs (Pages 53-54)
8. Future Outlook (Pages 55-62)
9. Next Steps (Pages 58-62)
10. LLM Consensus (Pages 63-67)
11. Gun Rights (Pages 68-71) — OPTIONAL, UNSCORED
12. Methodology (Pages 72-75) — includes Evidence Quality heat map
13. Evidence & Closing (Pages 76-82) — evidence sources with clickable links

================================================================================
AI MODELS USED:
================================================================================

📝 Claude Sonnet 4.5 (Anthropic) - Primary legal framework analysis
🤖 GPT-4o (OpenAI) - Cross-validation and fact-checking
💎 Gemini 3.1 Pro (Google) - Native Google Search grounding
𝕏 Grok 4 (xAI) - Real-time X/Twitter data integration
🔮 Sonar Reasoning Pro (Perplexity) - Deep web research

Final Judge: 🎭 Claude Opus 4.5 (Anthropic) - Synthesizes all 5 evaluations

================================================================================
TROPHY PLACEMENT RULE (Added 2026-02-14):
================================================================================

The 🏆 trophy emoji MUST ONLY appear next to the WINNER city.
NEVER place the 🏆 next to the loser. The prompt dynamically inserts:
1. TROPHY PLACEMENT RULE in the critical instructions header
2. 🏆 WINNER marker in the winner''s data table row
3. Explicit winner/loser identification in the Page 2 instruction
This prevents the Gamma AI from misplacing the trophy on the wrong city.

================================================================================
CRITICAL PRODUCTION RULES:
================================================================================

1. Generate a COMPLETE 82 PAGE visual report
2. Use DIVERSE visual elements — vary between gauges, bars, boxes, diagrams
3. Generate BEAUTIFUL AI images for lifestyle sections using image-layout prompts
4. DO NOT TRUNCATE — include ALL sections, ALL metrics, ALL insights
5. Apply COLOR CODING consistently throughout
6. Gun Rights section is UNSCORED — facts only, no winner
7. Heat maps use barStats (bar length = confidence), NOT solidBoxes (colors get stripped)
8. Confidence column shows full words (NOT abbreviated)
9. All URLs are clickable markdown hyperlinks
10. Make this feel like a PREMIUM deliverable, not just a data dump
11. 🏆 trophy ONLY on the WINNER city — NEVER on the loser',
  'system'
)
ON CONFLICT (category, prompt_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  last_edited_by = EXCLUDED.last_edited_by;

-- ============================================================================
-- Done. Run in Supabase SQL Editor.
-- ============================================================================
