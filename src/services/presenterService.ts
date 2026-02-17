/**
 * LIFE SCORE™ Report Presenter Service
 * Generates narration segments from comparison data for Olivia to present
 *
 * Architecture:
 *   - Builds presentation script from comparison data (no API call needed)
 *   - Segments: Intro → Winner → Category Highlights → Key Differences → Consensus → Conclusion
 *   - Feeds segments to HeyGen streaming avatar (or TTS fallback)
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { CityScore, CategoryId } from '../types/metrics';
import type { PresenterSegment, PresentationScript, PresenterStatus } from '../types/presenter';
import type { AnyComparisonResult } from './gammaService';

// ============================================================================
// CATEGORY DISPLAY NAMES
// ============================================================================

const CATEGORY_NAMES: Record<CategoryId, { name: string; icon: string }> = {
  personal_freedom: { name: 'Personal Autonomy', icon: '🗽' },
  housing_property: { name: 'Housing, Property & HOA Control', icon: '🏠' },
  business_work: { name: 'Business & Work Regulation', icon: '💼' },
  transportation: { name: 'Transportation & Daily Movement', icon: '🚇' },
  policing_legal: { name: 'Policing, Courts & Enforcement', icon: '⚖️' },
  speech_lifestyle: { name: 'Speech, Lifestyle & Culture', icon: '🎭' },
};

// ============================================================================
// TYPE GUARD
// ============================================================================

function isEnhancedResult(result: AnyComparisonResult): result is EnhancedComparisonResult {
  return 'llmsUsed' in result;
}

// ============================================================================
// NARRATION HELPERS
// ============================================================================

/** Rough estimate: ~150 words per minute for speech, avg 5 chars/word */
function estimateDurationMs(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.round((wordCount / 150) * 60 * 1000);
}

function getWinnerName(result: AnyComparisonResult): string {
  return result.winner === 'city1' ? result.city1.city : result.city2.city;
}

function getLoserName(result: AnyComparisonResult): string {
  return result.winner === 'city1' ? result.city2.city : result.city1.city;
}

function getWinnerScore(result: AnyComparisonResult): number {
  if (isEnhancedResult(result)) {
    return result.winner === 'city1'
      ? result.city1.totalConsensusScore
      : result.city2.totalConsensusScore;
  }
  return result.winner === 'city1' ? result.city1.totalScore : result.city2.totalScore;
}

function getLoserScore(result: AnyComparisonResult): number {
  if (isEnhancedResult(result)) {
    return result.winner === 'city1'
      ? result.city2.totalConsensusScore
      : result.city1.totalConsensusScore;
  }
  return result.winner === 'city1' ? result.city2.totalScore : result.city1.totalScore;
}

function getCategoryScore(
  result: AnyComparisonResult,
  cityKey: 'city1' | 'city2',
  categoryId: CategoryId
): number {
  const city = result[cityKey];
  if (isEnhancedResult(result)) {
    const cat = (city as EnhancedComparisonResult['city1']).categories.find(
      (c) => c.categoryId === categoryId
    );
    return cat?.averageConsensusScore ?? 0;
  }
  const cat = (city as CityScore).categories.find((c) => c.categoryId === categoryId);
  return cat?.averageScore ?? 0;
}

// ============================================================================
// SEGMENT GENERATORS
// ============================================================================

function buildIntroSegment(result: AnyComparisonResult): PresenterSegment {
  const city1 = result.city1.city;
  const city2 = result.city2.city;
  const isEnhanced = isEnhancedResult(result);

  const narration = isEnhanced
    ? `Welcome to your LIFE SCORE visual report. I'm Olivia, and I'll be walking you through the complete freedom comparison between ${city1} and ${city2}. This is an Enhanced report, scored by ${(result as EnhancedComparisonResult).llmsUsed.length} different AI models with consensus judging by Claude Opus. One hundred freedom metrics were evaluated across six categories. Let's dive into the findings.`
    : `Welcome to your LIFE SCORE visual report. I'm Olivia, and I'll be presenting the freedom comparison between ${city1} and ${city2}. One hundred metrics were evaluated across six categories of daily life regulation. Let me walk you through what we found.`;

  return {
    id: 'intro',
    title: 'Introduction',
    narration,
    durationEstimateMs: estimateDurationMs(narration),
    category: 'intro',
  };
}

