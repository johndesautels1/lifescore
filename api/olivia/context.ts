/**
 * LIFE SCORE - Olivia Context Builder API
 * Transforms comparison data into context for Olivia AI assistant
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// TYPES (inline to avoid import issues in Vercel)
// ============================================================================

interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

interface ContextMetric {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  consensusLevel?: string;
  judgeExplanation?: string;
  legalScore?: number;
  enforcementScore?: number;
  diff?: number;
  category?: string;
}

interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: string;
  topMetrics: ContextMetric[];
}

interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

interface LifeScoreContext {
  comparison: {
    city1: ContextCity;
    city2: ContextCity;
    winner: string;
    scoreDifference: number;
    generatedAt: string;
    comparisonId: string;
  };
  categories: ContextCategory[];
  topMetrics: ContextMetric[];
  evidence: ContextEvidence[];
  consensus?: {
    llmsUsed: string[];
    judgeModel: string;
    overallConfidence: string;
    disagreementSummary?: string;
    topDisagreements: Array<{
      metricName: string;
      standardDeviation: number;
      explanation: string;
    }>;
  };
  gammaReportUrl?: string;
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

// ============================================================================
// CATEGORY NAME MAPPING
// ============================================================================

const CATEGORY_NAMES: Record<string, string> = {
  'personal_freedom': 'Personal Autonomy',
  'personal-freedom': 'Personal Autonomy',
  'housing_property': 'Housing & Property',
  'housing-property': 'Housing & Property',
  'business_work': 'Business & Work',
  'business-work': 'Business & Work',
  'transportation': 'Transportation',
  'policing_legal': 'Policing & Courts',
  'policing-courts': 'Policing & Courts',
  'speech_lifestyle': 'Speech & Lifestyle',
  'speech-lifestyle': 'Speech & Lifestyle',
};

// ============================================================================
// METRIC DISPLAY NAMES (ALL 100 METRICS)
// ============================================================================

const METRIC_DISPLAY_NAMES: Record<string, string> = {
  // Personal Freedom (15 metrics)
  'pf_01_cannabis_legal': 'Cannabis Legality',
  'pf_02_alcohol_restrictions': 'Alcohol Purchase Restrictions',
  'pf_03_gambling_legal': 'Gambling Legality',
  'pf_04_prostitution_status': 'Sex Work Legal Status',
  'pf_05_drug_possession': 'Drug Possession Penalties',
  'pf_06_abortion_access': 'Abortion Access',
  'pf_07_lgbtq_rights': 'LGBTQ+ Rights',
  'pf_08_assisted_dying': 'Assisted Dying Laws',
  'pf_09_smoking_restrictions': 'Smoking Restrictions',
  'pf_10_public_drinking': 'Public Drinking Laws',
  'pf_11_helmet_laws': 'Helmet Laws',
  'pf_12_seatbelt_laws': 'Seatbelt Laws',
  'pf_13_jaywalking': 'Jaywalking Enforcement',
  'pf_14_curfew_laws': 'Curfew Laws',
  'pf_15_noise_ordinances': 'Noise Ordinances',

  // Housing & Property (20 metrics)
  'hp_01_hoa_prevalence': 'HOA Prevalence',
  'hp_02_hoa_power': 'HOA Power & Restrictions',
  'hp_03_property_tax_rate': 'Property Tax Rate',
  'hp_04_rent_control': 'Rent Control Laws',
  'hp_05_eviction_protection': 'Tenant Eviction Protections',
  'hp_06_zoning_restrictions': 'Zoning Restrictions',
  'hp_07_building_permits': 'Building Permit Requirements',
  'hp_08_short_term_rental': 'Short-Term Rental (Airbnb) Laws',
  'hp_09_adu_laws': 'ADU (Accessory Dwelling) Laws',
  'hp_10_home_business': 'Home Business Restrictions',
  'hp_11_eminent_domain': 'Eminent Domain Protections',
  'hp_12_squatter_rights': 'Squatter/Adverse Possession Rights',
  'hp_13_historic_preservation': 'Historic Preservation Rules',
  'hp_14_foreign_ownership': 'Foreign Property Ownership',
  'hp_15_transfer_tax': 'Property Transfer Tax',
  'hp_16_lawn_maintenance': 'Lawn Maintenance Requirements',
  'hp_17_exterior_modifications': 'Exterior Modification Rules',
  'hp_18_fence_regulations': 'Fence Regulations',
  'hp_19_parking_requirements': 'Residential Parking Rules',
  'hp_20_pet_restrictions': 'Pet Ownership Restrictions',

  // Business & Work (25 metrics)
  'bw_01_business_license': 'Business License Requirements',
  'bw_02_occupational_license': 'Occupational Licensing',
  'bw_03_minimum_wage': 'Minimum Wage Level',
  'bw_04_right_to_work': 'Right to Work Laws',
  'bw_05_employment_protections': 'Employment Protections',
  'bw_06_paid_leave': 'Mandatory Paid Leave',
  'bw_07_parental_leave': 'Parental Leave Requirements',
  'bw_08_non_compete': 'Non-Compete Enforceability',
  'bw_09_corporate_tax': 'Corporate Tax Rate',
  'bw_10_income_tax': 'State/Local Income Tax',
  'bw_11_sales_tax': 'Sales Tax Rate',
  'bw_12_gig_economy': 'Gig Worker Regulations',
  'bw_13_work_visa': 'Work Visa Friendliness',
  'bw_14_remote_work': 'Remote Work Laws',
  'bw_15_overtime_rules': 'Overtime Requirements',
  'bw_16_union_laws': 'Union Rights & Laws',
  'bw_17_workplace_safety': 'Workplace Safety Standards',
  'bw_18_anti_discrimination': 'Anti-Discrimination Laws',
  'bw_19_startup_friendliness': 'Startup Friendliness',
  'bw_20_food_truck_regs': 'Food Truck Regulations',
  'bw_21_contractor_license': 'Contractor Licensing',
  'bw_22_health_insurance_mandate': 'Health Insurance Mandate',
  'bw_23_tip_credit': 'Tip Credit Laws',
  'bw_24_banking_access': 'Banking Access',
  'bw_25_crypto_regulations': 'Cryptocurrency Regulations',

  // Transportation (15 metrics)
  'tr_01_public_transit': 'Public Transit Quality',
  'tr_02_walkability': 'Walkability Score',
  'tr_03_bike_infrastructure': 'Bike Infrastructure',
  'tr_04_car_dependency': 'Car Dependency Level',
  'tr_05_rideshare_regs': 'Rideshare Regulations',
  'tr_06_speed_limits': 'Speed Limit Enforcement',
  'tr_07_traffic_cameras': 'Traffic Camera Usage',
  'tr_08_parking_regulations': 'Parking Regulations',
  'tr_09_toll_roads': 'Toll Road Prevalence',
  'tr_10_vehicle_inspection': 'Vehicle Inspection Requirements',
  'tr_11_license_requirements': 'Driver License Requirements',
  'tr_12_dui_laws': 'DUI Law Severity',
  'tr_13_electric_vehicles': 'E-Vehicle/E-Bike Laws',
  'tr_14_airport_access': 'Airport Accessibility',
  'tr_15_traffic_congestion': 'Traffic Congestion Level',

  // Policing & Legal (15 metrics)
  'pl_01_incarceration_rate': 'Incarceration Rate',
  'pl_02_police_per_capita': 'Police Per Capita',
  'pl_03_civil_forfeiture': 'Civil Asset Forfeiture',
  'pl_04_mandatory_minimums': 'Mandatory Minimum Sentences',
  'pl_05_bail_system': 'Cash Bail System',
  'pl_06_police_oversight': 'Police Oversight',
  'pl_07_qualified_immunity': 'Qualified Immunity Status',
  'pl_08_legal_costs': 'Legal System Costs',
  'pl_09_court_efficiency': 'Court System Efficiency',
  'pl_10_jury_rights': 'Jury Nullification Rights',
  'pl_11_surveillance': 'Government Surveillance',
  'pl_12_search_seizure': 'Search & Seizure Protections',
  'pl_13_death_penalty': 'Death Penalty Status',
  'pl_14_prison_conditions': 'Prison Conditions',
  'pl_15_expungement': 'Criminal Record Expungement',

  // Speech & Lifestyle (10 metrics)
  'sl_01_free_speech': 'Free Speech Protections',
  'sl_02_press_freedom': 'Press Freedom',
  'sl_03_internet_freedom': 'Internet Freedom',
  'sl_04_hate_speech_laws': 'Hate Speech Laws',
  'sl_05_protest_rights': 'Protest Rights',
  'sl_06_religious_freedom': 'Religious Freedom',
  'sl_07_privacy_laws': 'Data Privacy Laws',
  'sl_08_dress_codes': 'Dress Code Freedom',
  'sl_09_cultural_tolerance': 'Cultural Tolerance',
  'sl_10_defamation_laws': 'Defamation Laws'
};

/**
 * Get display name for a metric ID
 */
