# QUICK HANDOFF - BIG 3 BUGS
**Session:** LIFESCORE-2026-0120-ZETA
**Latest Commit:** `3d962c6`

---

## THE BIG 3 BUGS TO FIX

### B3: Multi-LLM Field Sources Missing (CRITICAL)
**Problem:** When multiple LLMs evaluate a metric, the data sources/citations from each LLM are not being properly aggregated and displayed.

**Where to look:**
- `src/types/enhancedComparison.ts` - `LLMMetricScore.sources` and `LLMMetricScore.evidence`
- `src/services/enhancedComparison.ts` - Where LLM responses are aggregated
- `src/components/EvidencePanel.tsx` - Where sources are displayed

**What's expected:** Each LLM returns sources/evidence. These should be merged and shown to user.

---

### B4: Field-by-Field Comparison References (CRITICAL)
**Problem:** When viewing individual metric comparisons, the specific references/citations for WHY that score was given are not displaying properly.

**Where to look:**
- `src/components/EnhancedComparison.tsx` - Metric row rendering (~line 1500+)
- Look for `.metric-row` and how `evidence` is passed/displayed
- `MetricConsensus.llmScores[].evidence` contains the data

**What's expected:** Each metric should show clickable references that expand to show source citations.

---

### B1/B2: Perplexity Data Sources + 5th Thumbnail
**B1:** Perplexity API returns data but sources aren't being captured
**B2:** 5th LLM thumbnail in UI isn't wired to show Perplexity data

**Where to look:**
- `src/services/perplexityService.ts` - Check if sources are returned
- `src/components/EnhancedComparison.tsx` - LLM thumbnail section

---

## FILES TO READ FIRST
```
D:\LifeScore\src\types\enhancedComparison.ts (types)
D:\LifeScore\src\services\enhancedComparison.ts (aggregation)
D:\LifeScore\src\components\EvidencePanel.tsx (display)
D:\LifeScore\src\components\EnhancedComparison.tsx (main UI)
```

## START COMMAND
```
cd D:\LifeScore && git pull && npm run dev
```

---

**ZETA SESSION COMPLETED:**
- ✅ U4: Top 5 Deciding Factors (expandable)
- ✅ U5: Save Report button + Visual Reports library
- ✅ Glassmorphic Simple Mode buttons
- ✅ Premium metric score button redesign
- ✅ Gamma report persistence
