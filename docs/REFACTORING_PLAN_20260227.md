# LIFE SCORE — Zero-Risk File Refactoring Plan

**Created:** 2026-02-27
**Branch:** claude/coding-session-Jh27y
**Rule:** Each split committed individually. Zero breaking changes. All imports updated.

---

## ZERO RISK Files to Split

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

### Summary

- **Total lines refactored:** 23,216
- **New domain/section files created:** 48
- **Barrel files (existing files converted):** 11
- **Consumer changes needed:** 0 (all barrels re-export identically)
- **MD5 verified (CSS):** All 6 CSS splits byte-for-byte identical when concatenated
- **Type count verified:** All TypeScript splits have complete export coverage

---

## DO NOT TOUCH (not zero risk)

- EnhancedComparison.tsx, JudgeTab.tsx, App.tsx, AskOlivia.tsx — stateful components
- gammaService.ts, savedComparisons.ts — interconnected service logic
- api/evaluate.ts, api/olivia/context.ts — serverless functions
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