function getMetricDisplayName(metricId: string): string {
  return METRIC_DISPLAY_NAMES[metricId] || metricId.replace(/_/g, ' ').replace(/^[a-z]{2}_\d{2}_/, '');
}

// ============================================================================
// CONTEXT BUILDER FUNCTIONS
// ============================================================================

/**
 * Check if result is enhanced (multi-LLM) format
 */
function isEnhancedResult(result: any): boolean {
  return 'llmsUsed' in result && Array.isArray(result.llmsUsed);
}

/**
 * Build context from standard ComparisonResult
 */
function buildStandardContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageScore > city2Cat.averageScore ? 'city1' :
                   city2Cat.averageScore > cat.averageScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference
    const metricDiffs = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.normalizedScore - (city2Cat.metrics[mIdx]?.normalizedScore || 0))
    }));
    metricDiffs.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricDiffs.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricName || md.metric.metricId,
      city1Score: Math.round(md.metric.normalizedScore),
      city2Score: Math.round(md.city2Metric?.normalizedScore || 0),
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageScore),
      city2Score: Math.round(city2Cat.averageScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from all metrics
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city1.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });
  city2.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city2.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });

  // Get ALL metrics with display names (sorted by score difference)
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: getMetricDisplayName(m.metricId),
        city1Score: Math.round(m.normalizedScore),
        city2Score: Math.round(city2Metric?.normalizedScore || 0),
        diff: Math.abs(m.normalizedScore - (city2Metric?.normalizedScore || 0)),
        category: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  // Include ALL metrics, not just top 10
  const topMetrics = allMetricDiffs;

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalScore),
        normalizedScore: Math.round(city1.normalizedScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalScore),
        normalizedScore: Math.round(city2.normalizedScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 20), // Limit evidence to avoid context overflow
    stats: {
      metricsEvaluated: allMetricDiffs.length,
      totalProcessingTimeMs: 0,
    },
  };
}

