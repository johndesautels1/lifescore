/**
 * LIFE SCORE - the PDF export's "Analysis" column carries the judge's explanation (anti-drift).
 *
 * John, 4 Oct 2026 ("Judge's explanation"): after a multi-AI comparison the
 * PDF export's Analysis column was always empty - it read a "reasoning" field
 * no score has. It now shows the judge's explanation for each metric (the one
 * the results screen shows), else the first model's, escaped because the text
 * is AI-written and the page is opened from the app.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { exportToPDF } from '../src/utils/exportUtils';
import { escapeHtml } from '../src/utils/escapeHtml';
import type { EnhancedComparisonResult } from '../src/types/enhancedComparison';

function metric(metricId: string, consensusScore: number, judgeExplanation: string, modelExplanation?: string) {
  return {
    metricId,
    consensusScore,
    judgeExplanation,
    llmScores: modelExplanation ? [{ metricId, explanation: modelExplanation }] : [],
  };
}

function result(city1Metrics: ReturnType<typeof metric>[], city2Metrics: ReturnType<typeof metric>[]): EnhancedComparisonResult {
  return {
    city1: { city: 'Austin', country: 'USA', totalConsensusScore: 70, overallAgreement: 80, categories: [{ categoryId: 'personal_freedom', averageConsensusScore: 70, agreementLevel: 80, metrics: city1Metrics }] },
    city2: { city: 'Lisbon', country: 'Portugal', totalConsensusScore: 60, overallAgreement: 80, categories: [{ categoryId: 'personal_freedom', averageConsensusScore: 60, agreementLevel: 80, metrics: city2Metrics }] },
    winner: 'city1',
    scoreDifference: 10,
    categoryWinners: {},
    comparisonId: 'LIFE-TEST',
    generatedAt: '2026-10-04T00:00:00Z',
    llmsUsed: ['gpt-5.4'],
    judgeModel: 'claude-opus',
    overallConsensusConfidence: 'high',
    disagreementSummary: '',
    processingStats: { totalTimeMs: 0, llmTimings: {}, metricsEvaluated: 2 },
  } as unknown as EnhancedComparisonResult;
}

/** Runs the real export with a stand-in print window and returns the page it wrote. */
function exportedPage(r: EnhancedComparisonResult): string {
  let written = '';
  const printWindow = { document: { write: (html: string) => { written += html; }, close: () => {} }, onload: null as unknown, print: () => {} };
  (globalThis as { window?: unknown }).window = { open: () => printWindow };
  exportToPDF(r);
  return written;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('PDF export Analysis column', () => {
  it("shows the judge's explanation", () => {
    const page = exportedPage(result([metric('pf_01', 80, 'Legal and widely tolerated.')], [metric('pf_01', 40, 'Illegal.')]));
    expect(page).toContain('Legal and widely tolerated.');
  });

  it("falls back to the first model's explanation", () => {
    const page = exportedPage(result([metric('pf_01', 80, '', 'Model says: decriminalised in 2022.')], [metric('pf_01', 40, '')]));
    expect(page).toContain('Model says: decriminalised in 2022.');
  });

  it('escapes the AI-written text', () => {
    const page = exportedPage(result([metric('pf_01', 80, '<img src=x onerror=alert(1)> & more')], [metric('pf_01', 40, '')]));
    expect(page).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; more');
    expect(page).not.toContain('<img src=x');
  });
});

describe('escapeHtml', () => {
  it('turns & < > " into entities', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
