/**
 * LIFE SCORE™ Gamma Service
 * Client-side service for generating visual reports via Gamma API
 * Supports both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 *
 * IMPORTANT: This generates comprehensive prompts with ALL 100 legal freedom metrics
 */

import type {
  EnhancedComparisonResult,
  CategoryConsensus,
  MetricConsensus
} from '../types/enhancedComparison';
import type { ComparisonResult, CategoryScore, MetricScore } from '../types/metrics';
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

// Union type for both result types
export type AnyComparisonResult = EnhancedComparisonResult | ComparisonResult;

// Type guard to check if result is EnhancedComparisonResult
function isEnhancedResult(result: AnyComparisonResult): result is EnhancedComparisonResult {
  return 'llmsUsed' in result;
}

// ============================================================================
// METRIC ID TO DISPLAY NAME MAPPING (ALL 100 METRICS)
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

// Category display configuration
const CATEGORY_CONFIG: Record<string, { name: string; icon: string; metricCount: number; weight: string }> = {
  'personal_freedom': { name: 'Personal Autonomy', icon: '🗽', metricCount: 15, weight: '20%' },
  'personal-freedom': { name: 'Personal Autonomy', icon: '🗽', metricCount: 15, weight: '20%' },
  'housing_property': { name: 'Housing & Property', icon: '🏠', metricCount: 20, weight: '20%' },
  'housing-property': { name: 'Housing & Property', icon: '🏠', metricCount: 20, weight: '20%' },
  'business_work': { name: 'Business & Work', icon: '💼', metricCount: 25, weight: '20%' },
  'business-work': { name: 'Business & Work', icon: '💼', metricCount: 25, weight: '20%' },
  'transportation': { name: 'Transportation', icon: '🚇', metricCount: 15, weight: '15%' },
  'policing_legal': { name: 'Policing & Courts', icon: '⚖️', metricCount: 15, weight: '15%' },
  'policing-courts': { name: 'Policing & Courts', icon: '⚖️', metricCount: 15, weight: '15%' },
  'speech_lifestyle': { name: 'Speech & Lifestyle', icon: '🎭', metricCount: 10, weight: '10%' },
  'speech-lifestyle': { name: 'Speech & Lifestyle', icon: '🎭', metricCount: 10, weight: '10%' }
};

// ============================================================================
// FORMAT COMPARISON DATA FOR GAMMA - COMPREHENSIVE VERSION
// ============================================================================

/**
 * Get display name for a metric ID
 */
function getMetricDisplayName(metricId: string): string {
  return METRIC_DISPLAY_NAMES[metricId] || metricId.replace(/_/g, ' ').replace(/^[a-z]{2}_\d{2}_/, '');
}

/**
 * Format ALL metrics in a category for ENHANCED mode
 */
function formatEnhancedCategoryWithAllMetrics(
  categoryId: string,
  city1Name: string,
  city2Name: string,
  city1Consensus: CategoryConsensus,
  city2Consensus: CategoryConsensus
): string {
  const config = CATEGORY_CONFIG[categoryId] || { name: categoryId, icon: '📊', metricCount: 0, weight: '0%' };
  const city1Score = Math.round(city1Consensus.averageConsensusScore);
  const city2Score = Math.round(city2Consensus.averageConsensusScore);
  const catWinner = city1Score > city2Score ? city1Name : city2Score > city1Score ? city2Name : 'TIE';

  // Build metric table with ALL metrics
  const metricRows: string[] = [];
  city1Consensus.metrics.forEach((metric: MetricConsensus) => {
    const city2Metric = city2Consensus.metrics.find(m => m.metricId === metric.metricId);
    const name = getMetricDisplayName(metric.metricId);
    const score1 = Math.round(metric.consensusScore);
    const score2 = city2Metric ? Math.round(city2Metric.consensusScore) : 0;
    const metricWinner = score1 > score2 ? city1Name : score2 > score1 ? city2Name : 'TIE';
    metricRows.push(`| ${name} | ${score1} | ${score2} | ${metricWinner} |`);
  });

  return `
### ${config.icon} ${config.name} (${config.metricCount} metrics, ${config.weight} weight)
**Category Winner: ${catWinner}** | ${city1Name}: ${city1Score}/100 | ${city2Name}: ${city2Score}/100

| Metric | ${city1Name} | ${city2Name} | Winner |
|--------|-------------|-------------|--------|
${metricRows.join('\n')}
`;
}