function buildWinnerSegment(result: AnyComparisonResult): PresenterSegment {
  const winner = getWinnerName(result);
  const loser = getLoserName(result);
  const winScore = Math.round(getWinnerScore(result));
  const loseScore = Math.round(getLoserScore(result));
  const diff = Math.round(result.scoreDifference);

  let narration: string;
  if (result.winner === 'tie') {
    narration = `Remarkably, this comparison ended in a virtual tie. ${result.city1.city} scored ${Math.round(getWinnerScore(result))} and ${result.city2.city} scored ${Math.round(getLoserScore(result))}. The difference of just ${diff} points means these cities offer very similar levels of personal freedom.`;
  } else if (diff < 5) {
    narration = `The overall winner is ${winner} with a score of ${winScore} out of 100, compared to ${loseScore} for ${loser}. With just a ${diff} point difference, these cities are remarkably close in overall freedom. The devil is in the details though, so let's look at where they differ.`;
  } else if (diff < 15) {
    narration = `The overall winner is ${winner} with a score of ${winScore} out of 100. ${loser} scored ${loseScore}, a meaningful ${diff} point gap. This suggests a noticeable difference in day-to-day freedom between these cities. Let me show you where.`;
  } else {
    narration = `The overall winner is ${winner} with a convincing score of ${winScore} out of 100. ${loser} came in at ${loseScore}, a significant ${diff} point difference. That's a substantial gap in personal freedom. Let me break down where this difference comes from.`;
  }

  return {
    id: 'winner',
    title: 'Overall Winner',
    narration,
    durationEstimateMs: estimateDurationMs(narration),
    category: 'winner',
  };
}

function buildCategorySegments(result: AnyComparisonResult): PresenterSegment[] {
  const segments: PresenterSegment[] = [];
  const categoryIds = Object.keys(result.categoryWinners) as CategoryId[];

  for (const catId of categoryIds) {
    const catInfo = CATEGORY_NAMES[catId];
    if (!catInfo) continue;

    const catWinner = result.categoryWinners[catId];
    const score1 = Math.round(getCategoryScore(result, 'city1', catId));
    const score2 = Math.round(getCategoryScore(result, 'city2', catId));
    const city1 = result.city1.city;
    const city2 = result.city2.city;

    let narration: string;
    if (catWinner === 'tie') {
      narration = `In ${catInfo.name}, it's a tie. Both ${city1} and ${city2} scored around ${score1}. Neither city has a clear advantage in this category.`;
    } else {
      const winCity = catWinner === 'city1' ? city1 : city2;
      const winScore = catWinner === 'city1' ? score1 : score2;
      const loseCity = catWinner === 'city1' ? city2 : city1;
      const loseScore = catWinner === 'city1' ? score2 : score1;
      const catDiff = Math.abs(score1 - score2);

      if (catDiff < 5) {
        narration = `For ${catInfo.name}, ${winCity} edges out ${loseCity} by just ${catDiff} points: ${winScore} to ${loseScore}. A very close result in this category.`;
      } else {
        narration = `In ${catInfo.name}, ${winCity} leads with ${winScore} compared to ${loseCity} at ${loseScore}. That's a ${catDiff} point advantage, making it a clear win in this category.`;
      }
    }

    segments.push({
      id: `cat_${catId}`,
      title: `${catInfo.icon} ${catInfo.name}`,
      narration,
      durationEstimateMs: estimateDurationMs(narration),
      category: 'category',
    });
  }

  return segments;
}

function buildHighlightsSegment(result: AnyComparisonResult): PresenterSegment {
  const city1 = result.city1.city;
  const city2 = result.city2.city;

  // Find categories with biggest differences
  const catIds = Object.keys(result.categoryWinners) as CategoryId[];
  const diffs = catIds.map((catId) => {
    const s1 = getCategoryScore(result, 'city1', catId);
    const s2 = getCategoryScore(result, 'city2', catId);
    return { catId, diff: Math.abs(s1 - s2), winner: result.categoryWinners[catId] };
  });
  diffs.sort((a, b) => b.diff - a.diff);

  const top = diffs.slice(0, 2);
  const topLines = top.map((d) => {
    const catInfo = CATEGORY_NAMES[d.catId];
    const winCity = d.winner === 'city1' ? city1 : city2;
    return `${catInfo?.name || d.catId} where ${winCity} leads by ${Math.round(d.diff)} points`;
  });

  const narration = `Looking at the biggest differences: the most impactful categories are ${topLines.join(', and ')}. These are the areas that really separate these two cities in terms of everyday freedom.`;

  return {
    id: 'highlights',
    title: 'Key Differences',
    narration,
    durationEstimateMs: estimateDurationMs(narration),
    category: 'highlights',
  };
}

