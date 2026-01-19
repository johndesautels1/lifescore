/**
 * LIFE SCORE™ Gamma Service
 * Client-side service for generating visual reports via Gamma API
 */

import type {
  EnhancedComparisonResult,
  CategoryConsensus,
  MetricConsensus
} from '../types/enhancedComparison';
import type {
  VisualReportResponse,
  VisualReportState,
  GammaGenerationStatus
} from '../types/gamma';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLL_INTERVAL_MS = 5000;  // Poll every 5 seconds as recommended by Gamma
const MAX_POLL_ATTEMPTS = 60;   // 5 minutes max wait time

// ============================================================================
// FORMAT COMPARISON DATA FOR GAMMA
// ============================================================================

/**
 * Format a category consensus into readable text for Gamma prompt
 */
function formatCategory(
  categoryName: string,
  city1Name: string,
  city2Name: string,
  city1Consensus: CategoryConsensus,
  city2Consensus: CategoryConsensus
): string {
  const city1Score = Math.round(city1Consensus.averageConsensusScore);
  const city2Score = Math.round(city2Consensus.averageConsensusScore);
  const winner = city1Score > city2Score ? city1Name : city2Score > city1Score ? city2Name : 'Tie';

  // Get top evidence from metrics
  const topEvidence: string[] = [];
  city1Consensus.metrics.slice(0, 3).forEach((metric: MetricConsensus) => {
    if (metric.judgeExplanation) {
      topEvidence.push(metric.judgeExplanation.slice(0, 150));
    }
  });

  return `
## ${categoryName}
- ${city1Name}: ${city1Score}/100
- ${city2Name}: ${city2Score}/100
- Winner: ${winner}
${topEvidence.length > 0 ? `\nKey Evidence:\n${topEvidence.map(e => `- ${e}`).join('\n')}` : ''}
`;
}

/**
 * Transform EnhancedComparisonResult into a Gamma-ready prompt string
 */
export function formatComparisonForGamma(result: EnhancedComparisonResult): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Score = Math.round(result.city1.totalConsensusScore);
  const city2Score = Math.round(result.city2.totalConsensusScore);
  const winner = result.winner === 'city1' ? city1Name : result.winner === 'city2' ? city2Name : 'Tie';

  // Map category IDs to display names
  const categoryNames: Record<string, string> = {
    'personal-freedom': 'Personal Freedom',
    'housing-property': 'Housing & Property',
    'business-work': 'Business & Work',
    'transportation': 'Transportation',
    'policing-courts': 'Policing & Courts',
    'speech-lifestyle': 'Speech & Lifestyle'
  };

  // Build category sections
  const categorySections: string[] = [];
  result.city1.categories.forEach((city1Cat, index) => {
    const city2Cat = result.city2.categories[index];
    if (city1Cat && city2Cat) {
      const displayName = categoryNames[city1Cat.categoryId] || city1Cat.categoryId;
      categorySections.push(formatCategory(
        displayName,
        city1Name,
        city2Name,
        city1Cat,
        city2Cat
      ));
    }
  });

  // Build the full prompt
  return `
# LIFE SCORE City Comparison: ${city1Name} vs ${city2Name}

## OVERALL RESULTS
- **WINNER: ${winner}**
- ${city1Name} Total Score: ${city1Score}/100
- ${city2Name} Total Score: ${city2Score}/100
- Score Difference: ${Math.abs(result.scoreDifference)} points
- Consensus Confidence: ${result.overallConsensusConfidence}

${categorySections.join('\n')}

## METHODOLOGY
- Evaluated by ${result.llmsUsed.length} independent AI models
- Final judgment by ${result.judgeModel}
- ${result.processingStats.metricsEvaluated} metrics analyzed
- Generated: ${result.generatedAt}

## KEY DISAGREEMENTS
${result.disagreementSummary || 'LLMs showed strong agreement across most metrics.'}

Please populate all 10 cards with this data, using appropriate charts and visualizations.
Replace [City1] with "${city1Name}" and [City2] with "${city2Name}" throughout.
`.trim();
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Generate a visual report via our API endpoint
 */
export async function generateVisualReport(
  result: EnhancedComparisonResult,
  exportFormat: 'pdf' | 'pptx' = 'pdf'
): Promise<VisualReportResponse> {
  const prompt = formatComparisonForGamma(result);

  const response = await fetch('/api/gamma', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      exportAs: exportFormat,
      comparisonId: result.comparisonId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate report: ${response.status}`);
  }

  return response.json();
}

/**
 * Check generation status
 */
export async function checkGenerationStatus(generationId: string): Promise<VisualReportResponse> {
  const response = await fetch(`/api/gamma?generationId=${encodeURIComponent(generationId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to check status: ${response.status}`);
  }

  return response.json();
}

/**
 * Poll for completion with progress callback
 */
export async function pollUntilComplete(
  generationId: string,
  onProgress?: (state: VisualReportState) => void
): Promise<VisualReportResponse> {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    const status = await checkGenerationStatus(generationId);

    // Calculate progress (estimate based on attempts)
    const estimatedProgress = Math.min(95, Math.round((attempts / 12) * 100));  // ~60s typical

    if (onProgress) {
      onProgress({
        status: status.status === 'completed' ? 'completed' :
                status.status === 'failed' ? 'error' : 'polling',
        generationId,
        gammaUrl: status.url,
        pdfUrl: status.pdfUrl,
        pptxUrl: status.pptxUrl,
        error: status.error,
        progress: status.status === 'completed' ? 100 : estimatedProgress,
      });
    }

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Generation failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    attempts++;
  }

  throw new Error('Generation timed out after 5 minutes');
}

/**
 * Full generation flow: generate + poll until complete
 */
export async function generateAndWaitForReport(
  result: EnhancedComparisonResult,
  exportFormat: 'pdf' | 'pptx' = 'pdf',
  onProgress?: (state: VisualReportState) => void
): Promise<VisualReportResponse> {
  // Start generation
  if (onProgress) {
    onProgress({
      status: 'generating',
      progress: 0,
    });
  }

  const initial = await generateVisualReport(result, exportFormat);

  if (onProgress) {
    onProgress({
      status: 'polling',
      generationId: initial.generationId,
      progress: 5,
    });
  }

  // Poll until complete
  return pollUntilComplete(initial.generationId, onProgress);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a generation status indicates completion
 */
export function isComplete(status: GammaGenerationStatus): boolean {
  return status === 'completed' || status === 'failed';
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(state: VisualReportState): string {
  switch (state.status) {
    case 'idle':
      return 'Ready to generate visual report';
    case 'generating':
      return 'Starting report generation...';
    case 'polling':
      return `Generating report... ${state.progress || 0}%`;
    case 'completed':
      return 'Report ready!';
    case 'error':
      return state.error || 'An error occurred';
    default:
      return 'Unknown status';
  }
}