/**
 * Format ALL metrics in a category for SIMPLE mode
 */
function formatSimpleCategoryWithAllMetrics(
  categoryId: string,
  city1Name: string,
  city2Name: string,
  city1Category: CategoryScore,
  city2Category: CategoryScore
): string {
  const config = CATEGORY_CONFIG[categoryId] || { name: categoryId, icon: '📊', metricCount: 0, weight: '0%' };
  const city1Score = Math.round(city1Category.averageScore);
  const city2Score = Math.round(city2Category.averageScore);
  const catWinner = city1Score > city2Score ? city1Name : city2Score > city1Score ? city2Name : 'TIE';

  // Build metric table with ALL metrics
  const metricRows: string[] = [];
  city1Category.metrics.forEach((metric: MetricScore) => {
    const city2Metric = city2Category.metrics.find(m => m.metricId === metric.metricId);
    const name = getMetricDisplayName(metric.metricId);
    const score1 = Math.round(metric.normalizedScore);
    const score2 = city2Metric ? Math.round(city2Metric.normalizedScore) : 0;
    const metricWinner = score1 > score2 ? city1Name : score2 > score1 ? city2Name : 'TIE';
    metricRows.push(`| ${name} | ${score1} | ${score2} | ${metricWinner} |`);
  });

  return `
### ${config.icon} ${config.name} (${config.metricCount} metrics, ${config.weight} weight)
**Category Winner: ${catWinner}** | ${city1Name}: ${city1Score}/100 | ${city2Name}: ${city2Score}/100

| Metric | ${city1Name} | ${city2Name} | Winner |
|--------|-------------|-------------|--------|
${metricRows.join('\n')}
`;
}

/**
 * Transform any comparison result into a Gamma-ready prompt string
 * COMPREHENSIVE VERSION: Includes ALL 100 metrics with explicit instructions
 */