function buildConsensusSegment(result: EnhancedComparisonResult): PresenterSegment {
  const llmCount = result.llmsUsed.length;
  const confidence = result.overallConsensusConfidence;

  let confidenceText: string;
  switch (confidence) {
    case 'high':
      confidenceText = 'The AI models were in strong agreement on most metrics. You can have high confidence in these scores.';
      break;
    case 'medium':
      confidenceText = 'The AI models mostly agreed, though there were some notable differences of opinion on certain metrics.';
      break;
    case 'low':
      confidenceText = 'The AI models disagreed on several key metrics, suggesting these areas may be subject to interpretation.';
      break;
  }

  const narration = `Now for the consensus analysis. ${llmCount} AI models independently evaluated each metric, and then Claude Opus served as the final judge. ${confidenceText} ${result.disagreementSummary ? `Specifically, ${result.disagreementSummary}` : ''}`;

  return {
    id: 'consensus',
    title: 'AI Consensus',
    narration,
    durationEstimateMs: estimateDurationMs(narration),
    category: 'consensus',
  };
}

function buildConclusionSegment(result: AnyComparisonResult): PresenterSegment {
  const winner = getWinnerName(result);
  const loser = getLoserName(result);
  const isEnhanced = isEnhancedResult(result);

  let narration: string;
  if (result.winner === 'tie') {
    narration = `To wrap up, ${result.city1.city} and ${result.city2.city} are remarkably similar in overall freedom. Your personal priorities will determine which city is the better fit. I recommend using the Ask Olivia chat to explore which metrics matter most to you. Thank you for using LIFE SCORE.`;
  } else {
    narration = `To wrap up, ${winner} offers more measurable personal freedom than ${loser} based on our ${isEnhanced ? '82-page enhanced' : '35-page standard'} analysis. But remember, every person's priorities are different. Use the Ask Olivia chat to dig deeper into the metrics that matter most to you. Thank you for using LIFE SCORE.`;
  }

  return {
    id: 'conclusion',
    title: 'Conclusion',
    narration,
    durationEstimateMs: estimateDurationMs(narration),
    category: 'conclusion',
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a full presentation script from comparison data.
 * No API call needed - built entirely from the existing result object.
 */
export function generatePresentationScript(result: AnyComparisonResult): PresentationScript {
  const segments: PresenterSegment[] = [];

  // 1. Introduction
  segments.push(buildIntroSegment(result));

  // 2. Overall Winner
  segments.push(buildWinnerSegment(result));

  // 3. Category Highlights (one per category)
  segments.push(...buildCategorySegments(result));

  // 4. Key Differences
  segments.push(buildHighlightsSegment(result));

  // 5. Consensus Analysis (enhanced only)
  if (isEnhancedResult(result)) {
    segments.push(buildConsensusSegment(result));
  }

  // 6. Conclusion
  segments.push(buildConclusionSegment(result));

  const totalDurationEstimateMs = segments.reduce((sum, s) => sum + s.durationEstimateMs, 0);

  return {
    segments,
    totalDurationEstimateMs,
    city1: result.city1.city,
    city2: result.city2.city,
    isEnhanced: isEnhancedResult(result),
  };
}

/**
 * Get a concise status label for the current presenter state
 */
export function getPresenterStatusLabel(
  status: PresenterStatus,
  currentIndex: number,
  totalSegments: number
): string {
  switch (status) {
    case 'loading':
      return 'Connecting to Olivia...';
    case 'presenting':
      return `Presenting (${currentIndex + 1}/${totalSegments})`;
    case 'paused':
      return `Paused (${currentIndex + 1}/${totalSegments})`;
    case 'segment-break':
      return `Next: segment ${currentIndex + 2}`;
    case 'completed':
      return 'Presentation complete';
    case 'error':
      return 'Presentation error';
    default:
      return 'Ready to present';
  }
}