/**
 * Build context from EnhancedComparisonResult (multi-LLM)
 */
function buildEnhancedContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries with consensus data
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageConsensusScore > city2Cat.averageConsensusScore ? 'city1' :
                   city2Cat.averageConsensusScore > cat.averageConsensusScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference or disagreement
    const metricData = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.consensusScore - (city2Cat.metrics[mIdx]?.consensusScore || 0)),
      stdDev: m.standardDeviation || 0,
    }));
    metricData.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricData.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricId, // Will be formatted by client
      city1Score: Math.round(md.metric.consensusScore),
      city2Score: Math.round(md.city2Metric?.consensusScore || 0),
      consensusLevel: md.metric.confidenceLevel,
      judgeExplanation: md.metric.judgeExplanation,
      legalScore: md.metric.legalScore,
      enforcementScore: md.metric.enforcementScore,
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageConsensusScore),
      city2Score: Math.round(city2Cat.averageConsensusScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from LLM scores
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.llmScores) {
        metric.llmScores.forEach((llmScore: any) => {
          if (llmScore.evidence && llmScore.evidence.length > 0) {
            evidence.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: city1.city,
              sources: llmScore.evidence.map((e: any) => ({
                url: e.url,
                title: e.title,
                snippet: e.snippet,
              })),
            });
          }
        });
      }
    });
  });

  // Get top disagreements
  const topDisagreements: any[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((m: any) => {
      if (m.standardDeviation && m.standardDeviation > 10) {
        topDisagreements.push({
          metricName: m.metricId,
          standardDeviation: m.standardDeviation,
          explanation: m.judgeExplanation || 'LLMs disagreed on this metric.',
        });
      }
    });
  });
  topDisagreements.sort((a, b) => b.standardDeviation - a.standardDeviation);

  // Get ALL metrics with display names (sorted by score difference)
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: getMetricDisplayName(m.metricId),
        city1Score: Math.round(m.consensusScore),
        city2Score: Math.round(city2Metric?.consensusScore || 0),
        consensusLevel: m.confidenceLevel,
        judgeExplanation: m.judgeExplanation,
        diff: Math.abs(m.consensusScore - (city2Metric?.consensusScore || 0)),
        category: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  // Include ALL metrics, not just top 10
  const topMetrics = allMetricDiffs;

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalConsensusScore),
        normalizedScore: Math.round(city1.totalConsensusScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalConsensusScore),
        normalizedScore: Math.round(city2.totalConsensusScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 20),
    consensus: {
      llmsUsed: result.llmsUsed || [],
      judgeModel: result.judgeModel || 'claude-opus',
      overallConfidence: result.overallConsensusConfidence || 'medium',
      disagreementSummary: result.disagreementSummary,
      topDisagreements: topDisagreements.slice(0, 5),
    },
    stats: {
      metricsEvaluated: result.processingStats?.metricsEvaluated || allMetricDiffs.length,
      totalProcessingTimeMs: result.processingStats?.totalTimeMs || 0,
    },
  };
}

