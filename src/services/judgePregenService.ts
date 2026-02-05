/**
 * LIFE SCORE - Judge Pre-generation Service
 *
 * Non-blocking service to trigger background Judge Report and Video generation.
 * Fire-and-forget pattern - does NOT wait for responses.
 * JudgeTab queries database to check status.
 *
 * Flow:
 * 1. Comparison completes → startBackgroundPregen() fires
 * 2. Report API called (no await) → stores in judge_reports table
 * 3. Video API called (no await) → stores in avatar_videos table
 * 4. User clicks Judge tab → checks DB for existing report/video
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import type { JudgeReport } from '../components/JudgeTab';
import { getSavedJudgeReports } from './savedComparisons';

// ============================================================================
// TYPES
// ============================================================================

interface PregenOptions {
  userId: string;
  skipIfExists?: boolean;
}

// ============================================================================
// BACKGROUND REPORT GENERATION
// ============================================================================

/**
 * Fire-and-forget: Start background Judge Report generation.
 * Does NOT wait for response - returns immediately.
 * Report will be stored in judge_reports table when complete.
 */
export function startBackgroundReportGeneration(
  comparisonResult: EnhancedComparisonResult | ComparisonResult,
  options: PregenOptions
): void {
  const { userId } = options;

  console.log('[JudgePregen] Starting background report generation for:', {
    comparisonId: comparisonResult.comparisonId,
    city1: comparisonResult.city1?.city,
    city2: comparisonResult.city2?.city,
    userId,
  });

  // Fire and forget - don't await
  fetch('/api/judge-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comparisonResult,
      userId,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.text();
        console.error('[JudgePregen] Report generation failed:', response.status, error);
        return;
      }

      const data = await response.json();
      if (data.success && data.report) {
        console.log('[JudgePregen] Report generated successfully:', data.report.reportId);

        // Now trigger video generation with the report
        startBackgroundVideoGeneration(data.report);
      }
    })
    .catch((error) => {
      console.error('[JudgePregen] Report generation error:', error);
    });
}

// ============================================================================
// BACKGROUND VIDEO GENERATION
// ============================================================================

/**
 * Fire-and-forget: Start background Judge Video generation.
 * Does NOT wait for response - returns immediately.
 * Video will be stored in avatar_videos table when complete.
 */
export function startBackgroundVideoGeneration(report: JudgeReport): void {
  // Build script for Christiano
  const winner =
    report.executiveSummary.recommendation === 'city1'
      ? report.city1
      : report.executiveSummary.recommendation === 'city2'
        ? report.city2
        : 'TIE';

  const winnerScore =
    report.executiveSummary.recommendation === 'city1'
      ? report.summaryOfFindings.city1Score
      : report.summaryOfFindings.city2Score;

  const loserScore =
    report.executiveSummary.recommendation === 'city1'
      ? report.summaryOfFindings.city2Score
      : report.summaryOfFindings.city1Score;

  const script = `Good day. I'm Christiano, your LIFE SCORE Judge. After careful analysis of ${report.city1} versus ${report.city2}, my verdict is clear. The winner is ${winner} with a score of ${winnerScore}. ${report.executiveSummary.rationale} Key factors include: ${report.executiveSummary.keyFactors.slice(0, 3).join(', ')}. For the future outlook: ${report.executiveSummary.futureOutlook.slice(0, 200)}. This concludes my verdict.`;

  console.log('[JudgePregen] Starting background video generation for:', {
    reportId: report.reportId,
    comparisonId: report.comparisonId,
    winner,
  });

  // Fire and forget - don't await
  fetch('/api/avatar/generate-judge-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comparisonId: report.comparisonId,
      script,
      city1: report.city1,
      city2: report.city2,
      winner,
      winnerScore,
      loserScore,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.text();
        console.error('[JudgePregen] Video generation failed:', response.status, error);
        return;
      }

      const data = await response.json();
      if (data.success) {
        console.log('[JudgePregen] Video generation started:', {
          videoId: data.video?.id,
          cached: data.cached,
          status: data.video?.status,
        });
      }
    })
    .catch((error) => {
      console.error('[JudgePregen] Video generation error:', error);
    });
}

// ============================================================================
// STATUS CHECK FUNCTIONS (for JudgeTab to query)
// ============================================================================

/**
 * Check if a Judge Report exists in the database for this comparison.
 * Returns the report if found, null otherwise.
 */
export async function checkExistingReport(
  comparisonId: string
): Promise<JudgeReport | null> {
  try {
    // Check localStorage first (faster) via centralized service
    const existingReports = getSavedJudgeReports() as JudgeReport[];

    const localReport = existingReports.find(
      (r) => r.comparisonId === comparisonId
    );

    if (localReport) {
      console.log('[JudgePregen] Found report in localStorage:', localReport.reportId);
      return localReport;
    }

    // Could add Supabase check here if needed
    // For now, localStorage is sufficient since reports are saved there

    return null;
  } catch (error) {
    console.error('[JudgePregen] Error checking existing report:', error);
    return null;
  }
}

/**
 * Check if a Judge Video exists in the database for this comparison.
 * Calls the video-status API endpoint.
 */
export async function checkExistingVideo(
  comparisonId: string
): Promise<{ exists: boolean; videoUrl?: string; status?: string }> {
  try {
    const response = await fetch(
      `/api/avatar/video-status?comparisonId=${encodeURIComponent(comparisonId)}`
    );

    if (!response.ok) {
      return { exists: false };
    }

    const data = await response.json();

    // Handle exists:false response (no video yet)
    if (data.exists === false || !data.video) {
      return { exists: false };
    }

    if (data.success && data.video) {
      return {
        exists: true,
        videoUrl: data.video.videoUrl,
        status: data.video.status,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('[JudgePregen] Error checking existing video:', error);
    return { exists: false };
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to start background pre-generation.
 * Call this after comparison completes.
 *
 * @param comparisonResult - The completed comparison result
 * @param userId - User ID for the report
 */
export function startJudgePregeneration(
  comparisonResult: EnhancedComparisonResult | ComparisonResult,
  userId: string
): void {
  // Validate we have the required data
  if (!comparisonResult?.comparisonId) {
    console.warn('[JudgePregen] Missing comparisonId, skipping pregen');
    return;
  }

  if (!comparisonResult.city1?.city || !comparisonResult.city2?.city) {
    console.warn('[JudgePregen] Missing city data, skipping pregen');
    return;
  }

  console.log('[JudgePregen] Initiating background pre-generation...');

  // Start report generation (which will chain to video generation)
  startBackgroundReportGeneration(comparisonResult, { userId });
}

export default {
  startJudgePregeneration,
  startBackgroundReportGeneration,
  startBackgroundVideoGeneration,
  checkExistingReport,
  checkExistingVideo,
};
