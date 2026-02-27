# LIFE SCORE — Zero-Risk File Refactoring Plan

**Created:** 2026-02-27
**Branch:** claude/coding-session-Jh27y
**Rule:** Each split committed individually. Zero breaking changes. All imports updated.

---

## Batch 1: Original 11 Splits

### Data Files (pure arrays/objects)

| # | File | Lines | Split Strategy | Status | Commit |
|---|------|------:|----------------|--------|--------|
| 1 | `src/data/metrics.ts` | 2,506 | 6 category files + barrel | DONE | `0f9b12c` |
| 2 | `src/data/fieldKnowledge.ts` | 1,777 | 6 category files + barrel | DONE | `b76e3ab` |
| 3 | `api/shared/metrics-data.ts` | 2,506 | 6 category files + barrel | DONE | `e58816c` |

### Type Files (erased at compile time)

| # | File | Lines | Split Strategy | Status | Commit |
|---|------|------:|----------------|--------|--------|
| 4 | `src/types/database.ts` | 944 | 5 domain files + barrel | DONE | `18ffcd4` |
| 5 | `src/types/olivia.ts` | 511 | 4 feature files + barrel | DONE | `0318609` |

### CSS Files (plain imports, namespaced selectors)

| # | File | Lines | Split Strategy | Status | Commit |
|---|------|------:|----------------|--------|--------|
| 6 | `EnhancedComparison.css` | 7,068 | 6 section files + barrel | DONE | `cc7b7b3` |
| 7 | `JudgeTab.css` | 2,396 | 5 section files + barrel | DONE | `a816945` |
| 8 | `AskOlivia.css` | 1,919 | 4 section files + barrel | DONE | `6142231` |
| 9 | `VisualsTab.css` | 1,328 | 4 section files + barrel | DONE | `6741a1a` |
| 10 | `SavedComparisons.css` | 1,163 | 3 section files + barrel | DONE | `ddae894` |
| 11 | `Results.css` | 1,098 | 3 section files + barrel | DONE | `ef636ad` |

---

## Batch 2: Additional Zero-Risk Splits

### CSS Files (700+ lines)

| # | File | Lines | Split Strategy | Status | Commit |
|---|------|------:|----------------|--------|--------|
| 12 | `WeightPresets.css` | 990 | 3 section files + barrel | DONE | `9426e6c` |
| 13 | `AboutClues.css` | 976 | 3 section files + barrel | DONE | `305116f` |
| 14 | `ScoreMethodology.css` | 891 | 3 section files + barrel | DONE | `f878c4e` |
| 15 | `SettingsModal.css` | 847 | 3 section files + barrel | DONE | `26a561a` |
| 16 | `OliviaChatBubble.css` | 838 | 3 section files + barrel | DONE | `2403369` |
| 17 | `LoginScreen.css` | 829 | 3 section files + barrel | DONE | `3afe92e` |
| 18 | `App.css` | 739 | 3 section files + barrel | DONE | `b273368` |
| 19 | `ReportPresenter.css` | 737 | 3 section files + barrel | DONE | `f470cff` |
| 20 | `CostDashboard.css` | 737 | 3 section files + barrel | DONE | `37d77c7` |
| 21 | `globals.css` | 693 | 3 section files + barrel | DONE | `5c1c462` |

### Utility Files (pure functions + data)

| # | File | Lines | Split Strategy | Status | Commit |
|---|------|------:|----------------|--------|--------|
| 22 | `costCalculator.ts` | 749 | 2 domain files + barrel | DONE | `fdd6df8` |

### Skipped (zero consumers, not worth splitting)

| File | Lines | Reason |
|------|------:|--------|
| `invideoPromptBuilder.ts` | 575 | Zero imports anywhere in codebase |

---

## Grand Total

- **Total files refactored:** 22
- **Total lines refactored:** 31,494
- **New domain/section files created:** 78
- **Barrel files (existing files converted):** 22
- **Consumer changes needed:** 0 (all barrels re-export identically)
- **MD5 verified (CSS):** All 16 CSS splits byte-for-byte identical when concatenated
- **Type count verified:** All TypeScript splits have complete export coverage

---

## DO NOT TOUCH (not zero risk)

- EnhancedComparison.tsx, JudgeTab.tsx, App.tsx, AskOlivia.tsx — stateful components
- gammaService.ts, savedComparisons.ts, databaseService.ts, cache.ts — interconnected service logic
- api/evaluate.ts, api/olivia/context.ts, api/judge.ts — serverless functions
- All hooks (useComparison, useTierAccess, useEmilia) — stateful React hooks
- contrastImageService.ts — mixed data + service (partial risk)
- src/types/metrics.ts — foundational types used everywhere (204 lines, fine as-is)

---

## Attestation Log

Each split includes:
1. All imports updated across entire codebase
2. No functionality changes
3. Barrel file re-exports everything so consumers don't change
4. Verified no broken references
5. CSS splits: MD5 checksum verified (concatenated domain files = original)
6. Type splits: Every exported type/interface accounted for in barrel re-exports
7. Utility splits: All function + const exports verified in barrel