/**
 * Estimate token count for context
 */
function estimateTokens(context: LifeScoreContext): number {
  const json = JSON.stringify(context);
  // Rough estimate: ~4 characters per token
  return Math.ceil(json.length / 4);
}

/**
 * Truncate context if too large
 */
function truncateContext(context: LifeScoreContext, maxTokens: number): LifeScoreContext {
  let tokens = estimateTokens(context);

  if (tokens <= maxTokens) {
    return context;
  }

  // Progressively reduce data
  const truncated = { ...context };

  // First: reduce evidence
  if (truncated.evidence.length > 10) {
    truncated.evidence = truncated.evidence.slice(0, 10);
    tokens = estimateTokens(truncated);
    if (tokens <= maxTokens) return truncated;
  }

  // Second: reduce top metrics per category
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.slice(0, 2),
  }));
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Third: reduce overall top metrics
  truncated.topMetrics = truncated.topMetrics.slice(0, 5);
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Fourth: remove judge explanations
  truncated.topMetrics = truncated.topMetrics.map(m => ({
    ...m,
    judgeExplanation: undefined,
  }));
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.map(m => ({
      ...m,
      judgeExplanation: undefined,
    })),
  }));

  // Fifth: clear evidence entirely
  truncated.evidence = [];

  return truncated;
}

// ============================================================================
// TEXT SUMMARY GENERATOR
// ============================================================================

/**
 * Generate a human-readable text summary for Olivia's context
 */
