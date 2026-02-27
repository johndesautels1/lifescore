# LIFE SCORE — Zero-Risk File Refactoring Plan

**Created:** 2026-02-27
**Branch:** claude/coding-session-Jh27y
**Rule:** Each split committed individually. Zero breaking changes. All imports updated.

---

## ZERO RISK Files to Split

### Data Files (pure arrays/objects)

| # | File | Lines | Split Strategy | Status |
|---|------|------:|----------------|--------|
| 1 | `src/data/metrics.ts` | 2,506 | 6 category files + barrel | PENDING |
| 2 | `src/data/fieldKnowledge.ts` | 1,777 | 6 category files + barrel | PENDING |
| 3 | `api/shared/metrics-data.ts` | 2,506 | 6 category files + barrel | PENDING |

### Type Files (erased at compile time)

| # | File | Lines | Split Strategy | Status |
|---|------|------:|----------------|--------|
| 4 | `src/types/database.ts` | 944 | Split by domain | PENDING |
| 5 | `src/types/olivia.ts` | 511 | Split by feature | PENDING |

### CSS Files (plain imports, namespaced selectors)

| # | File | Lines | Split Strategy | Status |
|---|------|------:|----------------|--------|
| 6 | `EnhancedComparison.css` | 7,068 | Split by section | PENDING |
| 7 | `JudgeTab.css` | 2,396 | Split by section | PENDING |
| 8 | `AskOlivia.css` | 1,919 | Split by section | PENDING |
| 9 | `VisualsTab.css` | 1,328 | Split by section | PENDING |
| 10 | `SavedComparisons.css` | 1,163 | Split by section | PENDING |
| 11 | `Results.css` | 1,098 | Split by section | PENDING |

---

## DO NOT TOUCH (not zero risk)

- EnhancedComparison.tsx, JudgeTab.tsx, App.tsx, AskOlivia.tsx — stateful components
- gammaService.ts, savedComparisons.ts — interconnected service logic
- api/evaluate.ts, api/olivia/context.ts — serverless functions
- src/types/metrics.ts — foundational types used everywhere (204 lines, fine as-is)

---

## Attestation Log

Each split will include:
1. All imports updated across entire codebase
2. No functionality changes
3. Barrel file re-exports everything so consumers don't change
4. Verified no broken references