export function formatComparisonForGamma(result: AnyComparisonResult): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;
  const winner = result.winner === 'city1' ? city1Name : result.winner === 'city2' ? city2Name : 'TIE';
  const loser = result.winner === 'city1' ? city2Name : result.winner === 'city2' ? city1Name : '';

  // Get scores based on mode
  const city1TotalScore = isEnhancedResult(result)
    ? Math.round(result.city1.totalConsensusScore)
    : Math.round(result.city1.totalScore);
  const city2TotalScore = isEnhancedResult(result)
    ? Math.round(result.city2.totalConsensusScore)
    : Math.round(result.city2.totalScore);
  const scoreDiff = Math.abs(result.scoreDifference);

  // Build ALL category sections with ALL metrics
  const categorySections: string[] = [];

  if (isEnhancedResult(result)) {
    result.city1.categories.forEach((city1Cat, index) => {
      const city2Cat = result.city2.categories[index];
      if (city1Cat && city2Cat) {
        categorySections.push(formatEnhancedCategoryWithAllMetrics(
          city1Cat.categoryId,
          city1Name,
          city2Name,
          city1Cat,
          city2Cat
        ));
      }
    });
  } else {
    result.city1.categories.forEach((city1Cat, index) => {
      const city2Cat = result.city2.categories[index];
      if (city1Cat && city2Cat) {
        categorySections.push(formatSimpleCategoryWithAllMetrics(
          city1Cat.categoryId,
          city1Name,
          city2Name,
          city1Cat,
          city2Cat
        ));
      }
    });
  }

  // Count category winners
  let city1CatWins = 0;
  let city2CatWins = 0;
  if (isEnhancedResult(result)) {
    result.city1.categories.forEach((city1Cat, index) => {
      const city2Cat = result.city2.categories[index];
      if (city1Cat && city2Cat) {
        if (city1Cat.averageConsensusScore > city2Cat.averageConsensusScore) city1CatWins++;
        else if (city2Cat.averageConsensusScore > city1Cat.averageConsensusScore) city2CatWins++;
      }
    });
  } else {
    result.city1.categories.forEach((city1Cat, index) => {
      const city2Cat = result.city2.categories[index];
      if (city1Cat && city2Cat) {
        if (city1Cat.averageScore > city2Cat.averageScore) city1CatWins++;
        else if (city2Cat.averageScore > city1Cat.averageScore) city2CatWins++;
      }
    });
  }

  // Count total metrics
  const totalMetrics = result.city1.categories.reduce((sum, cat) => {
    if (isEnhancedResult(result)) {
      return sum + (cat as CategoryConsensus).metrics.length;
    }
    return sum + (cat as CategoryScore).metrics.length;
  }, 0);

  // Build methodology section based on mode
  const methodologySection = isEnhancedResult(result)
    ? `
## METHODOLOGY
- **Evaluation Method:** Multi-LLM Consensus (${result.llmsUsed.length} AI models)
- **LLMs Used:** ${result.llmsUsed.join(', ')}
- **Final Judge:** ${result.judgeModel}
- **Consensus Confidence:** ${result.overallConsensusConfidence}
- **Total Metrics Evaluated:** ${result.processingStats.metricsEvaluated}
- **Report Generated:** ${new Date(result.generatedAt).toLocaleDateString()}

${result.disagreementSummary ? `**LLM Disagreement Notes:** ${result.disagreementSummary}` : ''}
`
    : `
## METHODOLOGY
- **Evaluation Method:** Single LLM with Web Search Verification
- **AI Model:** Claude Sonnet
- **Data Confidence:** ${result.city1.overallConfidence}
- **Total Metrics Evaluated:** ${totalMetrics}
- **Report Generated:** ${new Date(result.generatedAt).toLocaleDateString()}
`;

  // Build the comprehensive prompt
  return `
================================================================================
CRITICAL INSTRUCTIONS FOR GAMMA AI - READ CAREFULLY
================================================================================

This is a LIFE SCORE™ Legal Freedom Comparison Report. This report EXCLUSIVELY
compares LEGAL FREEDOM metrics between two cities.

**DO NOT ADD:**
- General tourism information
- Weather or climate comparisons
- Cost of living data (unless it's in our metrics)
- Nightlife or entertainment comparisons
- Food or restaurant information
- Any content not directly from the data below

**YOU MUST ONLY USE:**
- The exact scores and metrics provided below
- The exact winner declarations provided
- The methodology section exactly as written

This is a legal freedom analysis tool, NOT a general city comparison tool.

================================================================================
LIFE SCORE™ LEGAL FREEDOM COMPARISON REPORT
================================================================================

# ${city1Name}, ${city1Country} vs ${city2Name}, ${city2Country}
## LIFE SCORE™ Legal Independence & Freedom Evaluation

---

## 🏆 OVERALL WINNER: ${winner}

| City | Total LIFE SCORE | Categories Won |
|------|------------------|----------------|
| **${city1Name}** | **${city1TotalScore}/100** | ${city1CatWins} of 6 |
| **${city2Name}** | **${city2TotalScore}/100** | ${city2CatWins} of 6 |

**Score Difference:** ${scoreDiff} points
${result.winner !== 'tie' ? `**${winner} offers ${scoreDiff} more freedom points than ${loser}**` : '**Both cities scored equally on legal freedom**'}

---

## WHAT IS LIFE SCORE™?

LIFE SCORE (Legal Independence & Freedom Evaluation) measures **100 specific legal
freedom metrics** across 6 categories. Unlike subjective "livability" indexes,
LIFE SCORE evaluates concrete laws, regulations, and their enforcement.

**The 6 Categories (100 Total Metrics):**
1. 🗽 Personal Autonomy (15 metrics, 20% weight) - Vice laws, bodily autonomy
2. 🏠 Housing & Property (20 metrics, 20% weight) - Property rights, HOA rules
3. 💼 Business & Work (25 metrics, 20% weight) - Licensing, employment laws
4. 🚇 Transportation (15 metrics, 15% weight) - Mobility freedom
5. ⚖️ Policing & Courts (15 metrics, 15% weight) - Legal system fairness
6. 🎭 Speech & Lifestyle (10 metrics, 10% weight) - Expression, privacy

---

## DETAILED CATEGORY BREAKDOWN WITH ALL ${totalMetrics} METRICS

${categorySections.join('\n---\n')}

---

${methodologySection}

---

## ABOUT CLUES INTELLIGENCE LTD

LIFE SCORE™ is part of the CLUES (Comprehensive Location & Utility Evaluation
System) platform by Clues Intelligence LTD. We help individuals make data-driven
decisions about international relocation based on verified legal data.

**Website:** lifescore.cluesintelligence.com
**Copyright:** © 2025-2026 Clues Intelligence LTD. All Rights Reserved.

================================================================================
END OF DATA - USE ONLY THE INFORMATION ABOVE
================================================================================

**COMPREHENSIVE 30-PAGE REPORT STRUCTURE:**

**IMPORTANT: Generate a COMPLETE 30-page report covering all metrics.**

**Section 1: Overview (Pages 1-4)**
- Page 1: Title slide with winner (${winner}), both total scores, dramatic hero visual
- Page 2: Executive summary - key findings, overall winner, score gap analysis
- Page 3: LIFE SCORE methodology - what we measure, why it matters
- Page 4: 6-category visual comparison (radar/spider chart) + biggest gaps

**Section 2: Personal Autonomy (Pages 5-8)**
- Page 5: Category title + winner + scores + top 5 metrics table
- Page 6: Metrics 1-8 detailed comparison (compact table format)
- Page 7: Metrics 9-15 detailed comparison
- Page 8: Personal Autonomy key insights + infographic

**Section 3: Housing & Property (Pages 9-13)**
- Page 9: Category title + winner + scores + top 5 metrics
- Page 10: Metrics 1-7 detailed comparison
- Page 11: Metrics 8-14 detailed comparison
- Page 12: Metrics 15-20 detailed comparison
- Page 13: Housing & Property key insights + infographic

**Section 4: Business & Work (Pages 14-19)**
- Page 14: Category title + winner + scores + top 5 metrics
- Page 15: Metrics 1-9 detailed comparison
- Page 16: Metrics 10-17 detailed comparison
- Page 17: Metrics 18-25 detailed comparison
- Page 18: Business & Work key insights
- Page 19: Business & Work infographic summary

**Section 5: Transportation (Pages 20-23)**
- Page 20: Category title + winner + scores + top 5 metrics
- Page 21: All 15 metrics detailed comparison (compact table)
- Page 22: Transportation key insights
- Page 23: Transportation infographic

**Section 6: Policing & Courts (Pages 24-27)**
- Page 24: Category title + winner + scores + top 5 metrics
- Page 25: All 15 metrics detailed comparison (compact table)
- Page 26: Policing & Courts key insights
- Page 27: Policing & Courts infographic

**Section 7: Speech & Lifestyle + Conclusion (Pages 28-30)**
- Page 28: Speech & Lifestyle - all 10 metrics detailed
- Page 29: Speech & Lifestyle insights + Final verdict summary
- Page 30: Methodology recap, Clues Intelligence LTD branding, contact info

**CRITICAL: This report MUST be 30 pages. Use compact tables to fit all metrics.**
DO NOT ADD ANY CONTENT NOT EXPLICITLY PROVIDED IN THIS DATA.
`.trim();
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Generate a visual report via our API endpoint
 */
export async function generateVisualReport(
  result: AnyComparisonResult,
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
    const errorData = await response.json().catch((e) => { console.warn('[GammaService] Failed to parse error response:', e); return {}; });
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
    const errorData = await response.json().catch((e) => { console.warn('[GammaService] Failed to parse error response:', e); return {}; });
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
  result: AnyComparisonResult,
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