function generateTextSummary(context: LifeScoreContext): string {
  const { comparison, categories, topMetrics } = context;
  const city1 = comparison.city1.name;
  const city2 = comparison.city2.name;

  let summary = `# LIFE SCORE Comparison Report\n\n`;
  summary += `## ${city1} vs ${city2}\n\n`;
  summary += `**Overall Winner:** ${comparison.winner} (by ${comparison.scoreDifference} points)\n`;
  summary += `**${city1}:** ${comparison.city1.normalizedScore}/100\n`;
  summary += `**${city2}:** ${comparison.city2.normalizedScore}/100\n\n`;

  // Category Breakdown
  summary += `## Category Breakdown\n\n`;
  categories.forEach(cat => {
    const catWinner = cat.winner === 'city1' ? city1 : cat.winner === 'city2' ? city2 : 'Tie';
    summary += `### ${cat.name}\n`;
    summary += `- ${city1}: ${cat.city1Score}/100\n`;
    summary += `- ${city2}: ${cat.city2Score}/100\n`;
    summary += `- Winner: ${catWinner}\n\n`;
  });

  // All Metrics (grouped by category)
  summary += `## All 100 Metrics Detail\n\n`;

  // Group metrics by category
  const metricsByCategory: Record<string, typeof topMetrics> = {};
  topMetrics.forEach(m => {
    const cat = m.category || 'Other';
    if (!metricsByCategory[cat]) metricsByCategory[cat] = [];
    metricsByCategory[cat].push(m);
  });

  Object.entries(metricsByCategory).forEach(([catName, metrics]) => {
    summary += `### ${catName}\n`;
    summary += `| Metric | ${city1} | ${city2} | Diff |\n`;
    summary += `|--------|---------|---------|------|\n`;
    metrics.forEach(m => {
      const diff = m.city1Score - m.city2Score;
      const diffStr = diff > 0 ? `+${diff}` : diff.toString();
      summary += `| ${m.name} | ${m.city1Score} | ${m.city2Score} | ${diffStr} |\n`;
    });
    summary += `\n`;
  });

  // Top 10 Biggest Differences (for quick reference)
  summary += `## Top 10 Biggest Differences\n\n`;
  const sortedByDiff = [...topMetrics].sort((a, b) => (b.diff || 0) - (a.diff || 0)).slice(0, 10);
  sortedByDiff.forEach((m, i) => {
    const better = m.city1Score > m.city2Score ? city1 : city2;
    const diff = Math.abs(m.city1Score - m.city2Score);
    summary += `${i + 1}. **${m.name}**: ${better} wins by ${diff} points (${m.city1Score} vs ${m.city2Score})\n`;
  });

  // Consensus info if available
  if (context.consensus) {
    summary += `\n## AI Consensus Information\n\n`;
    summary += `- LLMs Used: ${context.consensus.llmsUsed.join(', ')}\n`;
    summary += `- Judge Model: ${context.consensus.judgeModel}\n`;
    summary += `- Confidence: ${context.consensus.overallConfidence}\n`;

    if (context.consensus.topDisagreements.length > 0) {
      summary += `\n### Areas of LLM Disagreement\n`;
      context.consensus.topDisagreements.forEach(d => {
        summary += `- ${d.metricName}: StdDev ${d.standardDeviation.toFixed(1)} - ${d.explanation}\n`;
      });
    }
  }

  return summary;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - open for context
  if (handleCors(req, res, 'open')) return;

  // Rate limiting - standard preset for context
  if (!applyRateLimit(req.headers, 'olivia-context', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { comparisonResult, includeEvidence = true, maxTokens = 16000 } = req.body || {};

    if (!comparisonResult) {
      res.status(400).json({ error: 'comparisonResult is required' });
      return;
    }

    // Build context based on result type
    let context: LifeScoreContext;
    if (isEnhancedResult(comparisonResult)) {
      context = buildEnhancedContext(comparisonResult);
    } else {
      context = buildStandardContext(comparisonResult);
    }

    // Remove evidence if not requested
    if (!includeEvidence) {
      context.evidence = [];
    }

    // Generate text summary for Olivia to reference
    const textSummary = generateTextSummary(context);

    // Truncate if needed
    const tokenEstimate = estimateTokens(context);
    const truncated = tokenEstimate > maxTokens;
    if (truncated) {
      context = truncateContext(context, maxTokens);
    }

    res.status(200).json({
      context,
      textSummary,
      tokenEstimate: estimateTokens(context),
      truncated,
    });
  } catch (error) {
    console.error('[OLIVIA/CONTEXT] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build context',
    });
  }
}
