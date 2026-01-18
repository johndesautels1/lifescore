# Phase 2: api/evaluate.ts Changes

The file `api/evaluate.ts` is being modified by another process, preventing automated edits. Apply these changes manually:

## 1. Add imports after line 6

After:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
```

Add:
```typescript
// Phase 2: Import shared metrics for category-based scoring
import { categoryToScore, METRICS_MAP, getCategoryOptionsForPrompt } from '../src/shared/metrics';
import type { ScoreResult } from '../src/shared/types';
```

## 2. Add USE_CATEGORY_SCORING toggle after line 9

After:
```typescript
const LLM_TIMEOUT_MS = 180000;
```

Add:
```typescript
// Phase 2: Environment variable toggle for gradual rollout
const USE_CATEGORY_SCORING = process.env.USE_CATEGORY_SCORING === 'true';
```

## 3. Update ParsedEvaluation interface (around line 68)

Add these fields to the interface:
```typescript
// NEW: Category-based format (Phase 2)
city1Category?: string;
city2Category?: string;
```

## 4. Add MetricWithCriteria interface after EvaluationResponse (around line 107)

Add:
```typescript
// Extended metric interface with scoringCriteria for category-based scoring
interface MetricWithCriteria {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  scoringDirection: string;
  scoringCriteria?: {
    type: string;
    options?: Array<{
      value: string;
      label: string;
      score: number;
    }>;
  };
}
```

## 5. Add buildCategoryPrompt() function after buildPrompt() (around line 183)

Add the entire function from `D:/LifeScore/api/evaluate.ts.new` or see SCORING_SYSTEM_REDESIGN.md

## 6. Update parseResponse() to handle category-based responses

In the parseResponse function, add after `getScore` helper:
```typescript
// Phase 2: Helper to convert category to score using shared metrics
const getCategoryScore = (metricId: string, category: string | undefined): number => {
  if (!category) return 50;
  const result = categoryToScore(metricId, category);
  return result.score ?? 50;
};
```

And update the return mapping to check for category-based responses first:
```typescript
// Phase 2: If category-based response, use categoryToScore()
if (USE_CATEGORY_SCORING && e.city1Category && e.city2Category) {
  const city1Score = getCategoryScore(e.metricId, e.city1Category);
  const city2Score = getCategoryScore(e.metricId, e.city2Category);
  return {
    metricId: e.metricId,
    city1LegalScore: city1Score,
    city1EnforcementScore: city1Score,
    city2LegalScore: city2Score,
    city2EnforcementScore: city2Score,
    confidence: e.confidence || 'medium',
    reasoning: e.reasoning,
    sources: e.sources,
    city1Evidence: e.city1Evidence || [],
    city2Evidence: e.city2Evidence || []
  };
}
```

## 7. Update each LLM evaluator function

In each evaluator (evaluateWithClaude, evaluateWithGPT4o, evaluateWithGemini, evaluateWithGrok, evaluateWithPerplexity), change:

```typescript
const prompt = tavilyContext + buildBasePrompt(city1, city2, metrics) + claudeAddendum;
```

To:
```typescript
// Phase 2: Use category prompt when enabled
const basePrompt = USE_CATEGORY_SCORING
  ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
  : buildBasePrompt(city1, city2, metrics);
const prompt = tavilyContext + basePrompt + claudeAddendum;
```

## 8. Add logging in handler

Add this log line after the existing evaluation log:
```typescript
console.log(`[EVALUATE] USE_CATEGORY_SCORING=${USE_CATEGORY_SCORING}`);
```

---

## Testing

1. Deploy with `USE_CATEGORY_SCORING=false` (default) - uses legacy A-E grades
2. Test Austin vs Denver comparison - should work as before
3. Enable `USE_CATEGORY_SCORING=true` in Vercel env vars
4. Re-test - should now use category-based scoring with proper differentiation
