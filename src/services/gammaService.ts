/**
 * LIFE SCOREâ„¢ Gamma Service
 * Client-side service for generating visual reports via Gamma API
 * Supports both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 *
 * IMPORTANT: This generates comprehensive prompts with ALL 100 legal & lived freedom metrics
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
// FIX #73: Import cost tracking utilities
import { appendServiceCost, calculateGammaCost } from '../utils/costCalculator';
// Session 16: Report storage imports
import { saveReport, type SaveReportData } from './reportStorageService';
import { supabase } from '../lib/supabase';
import type { Report } from '../types/database';

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
  // Personal Freedom (15) - keys match src/data/metrics.ts
  'pf_01_cannabis_legal': 'Cannabis Legality',
  'pf_02_alcohol_restrictions': 'Alcohol Purchase Restrictions',
  'pf_03_gambling_legal': 'Gambling Legality',
  'pf_04_prostitution_status': 'Sex Work Legal Status',
  'pf_05_drug_possession': 'Drug Possession Penalties',
  'pf_06_abortion_access': 'Abortion Access',
  'pf_07_lgbtq_rights': 'LGBTQ+ Rights',
  'pf_08_euthanasia_status': 'Assisted Dying Laws',
  'pf_09_smoking_regulations': 'Smoking Restrictions',
  'pf_10_public_drinking': 'Public Drinking Laws',
  'pf_11_helmet_laws': 'Helmet Laws',
  'pf_12_seatbelt_enforcement': 'Seatbelt Laws',
  'pf_13_jaywalking': 'Jaywalking Enforcement',
  'pf_14_curfew_laws': 'Curfew Laws',
  'pf_15_noise_ordinances': 'Noise Ordinances',
  // Housing & Property (20)
  'hp_01_hoa_prevalence': 'HOA Prevalence',
  'hp_02_hoa_power': 'HOA Power & Restrictions',
  'hp_03_property_tax_rate': 'Property Tax Rate',
  'hp_04_rent_control': 'Rent Control Laws',
  'hp_05_eviction_protection': 'Tenant Eviction Protections',
  'hp_06_zoning_strictness': 'Zoning Restrictions',
  'hp_07_building_permits': 'Building Permit Requirements',
  'hp_08_short_term_rental': 'Short-Term Rental (Airbnb) Laws',
  'hp_09_adu_laws': 'ADU (Accessory Dwelling) Laws',
  'hp_10_home_business': 'Home Business Restrictions',
  'hp_11_eminent_domain': 'Eminent Domain Protections',
  'hp_12_squatter_rights': 'Squatter/Adverse Possession Rights',
  'hp_13_historic_preservation': 'Historic Preservation Rules',
  'hp_14_foreign_ownership': 'Foreign Property Ownership',
  'hp_15_transfer_taxes': 'Property Transfer Tax',
  'hp_16_lawn_regulations': 'Lawn Maintenance Requirements',
  'hp_17_exterior_colors': 'Exterior Modification Rules',
  'hp_18_fence_rules': 'Fence Regulations',
  'hp_19_vehicle_parking': 'Residential Parking Rules',
  'hp_20_pet_restrictions': 'Pet Ownership Restrictions',
  // Business & Work (25)
  'bw_01_business_license': 'Business License Requirements',
  'bw_02_occupational_licensing': 'Occupational Licensing',
  'bw_03_minimum_wage': 'Minimum Wage Level',
  'bw_04_right_to_work': 'Right to Work Laws',
  'bw_05_at_will_employment': 'Employment Protections',
  'bw_06_paid_leave_mandate': 'Mandatory Paid Leave',
  'bw_07_parental_leave': 'Parental Leave Requirements',
  'bw_08_non_compete': 'Non-Compete Enforceability',
  'bw_09_corporate_tax': 'Corporate Tax Rate',
  'bw_10_income_tax': 'State/Local Income Tax',
  'bw_11_sales_tax': 'Sales Tax Rate',
  'bw_12_freelance_regs': 'Gig Worker Regulations',
  'bw_13_work_visa': 'Work Visa Friendliness',
  'bw_14_remote_work': 'Remote Work Laws',
  'bw_15_overtime_rules': 'Overtime Requirements',
  'bw_16_union_rights': 'Union Rights & Laws',
  'bw_17_workplace_safety': 'Workplace Safety Standards',
  'bw_18_discrimination_law': 'Anti-Discrimination Laws',
  'bw_19_startup_ease': 'Startup Friendliness',
  'bw_20_food_truck': 'Food Truck Regulations',
  'bw_21_contractor_license': 'Contractor Licensing',
  'bw_22_health_insurance': 'Health Insurance Mandate',
  'bw_23_tip_credit': 'Tip Credit Laws',
  'bw_24_banking_access': 'Banking Access',
  'bw_25_crypto_regulation': 'Cryptocurrency Regulations',
  // Transportation (15)
  'tr_01_public_transit_quality': 'Public Transit Quality',
  'tr_02_walkability': 'Walkability Score',
  'tr_03_bike_infrastructure': 'Bike Infrastructure',
  'tr_04_car_dependency': 'Car Dependency Level',
  'tr_05_rideshare_legal': 'Rideshare Regulations',
  'tr_06_speed_limits': 'Speed Limit Enforcement',
  'tr_07_speed_camera': 'Traffic Camera Usage',
  'tr_08_parking_regs': 'Parking Regulations',
  'tr_09_toll_roads': 'Toll Road Prevalence',
  'tr_10_vehicle_inspection': 'Vehicle Inspection Requirements',
  'tr_11_drivers_license': 'Driver License Requirements',
  'tr_12_dui_laws': 'DUI Law Severity',
  'tr_13_scooter_ebike': 'E-Vehicle/E-Bike Laws',
  'tr_14_airport_access': 'Airport Accessibility',
  'tr_15_traffic_congestion': 'Traffic Congestion Level',
  // Policing & Legal (15)
  'pl_01_incarceration_rate': 'Incarceration Rate',
  'pl_02_police_per_capita': 'Police Per Capita',
  'pl_03_civil_forfeiture': 'Civil Asset Forfeiture',
  'pl_04_mandatory_minimum': 'Mandatory Minimum Sentences',
  'pl_05_bail_system': 'Cash Bail System',
  'pl_06_police_accountability': 'Police Oversight',
  'pl_07_qualified_immunity': 'Qualified Immunity Status',
  'pl_08_legal_costs': 'Legal System Costs',
  'pl_09_court_efficiency': 'Court System Efficiency',
  'pl_10_jury_trial': 'Jury Nullification Rights',
  'pl_11_surveillance': 'Government Surveillance',
  'pl_12_search_seizure': 'Search & Seizure Protections',
  'pl_13_death_penalty': 'Death Penalty Status',
  'pl_14_prison_conditions': 'Prison Conditions',
  'pl_15_record_expungement': 'Criminal Record Expungement',
  // Speech & Lifestyle (10)
  'sl_01_free_speech': 'Free Speech Protections',
  'sl_02_press_freedom': 'Press Freedom',
  'sl_03_internet_freedom': 'Internet Freedom',
  'sl_04_hate_speech_laws': 'Hate Speech Laws',
  'sl_05_protest_rights': 'Protest Rights',
  'sl_06_religious_freedom': 'Religious Freedom',
  'sl_07_data_privacy': 'Data Privacy Laws',
  'sl_08_dress_code': 'Dress Code Freedom',
  'sl_09_cultural_tolerance': 'Cultural Tolerance',
  'sl_10_defamation_laws': 'Defamation Laws'
};

// Category display configuration
const CATEGORY_CONFIG: Record<string, { name: string; icon: string; metricCount: number; weight: string }> = {
  'personal_freedom': { name: 'Personal Autonomy', icon: 'ðŸ—½', metricCount: 15, weight: '20%' },
  'personal-freedom': { name: 'Personal Autonomy', icon: 'ðŸ—½', metricCount: 15, weight: '20%' },
  'housing_property': { name: 'Housing & Property', icon: 'ðŸ ', metricCount: 20, weight: '20%' },
  'housing-property': { name: 'Housing & Property', icon: 'ðŸ ', metricCount: 20, weight: '20%' },
  'business_work': { name: 'Business & Work', icon: 'ðŸ’¼', metricCount: 25, weight: '20%' },
  'business-work': { name: 'Business & Work', icon: 'ðŸ’¼', metricCount: 25, weight: '20%' },
  'transportation': { name: 'Transportation', icon: 'ðŸš‡', metricCount: 15, weight: '15%' },
  'policing_legal': { name: 'Policing & Courts', icon: 'âš–ï¸', metricCount: 15, weight: '15%' },
  'policing-courts': { name: 'Policing & Courts', icon: 'âš–ï¸', metricCount: 15, weight: '15%' },
  'speech_lifestyle': { name: 'Speech & Lifestyle', icon: 'ðŸŽ­', metricCount: 10, weight: '10%' },
  'speech-lifestyle': { name: 'Speech & Lifestyle', icon: 'ðŸŽ­', metricCount: 10, weight: '10%' }
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
  const config = CATEGORY_CONFIG[categoryId] || { name: categoryId, icon: 'ðŸ“Š', metricCount: 0, weight: '0%' };
  const city1Score = Math.round(city1Consensus.averageConsensusScore ?? 0);
  const city2Score = Math.round(city2Consensus.averageConsensusScore ?? 0);
  const catWinner = city1Score > city2Score ? city1Name : city2Score > city1Score ? city2Name : 'TIE';

  // Build metric table with ALL metrics
  const metricRows: string[] = [];
  city1Consensus.metrics.forEach((metric: MetricConsensus) => {
    const city2Metric = city2Consensus.metrics.find(m => m.metricId === metric.metricId);
    const name = getMetricDisplayName(metric.metricId);
    const score1 = Math.round(metric.consensusScore ?? 0);
    const score2 = city2Metric ? Math.round(city2Metric.consensusScore ?? 0) : 0;
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
  const config = CATEGORY_CONFIG[categoryId] || { name: categoryId, icon: 'ðŸ“Š', metricCount: 0, weight: '0%' };
  const city1Score = Math.round(city1Category.averageScore ?? 0);
  const city2Score = Math.round(city2Category.averageScore ?? 0);
  const catWinner = city1Score > city2Score ? city1Name : city2Score > city1Score ? city2Name : 'TIE';

  // Build metric table with ALL metrics
  const metricRows: string[] = [];
  city1Category.metrics.forEach((metric: MetricScore) => {
    const city2Metric = city2Category.metrics.find(m => m.metricId === metric.metricId);
    const name = getMetricDisplayName(metric.metricId);
    const score1 = Math.round(metric.normalizedScore ?? 0);
    const score2 = city2Metric ? Math.round(city2Metric.normalizedScore ?? 0) : 0;
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
        const score1 = city1Cat.averageConsensusScore ?? 0;
        const score2 = city2Cat.averageConsensusScore ?? 0;
        if (score1 > score2) city1CatWins++;
        else if (score2 > score1) city2CatWins++;
      }
    });
  } else {
    result.city1.categories.forEach((city1Cat, index) => {
      const city2Cat = result.city2.categories[index];
      if (city1Cat && city2Cat) {
        const score1 = city1Cat.averageScore ?? 0;
        const score2 = city2Cat.averageScore ?? 0;
        if (score1 > score2) city1CatWins++;
        else if (score2 > score1) city2CatWins++;
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

This is a LIFE SCOREâ„¢ Freedom Comparison Report. This report EXCLUSIVELY
compares LEGAL FREEDOM (written law) AND LIVED FREEDOM (enforcement reality) metrics between two cities.

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

This is a legal & lived freedom analysis tool, NOT a general city comparison tool.

================================================================================
LIFE SCOREâ„¢ LEGAL & LIVED FREEDOM COMPARISON REPORT
================================================================================

# ${city1Name}, ${city1Country} vs ${city2Name}, ${city2Country}
## LIFE SCOREâ„¢ Legal Independence & Freedom Evaluation

---

## ðŸ† OVERALL WINNER: ${winner}

| City | Total LIFE SCORE | Categories Won |
|------|------------------|----------------|
| **${city1Name}** | **${city1TotalScore}/100** | ${city1CatWins} of 6 |
| **${city2Name}** | **${city2TotalScore}/100** | ${city2CatWins} of 6 |

**Score Difference:** ${scoreDiff} points
${result.winner !== 'tie' ? `**${winner} offers ${scoreDiff} more freedom points than ${loser}**` : '**Both cities scored equally on legal & lived freedom**'}

---

## WHAT IS LIFE SCOREâ„¢?

LIFE SCORE (Legal Independence & Freedom Evaluation) measures **100 specific freedom
metrics** across 6 categories, capturing TWO types of freedom:

1. **Legal Freedom** - What the written law officially states
2. **Lived Freedom** - How laws are actually enforced in daily life

Unlike subjective "livability" indexes, LIFE SCORE evaluates concrete laws,
regulations, AND their real-world enforcement.

**The 6 Categories (100 Total Metrics):**
1. ðŸ—½ Personal Autonomy (15 metrics, 20% weight) - Vice laws, bodily autonomy
2. ðŸ  Housing & Property (20 metrics, 20% weight) - Property rights, HOA rules
3. ðŸ’¼ Business & Work (25 metrics, 20% weight) - Licensing, employment laws
4. ðŸš‡ Transportation (15 metrics, 15% weight) - Mobility freedom
5. âš–ï¸ Policing & Courts (15 metrics, 15% weight) - Legal system fairness
6. ðŸŽ­ Speech & Lifestyle (10 metrics, 10% weight) - Expression, privacy

---

## DETAILED CATEGORY BREAKDOWN WITH ALL ${totalMetrics} METRICS

${categorySections.join('\n---\n')}

---

${methodologySection}

---

## ABOUT CLUES INTELLIGENCE LTD

LIFE SCOREâ„¢ is part of the CLUES (Comprehensive Location & Utility Evaluation
System) platform by Clues Intelligence LTD. We help individuals make data-driven
decisions about international relocation based on verified legal data.

**Website:** clueslifescore.com
**Copyright:** Â© 2025-2026 Clues Intelligence LTD. All Rights Reserved.

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

  const data: VisualReportResponse = await response.json();

  // FIX #73: Record Gamma generation cost (~$0.50 per generation)
  if (data.generationId) {
    const cost = calculateGammaCost();
    appendServiceCost('gamma', {
      generationId: data.generationId,
      cost,
      timestamp: Date.now(),
    });
  }

  return data;
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

// ============================================================================
// ENHANCED 64-PAGE REPORT (v3.0) - NEW FUNCTIONS
// ============================================================================
// IMPORTANT: These are NEW functions that do NOT modify existing code above.
// The existing formatComparisonForGamma() remains untouched.
// ============================================================================

// Extended polling for enhanced 82-page reports (15 minutes max)
// 82 pages with AI images typically takes 8-12 minutes
const MAX_POLL_ATTEMPTS_ENHANCED = 180;  // 180 attempts * 5 sec = 15 minutes
const PROMPT_LENGTH_WARNING = 95000;
const PROMPT_LENGTH_MAX = 100000;

// Types for Judge Report integration
interface JudgeReportData {
  executiveSummary?: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  categoryAnalysis?: Array<{
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }>;
  freedomEducation?: {
    categories: Array<{
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      winningMetrics: Array<{
        metricId: string;
        metricName: string;
        winnerScore: number;
        loserScore: number;
        realWorldExample: string;
      }>;
      heroStatement: string;
    }>;
    winnerCity: string;
    loserCity: string;
  };
  summaryOfFindings?: {
    city1Score: number;
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'rising' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
}

// Types for Gun Comparison integration
interface GunComparisonData {
  cityA: string;
  cityB: string;
  categories: Array<{
    label: string;
    cityA: string;
    cityB: string;
  }>;
  summary: string;
  disclaimer: string;
}

// ============================================================================
// HELPER: Get trend arrow emoji
// ============================================================================
function getTrendArrow(trend: 'rising' | 'stable' | 'declining' | undefined): string {
  switch (trend) {
    case 'rising': return '📈';
    case 'declining': return '📉';
    case 'stable':
    default: return '➡️';
  }
}

// ============================================================================
// HELPER: Get confidence color
// ============================================================================
function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high':
    case 'unanimous':
    case 'strong':
      return '#1C5D1F'; // Dark Green
    case 'medium':
    case 'moderate':
      return '#FBBF24'; // Yellow
    case 'low':
    case 'split':
    default:
      return '#F97316'; // Orange
  }
}

// ============================================================================
// SECTION 1: EXECUTIVE SUMMARY (Pages 1-8)
// ============================================================================
function formatSection1ExecutiveSummary(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;
  const winner = result.winner === 'city1' ? city1Name : result.winner === 'city2' ? city2Name : 'TIE';
  const loser = result.winner === 'city1' ? city2Name : result.winner === 'city2' ? city1Name : '';
  const city1Score = Math.round(result.city1.totalConsensusScore);
  const city2Score = Math.round(result.city2.totalConsensusScore);
  const scoreDiff = Math.abs(result.scoreDifference);

  // Get trend data from judge report
  const city1Trend = judgeReport?.summaryOfFindings?.city1Trend || 'stable';
  const city2Trend = judgeReport?.summaryOfFindings?.city2Trend || 'stable';
  const confidence = judgeReport?.executiveSummary?.confidenceLevel || result.overallConsensusConfidence;

  // Count category winners
  let city1CatWins = 0;
  let city2CatWins = 0;
  Object.values(result.categoryWinners).forEach(w => {
    if (w === 'city1') city1CatWins++;
    else if (w === 'city2') city2CatWins++;
  });

  // Build category radar data
  const radarData = result.city1.categories.map((cat, idx) => {
    const cat2 = result.city2.categories[idx];
    const config = CATEGORY_CONFIG[cat.categoryId] || { name: cat.categoryId, icon: '📊' };
    return `${config.icon} ${config.name}: ${city1Name} ${Math.round(cat.averageConsensusScore || 0)} | ${city2Name} ${Math.round(cat2?.averageConsensusScore || 0)}`;
  }).join('\n');

  // Key factors from judge
  const keyFactors = judgeReport?.executiveSummary?.keyFactors?.slice(0, 5).map((f, i) =>
    `${i + 1}. ${f}`
  ).join('\n') || '1. Overall freedom metric analysis\n2. Legal framework comparison\n3. Enforcement reality assessment';

  return `
## SECTION 1: EXECUTIVE SUMMARY

---

### PAGE 1: TITLE

image-layout="right"
prompt="dramatic split cityscape view of ${city1Name} and ${city2Name}, cinematic lighting, freedom theme"

# LIFE SCORE™ Enhanced Freedom Comparison Report

## ${city1Name}, ${city1Country} vs ${city2Name}, ${city2Country}

<labels>
<label variant="solid" color="#FFD700">🏆 WINNER: ${winner}</label>
<label variant="outline">Report ID: ${result.comparisonId}</label>
<label variant="outline">Generated: ${new Date(result.generatedAt).toLocaleDateString()}</label>
</labels>

**64-Page Enhanced Analysis** | **100 Freedom Metrics** | **6 AI Models** | **Dual Scoring (Law + Reality)**

---

### PAGE 2: THE JUDGE'S VERDICT

<labels><label variant="solid" color="#7C3AED">🎭 The Judge's Verdict</label></labels>

## Overall Winner: ${winner}

<display size="lg" color="${result.winner === 'city1' ? '#FFD700' : '#1E90FF'}">${winner}</display>

**Claude Opus 4.5 Recommendation:**

<blockquote>
${judgeReport?.executiveSummary?.rationale || `Based on comprehensive analysis of 100 freedom metrics across 6 categories, ${winner} demonstrates superior overall freedom scores. The ${scoreDiff}-point margin reflects meaningful differences in how laws are written AND enforced in daily life.`}
</blockquote>

**Confidence Level:** ${confidence?.toUpperCase() || 'HIGH'}

**Key Rationale:**
${judgeReport?.executiveSummary?.keyFactors?.slice(0, 4).map(f => `- ${f}`).join('\n') || `- Higher scores in ${city1CatWins > city2CatWins ? city1CatWins : city2CatWins} of 6 categories\n- Stronger legal framework protections\n- More favorable enforcement reality`}

---

### PAGE 3: SCORE OVERVIEW

<smart-layout variant="semiCircle">
<item label="${city1Name}" value="${city1Score}" max="100" color="${result.winner === 'city1' ? '#FFD700' : '#1E90FF'}">
${getTrendArrow(city1Trend)} Trend: ${city1Trend}
</item>
<item label="${city2Name}" value="${city2Score}" max="100" color="${result.winner === 'city2' ? '#FFD700' : '#1E90FF'}">
${getTrendArrow(city2Trend)} Trend: ${city2Trend}
</item>
</smart-layout>

**Score Difference:** <display size="md" color="#10B981">${scoreDiff} points</display>

| Metric | ${city1Name} | ${city2Name} |
|--------|-------------|-------------|
| **Total LIFE SCORE** | **${city1Score}/100** | **${city2Score}/100** |
| Categories Won | ${city1CatWins} of 6 | ${city2CatWins} of 6 |
| Trend | ${getTrendArrow(city1Trend)} ${city1Trend} | ${getTrendArrow(city2Trend)} ${city2Trend} |

---

### PAGE 4: CATEGORY COMPARISON

<diagram type="rings">
${radarData}
</diagram>

**Category Breakdown:**

| Category | ${city1Name} | ${city2Name} | Winner |
|----------|-------------|-------------|--------|
${result.city1.categories.map((cat, idx) => {
  const cat2 = result.city2.categories[idx];
  const config = CATEGORY_CONFIG[cat.categoryId] || { name: cat.categoryId, icon: '📊' };
  const score1 = Math.round(cat.averageConsensusScore || 0);
  const score2 = Math.round(cat2?.averageConsensusScore || 0);
  const catWinner = score1 > score2 ? city1Name : score2 > score1 ? city2Name : 'TIE';
  return `| ${config.icon} ${config.name} | ${score1} | ${score2} | **${catWinner}** |`;
}).join('\n')}

---

### PAGE 5: SCORE BREAKDOWN BY WEIGHT

<smart-layout variant="barStats">
<item label="🗽 Personal Autonomy (20%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'personal_freedom')?.averageConsensusScore || 0) * 0.2)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'personal_freedom')?.averageConsensusScore || 0) * 0.2)}" color1="${result.winner === 'city1' ? '#FFD700' : '#1E90FF'}" color2="${result.winner === 'city2' ? '#FFD700' : '#1E90FF'}">
${city1Name} vs ${city2Name}
</item>
<item label="🏠 Housing & Property (20%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore || 0) * 0.2)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore || 0) * 0.2)}">
</item>
<item label="💼 Business & Work (20%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore || 0) * 0.2)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore || 0) * 0.2)}">
</item>
<item label="🚇 Transportation (15%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore || 0) * 0.15)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore || 0) * 0.15)}">
</item>
<item label="⚖️ Policing & Courts (15%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'policing_legal')?.averageConsensusScore || 0) * 0.15)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'policing_legal')?.averageConsensusScore || 0) * 0.15)}">
</item>
<item label="🎭 Speech & Lifestyle (10%)" value1="${Math.round((result.city1.categories.find(c => c.categoryId === 'speech_lifestyle')?.averageConsensusScore || 0) * 0.1)}" value2="${Math.round((result.city2.categories.find(c => c.categoryId === 'speech_lifestyle')?.averageConsensusScore || 0) * 0.1)}">
</item>
</smart-layout>

---

### PAGE 6: KEY DECISION DRIVERS

<smart-layout variant="processSteps" numbered="true">
${keyFactors}
</smart-layout>

**Top 5 Factors Determining the Winner:**

These metrics contributed most to ${winner}'s victory, accounting for the majority of the ${scoreDiff}-point margin.

---

### PAGE 7: FUTURE OUTLOOK

| ${city1Name} | ${city2Name} |
|-------------|-------------|
| ${getTrendArrow(city1Trend)} **Trend: ${city1Trend?.toUpperCase()}** | ${getTrendArrow(city2Trend)} **Trend: ${city2Trend?.toUpperCase()}** |
| ${judgeReport?.executiveSummary?.futureOutlook?.split('.').slice(0, 2).join('.') || 'Stable regulatory environment expected. Monitor upcoming legislative sessions for potential changes.'} | ${judgeReport?.categoryAnalysis?.[0]?.trendNotes || 'Current trajectory suggests maintaining relative position. Watch for policy reforms that could shift the balance.'} |

**3-5 Year Forecast:**
- ${city1Name}: ${city1Trend === 'rising' ? 'Likely to improve further' : city1Trend === 'declining' ? 'May face regulatory challenges' : 'Expected to maintain current levels'}
- ${city2Name}: ${city2Trend === 'rising' ? 'Likely to improve further' : city2Trend === 'declining' ? 'May face regulatory challenges' : 'Expected to maintain current levels'}

---

### PAGE 8: WHAT COULD CHANGE THE OUTCOME?

<smart-layout variant="outlineBoxesWithSideLine">
<item label="Scenario 1: Equal Weights">
If all 6 categories weighted equally at 16.67%, ${winner} ${scoreDiff > 10 ? 'still wins' : 'margin narrows significantly'}
</item>
<item label="Scenario 2: Business Focus">
Weighting Business & Work at 40%, ${result.categoryWinners['business_work'] === 'city1' ? city1Name : city2Name} gains advantage
</item>
<item label="Scenario 3: Personal Freedom Priority">
Weighting Personal Autonomy at 40%, ${result.categoryWinners['personal_freedom'] === 'city1' ? city1Name : city2Name} leads
</item>
<item label="Scenario 4: Safety Focus">
Weighting Policing & Courts at 35%, ${result.categoryWinners['policing_legal'] === 'city1' ? city1Name : city2Name} benefits
</item>
<item label="⚠️ The Only Scenario Where ${loser || 'the other city'} Wins">
${loser ? `${loser} would need significant reforms in ${city1CatWins > city2CatWins ? 'multiple categories simultaneously' : 'their weakest areas'}, combined with ${winner} experiencing regulatory setbacks.` : 'In a tie scenario, both cities offer comparable freedom levels.'}
</item>
</smart-layout>

`;
}

// ============================================================================
// SECTION 2: LAW VS REALITY (Pages 9-12)
// ============================================================================
function formatSection2LawVsReality(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;

  // Find biggest gaps between legal and enforcement scores
  const allMetrics: Array<{
    metricId: string;
    city: string;
    legalScore: number;
    enforcementScore: number;
    gap: number;
    type: 'paper_tiger' | 'surprise_restriction';
  }> = [];

  [result.city1, result.city2].forEach(city => {
    city.categories.forEach(cat => {
      cat.metrics.forEach(metric => {
        const legal = metric.legalScore ?? metric.consensusScore ?? 0;
        const enforcement = metric.enforcementScore ?? metric.consensusScore ?? 0;
        const gap = legal - enforcement;
        if (Math.abs(gap) > 10) {
          allMetrics.push({
            metricId: metric.metricId,
            city: city.city,
            legalScore: legal,
            enforcementScore: enforcement,
            gap,
            type: gap > 0 ? 'paper_tiger' : 'surprise_restriction'
          });
        }
      });
    });
  });

  // Sort by absolute gap
  const sortedGaps = allMetrics.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 7);
  const paperTigers = sortedGaps.filter(m => m.type === 'paper_tiger').slice(0, 3);
  const surpriseRestrictions = sortedGaps.filter(m => m.type === 'surprise_restriction').slice(0, 3);

  return `
## SECTION 2: LAW VS REALITY (Dual Scoring)

---

### PAGE 9: UNDERSTANDING DUAL SCORES

<smart-layout variant="solidBoxes">
<item label="📜 Legal Score (Law on Paper)" color="#6B46C1">
What the written law officially states. Includes statutes, regulations, and official policies.
</item>
<item label="🏙️ Lived Score (Reality on Street)" color="#14B8A6">
How laws are actually enforced in daily life. Reflects real-world experience and enforcement patterns.
</item>
</smart-layout>

**Why Both Matter:**

| Scenario | Legal Score | Lived Score | Result |
|----------|-------------|-------------|--------|
| **Paper Tiger** | High (80+) | Low (40-) | Law exists but rarely enforced |
| **Surprise Restriction** | Low (40-) | High (80+) | Strict enforcement despite weak law |
| **True Freedom** | High | High | Protected by law AND practice |
| **True Restriction** | Low | Low | Restricted by law AND enforced |

---

### PAGE 10: DUAL SCORE SUMMARY BY CATEGORY

<smart-layout variant="barStats">
${result.city1.categories.map((cat, idx) => {
  const cat2 = result.city2.categories[idx];
  const config = CATEGORY_CONFIG[cat.categoryId] || { name: cat.categoryId, icon: '📊' };

  // Calculate average legal and lived scores for category
  const city1Legal = Math.round(cat.metrics.reduce((sum, m) => sum + (m.legalScore ?? m.consensusScore ?? 0), 0) / cat.metrics.length);
  const city1Lived = Math.round(cat.metrics.reduce((sum, m) => sum + (m.enforcementScore ?? m.consensusScore ?? 0), 0) / cat.metrics.length);
  const city2Legal = Math.round(cat2.metrics.reduce((sum, m) => sum + (m.legalScore ?? m.consensusScore ?? 0), 0) / cat2.metrics.length);
  const city2Lived = Math.round(cat2.metrics.reduce((sum, m) => sum + (m.enforcementScore ?? m.consensusScore ?? 0), 0) / cat2.metrics.length);

  return `<item label="${config.icon} ${config.name}">
${city1Name}: 📜 ${city1Legal} | 🏙️ ${city1Lived}
${city2Name}: 📜 ${city2Legal} | 🏙️ ${city2Lived}
</item>`;
}).join('\n')}
</smart-layout>

**Legend:** 📜 = Legal Score (purple) | 🏙️ = Lived Score (teal)

---

### PAGE 11: BIGGEST LAW VS REALITY GAPS

**Top Discrepancies Between Written Law and Enforcement:**

| Rank | City | Metric | Legal | Lived | Gap | Type |
|------|------|--------|-------|-------|-----|------|
${sortedGaps.map((m, i) => {
  const name = getMetricDisplayName(m.metricId);
  const gapColor = m.gap > 0 ? '🟢' : '🔴';
  return `| ${i + 1} | ${m.city} | ${name} | ${Math.round(m.legalScore)} | ${Math.round(m.enforcementScore)} | ${gapColor} ${Math.abs(Math.round(m.gap))} | ${m.type === 'paper_tiger' ? 'Paper Tiger' : 'Surprise'} |`;
}).join('\n')}

**Interpretation:**
- 🟢 **Paper Tigers**: Laws look good on paper but aren't enforced
- 🔴 **Surprise Restrictions**: Enforcement stricter than law suggests

---

### PAGE 12: REAL-WORLD EXAMPLES

| 📜 Paper Tiger Laws | 🔒 Surprise Restrictions |
|---------------------|-------------------------|
${paperTigers.map(m => `| **${m.city}**: ${getMetricDisplayName(m.metricId)} - Law suggests freedom (${Math.round(m.legalScore)}) but enforcement is limited (${Math.round(m.enforcementScore)}) |`).join('\n') || '| No significant paper tigers found |'}
${surpriseRestrictions.map(m => `| | **${m.city}**: ${getMetricDisplayName(m.metricId)} - Law is permissive but enforcement is strict |`).join('\n') || '| No significant surprise restrictions found |'}

<blockquote>
Understanding the gap between law and reality is crucial for anyone considering relocation. A city with strong laws on paper may disappoint if enforcement is lax, while a city with weaker laws may surprise with strict practical enforcement.
</blockquote>

`;
}

// ============================================================================
// SECTION 3: CATEGORY DEEP DIVES (Pages 13-42) - 5 pages each x 6 categories
// ============================================================================
function formatSection3CategoryDeepDives(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;

  const categoryOrder = [
    'personal_freedom',
    'housing_property',
    'business_work',
    'transportation',
    'policing_legal',
    'speech_lifestyle'
  ];

  let output = `
## SECTION 3: CATEGORY DEEP DIVES

`;

  categoryOrder.forEach((catId, catIndex) => {
    const cat1 = result.city1.categories.find(c => c.categoryId === catId);
    const cat2 = result.city2.categories.find(c => c.categoryId === catId);

    if (!cat1 || !cat2) return;

    const config = CATEGORY_CONFIG[catId] || { name: catId, icon: '📊', metricCount: 0, weight: '0%' };
    const score1 = Math.round(cat1.averageConsensusScore || 0);
    const score2 = Math.round(cat2.averageConsensusScore || 0);
    const catWinner = score1 > score2 ? city1Name : score2 > score1 ? city2Name : 'TIE';

    // Calculate legal vs lived averages
    const city1Legal = Math.round(cat1.metrics.reduce((sum, m) => sum + (m.legalScore ?? m.consensusScore ?? 0), 0) / cat1.metrics.length);
    const city1Lived = Math.round(cat1.metrics.reduce((sum, m) => sum + (m.enforcementScore ?? m.consensusScore ?? 0), 0) / cat1.metrics.length);
    const city2Legal = Math.round(cat2.metrics.reduce((sum, m) => sum + (m.legalScore ?? m.consensusScore ?? 0), 0) / cat2.metrics.length);
    const city2Lived = Math.round(cat2.metrics.reduce((sum, m) => sum + (m.enforcementScore ?? m.consensusScore ?? 0), 0) / cat2.metrics.length);

    // Get judge analysis for this category
    const judgeAnalysis = judgeReport?.categoryAnalysis?.find(a => a.categoryId === catId);
    const freedomEd = judgeReport?.freedomEducation?.categories.find(c => c.categoryId === catId);

    // Find top winning metrics
    const metricDiffs = cat1.metrics.map((m1, i) => {
      const m2 = cat2.metrics[i];
      return {
        metricId: m1.metricId,
        score1: m1.consensusScore ?? 0,
        score2: m2?.consensusScore ?? 0,
        diff: (m1.consensusScore ?? 0) - (m2?.consensusScore ?? 0),
        winner: (m1.consensusScore ?? 0) > (m2?.consensusScore ?? 0) ? city1Name : city2Name
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const topWinners = metricDiffs.slice(0, 5);

    // Calculate agreement level
    const agreementLevels = cat1.metrics.map(m => m.confidenceLevel);
    const highAgreement = agreementLevels.filter(l => l === 'unanimous' || l === 'strong').length;
    const agreementPct = Math.round((highAgreement / agreementLevels.length) * 100);

    const pageBase = 13 + (catIndex * 5);

    output += `
---

### PAGE ${pageBase}: ${config.icon} ${config.name.toUpperCase()}

image-layout="right"
prompt="${config.name.toLowerCase()} themed cityscape, ${catWinner} highlighted, professional infographic style"

# ${config.icon} ${config.name}

<labels>
<label variant="solid" color="${catWinner === city1Name ? '#FFD700' : '#1E90FF'}">🏆 Category Winner: ${catWinner}</label>
<label variant="outline">${config.metricCount} Metrics | ${config.weight} Weight</label>
</labels>

| City | Overall | Legal (📜) | Lived (🏙️) |
|------|---------|------------|------------|
| **${city1Name}** | **${score1}/100** | ${city1Legal} | ${city1Lived} |
| **${city2Name}** | **${score2}/100** | ${city2Legal} | ${city2Lived} |

**Hero Statement:**
${freedomEd?.heroStatement || `${catWinner} demonstrates stronger ${config.name.toLowerCase()} protections, with a ${Math.abs(score1 - score2)}-point advantage in this category.`}

---

### PAGE ${pageBase + 1}: ALL ${config.name.toUpperCase()} METRICS

<table colwidths="[5,30,12,12,12,12,10,7]" data-font-size="sm">

| # | Metric | ${city1Name} (L) | ${city1Name} (E) | ${city2Name} (L) | ${city2Name} (E) | Winner | Conf |
|---|--------|-----------------|-----------------|-----------------|-----------------|--------|------|
${cat1.metrics.map((m1, i) => {
  const m2 = cat2.metrics.find(m => m.metricId === m1.metricId);
  const name = getMetricDisplayName(m1.metricId);
  const l1 = Math.round(m1.legalScore ?? m1.consensusScore ?? 0);
  const e1 = Math.round(m1.enforcementScore ?? m1.consensusScore ?? 0);
  const l2 = Math.round(m2?.legalScore ?? m2?.consensusScore ?? 0);
  const e2 = Math.round(m2?.enforcementScore ?? m2?.consensusScore ?? 0);
  const s1 = m1.consensusScore ?? 0;
  const s2 = m2?.consensusScore ?? 0;
  const mWinner = s1 > s2 ? city1Name.slice(0, 8) : s2 > s1 ? city2Name.slice(0, 8) : 'TIE';
  const conf = m1.confidenceLevel?.slice(0, 4).toUpperCase() || 'MOD';
  return `| ${i + 1} | ${name} | ${l1} | ${e1} | ${l2} | ${e2} | ${mWinner} | ${conf} |`;
}).join('\n')}

</table>

**Legend:** L = Legal Score | E = Enforcement Score | Conf = Confidence (UNAN/STRO/MOD/SPLT)

---

### PAGE ${pageBase + 2}: TOP WINNING METRICS

<smart-layout variant="outlineBoxes">
${topWinners.slice(0, 4).map(m => {
  const name = getMetricDisplayName(m.metricId);
  const freedomExample = freedomEd?.winningMetrics.find(wm => wm.metricId === m.metricId);
  return `<item label="${name}">
**${m.winner}** wins by ${Math.abs(Math.round(m.diff))} points
Score: ${Math.round(m.score1)} vs ${Math.round(m.score2)}
${freedomExample?.realWorldExample || `This metric significantly impacts daily life in ${config.name.toLowerCase()}.`}
</item>`;
}).join('\n')}
</smart-layout>

---

### PAGE ${pageBase + 3}: CATEGORY ANALYSIS

| ${city1Name} | ${city2Name} |
|-------------|-------------|
| **Strengths:** | **Strengths:** |
| ${judgeAnalysis?.city1Analysis?.split('.').slice(0, 2).join('.') || `Strong performance across ${config.name.toLowerCase()} metrics with above-average scores.`} | ${judgeAnalysis?.city2Analysis?.split('.').slice(0, 2).join('.') || `Competitive scores with room for improvement in key areas.`} |
| **Weaknesses:** | **Weaknesses:** |
| ${metricDiffs.filter(m => m.winner === city2Name).slice(0, 2).map(m => getMetricDisplayName(m.metricId)).join(', ') || 'Limited weaknesses in this category'} | ${metricDiffs.filter(m => m.winner === city1Name).slice(0, 2).map(m => getMetricDisplayName(m.metricId)).join(', ') || 'Limited weaknesses in this category'} |

**Trend Notes:**
${judgeAnalysis?.trendNotes || `Both cities show stable trajectories in ${config.name.toLowerCase()}. Monitor legislative changes for potential shifts.`}

---

### PAGE ${pageBase + 4}: LLM AGREEMENT HEAT MAP

**Overall Agreement: ${agreementPct}% - ${agreementPct >= 85 ? 'High Consensus' : agreementPct >= 70 ? 'Moderate Consensus' : 'Mixed Opinions'}**

<smart-layout variant="circleStats">
${cat1.metrics.slice(0, 12).map(m => {
  const name = getMetricDisplayName(m.metricId).slice(0, 20);
  const conf = m.confidenceLevel || 'moderate';
  const color = getConfidenceColor(conf);
  // Convert confidence level to numeric percentage for heat map
  const confValue = conf === 'unanimous' ? 95 : conf === 'strong' ? 85 : conf === 'moderate' ? 70 : 50;
  return `<item label="${name}" value="${confValue}" color="${color}">${confValue}%</item>`;
}).join('\n')}
</smart-layout>

**Interpretation:**
- 🟢 Dark Green = High Agreement (>85% of LLMs aligned)
- 🟡 Yellow = Moderate Agreement (70-85%)
- 🟠 Orange = Mixed Opinions (<70%)

**Models with divergent views:** ${result.disagreementSummary?.split('.')[0] || 'Generally aligned across all 5 LLMs'}

`;
  });

  return output;
}

// ============================================================================
// SECTION 4: DEEPER INSIGHTS (Pages 43-47)
// ============================================================================
function formatSection4DeeperInsights(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const winner = result.winner === 'city1' ? city1Name : city2Name;

  // Collect all metrics with scores
  const allMetrics: Array<{
    metricId: string;
    catId: string;
    score1: number;
    score2: number;
    diff: number;
    winner: string;
  }> = [];

  result.city1.categories.forEach((cat1, catIdx) => {
    const cat2 = result.city2.categories[catIdx];
    cat1.metrics.forEach((m1, mIdx) => {
      const m2 = cat2?.metrics[mIdx];
      allMetrics.push({
        metricId: m1.metricId,
        catId: cat1.categoryId,
        score1: m1.consensusScore ?? 0,
        score2: m2?.consensusScore ?? 0,
        diff: (m1.consensusScore ?? 0) - (m2?.consensusScore ?? 0),
        winner: (m1.consensusScore ?? 0) > (m2?.consensusScore ?? 0) ? city1Name : city2Name
      });
    });
  });

  // Sort by impact (absolute difference)
  const topImpact = allMetrics.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);

  // Count wins by city
  const city1Wins = allMetrics.filter(m => m.winner === city1Name).length;
  const city2Wins = allMetrics.filter(m => m.winner === city2Name).length;

  return `
## SECTION 4: DEEPER INSIGHTS

---

### PAGE 43: 100 METRICS AT A GLANCE

<smart-layout variant="circleStats">
${Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([catId, config]) => {
  const catMetrics = allMetrics.filter(m => m.catId === catId || m.catId === catId.replace('_', '-'));
  const catCity1Wins = catMetrics.filter(m => m.winner === city1Name).length;
  const catCity2Wins = catMetrics.filter(m => m.winner === city2Name).length;
  const totalCatMetrics = catMetrics.length || 1;
  const winPct = Math.round((Math.max(catCity1Wins, catCity2Wins) / totalCatMetrics) * 100);
  return `<item label="${config.icon} ${config.name}" value="${winPct}" color="${catCity1Wins > catCity2Wins ? '#FFD700' : '#1E90FF'}">${catCity1Wins > catCity2Wins ? city1Name : city2Name}: ${winPct}%</item>`;
}).join('\n')}
</smart-layout>

**Summary:**
- 🥇 ${city1Name}: **${city1Wins}** metric wins
- 🥈 ${city2Name}: **${city2Wins}** metric wins
- ➖ Ties: **${allMetrics.length - city1Wins - city2Wins}**

---

### PAGE 44: TOP 10 MOST IMPACTFUL METRICS

<smart-layout variant="outlineBoxesWithLabel" numbered="true">
${topImpact.map((m, i) => {
  const name = getMetricDisplayName(m.metricId);
  const config = CATEGORY_CONFIG[m.catId] || CATEGORY_CONFIG[m.catId.replace('-', '_')] || { icon: '📊', weight: '?' };
  return `<item label="${i + 1}. ${name}">
**Winner: ${m.winner}** | Gap: ${Math.abs(Math.round(m.diff))} points
${city1Name}: ${Math.round(m.score1)} | ${city2Name}: ${Math.round(m.score2)}
Category: ${config.icon} (${config.weight} weight)
</item>`;
}).join('\n')}
</smart-layout>

**Insight:** These 10 metrics account for approximately ${Math.round((topImpact.reduce((s, m) => s + Math.abs(m.diff), 0) / result.scoreDifference) * 100)}% of ${winner}'s victory margin.

---

### PAGE 45: A DAY IN THE LIFE

**Same Person, Two Different Freedom Experiences:**

| Time | In ${city1Name} | In ${city2Name} |
|------|----------------|----------------|
| 6:00 AM | Wake up in ${result.city1.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore ?? 0 > 70 ? 'a flexible housing situation' : 'strictly regulated housing'} | Wake up in ${result.city2.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore ?? 0 > 70 ? 'a flexible housing situation' : 'strictly regulated housing'} |
| 8:00 AM | Commute via ${result.city1.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore ?? 0 > 70 ? 'excellent transit options' : 'limited transit'} | Commute via ${result.city2.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore ?? 0 > 70 ? 'excellent transit options' : 'limited transit'} |
| 9:00 AM | Start business with ${result.city1.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore ?? 0 > 70 ? 'minimal red tape' : 'significant licensing requirements'} | Start business with ${result.city2.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore ?? 0 > 70 ? 'minimal red tape' : 'significant licensing requirements'} |
| 6:00 PM | Enjoy evening with ${result.city1.categories.find(c => c.categoryId === 'personal_freedom')?.averageConsensusScore ?? 0 > 70 ? 'broad personal freedoms' : 'various lifestyle restrictions'} | Enjoy evening with ${result.city2.categories.find(c => c.categoryId === 'personal_freedom')?.averageConsensusScore ?? 0 > 70 ? 'broad personal freedoms' : 'various lifestyle restrictions'} |

<aside variant="note">
Same entrepreneur, different daily realities. Freedom affects every hour of your day.
</aside>

---

### PAGE 46: NEIGHBORHOOD-LEVEL VARIATIONS

<smart-layout variant="solidBoxes">
<item label="⚠️ Important Note">
LIFE SCORE measures city/region-level laws and enforcement. Within each city, neighborhoods may vary significantly in how regulations are applied.
</item>
</smart-layout>

**${city1Name} Neighborhood Considerations:**
- Downtown/Business districts may have stricter enforcement
- Suburban areas may offer more flexibility
- Research specific neighborhoods before relocating

**${city2Name} Neighborhood Considerations:**
- Urban cores vs residential areas differ in enforcement
- Tourist areas may have special regulations
- Local knowledge is essential for accurate expectations

**Recommendation:** Visit prospective neighborhoods and speak with locals before making final decisions.

---

### PAGE 47: COST OF FREEDOM ANALYSIS

**Freedom Has a Price Tag:**

| Category | ${city1Name} Impact | ${city2Name} Impact |
|----------|---------------------|---------------------|
| **Taxes** (Income, Sales, Property) | ${result.city1.categories.find(c => c.categoryId === 'business_work')?.metrics.find(m => m.metricId.includes('tax'))?.consensusScore ?? 0 > 60 ? 'Lower burden' : 'Higher burden'} | ${result.city2.categories.find(c => c.categoryId === 'business_work')?.metrics.find(m => m.metricId.includes('tax'))?.consensusScore ?? 0 > 60 ? 'Lower burden' : 'Higher burden'} |
| **Business Costs** (Licenses, Compliance) | ${result.city1.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore ?? 0 > 65 ? 'Lower costs' : 'Higher costs'} | ${result.city2.categories.find(c => c.categoryId === 'business_work')?.averageConsensusScore ?? 0 > 65 ? 'Lower costs' : 'Higher costs'} |
| **Housing Flexibility** | ${result.city1.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore ?? 0 > 65 ? 'More options' : 'Limited options'} | ${result.city2.categories.find(c => c.categoryId === 'housing_property')?.averageConsensusScore ?? 0 > 65 ? 'More options' : 'Limited options'} |
| **Transportation** | ${result.city1.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore ?? 0 > 65 ? 'Efficient & affordable' : 'Car-dependent'} | ${result.city2.categories.find(c => c.categoryId === 'transportation')?.averageConsensusScore ?? 0 > 65 ? 'Efficient & affordable' : 'Car-dependent'} |
| **Fines & Penalties Risk** | ${result.city1.categories.find(c => c.categoryId === 'policing_legal')?.averageConsensusScore ?? 0 > 65 ? 'Lower risk' : 'Higher risk'} | ${result.city2.categories.find(c => c.categoryId === 'policing_legal')?.averageConsensusScore ?? 0 > 65 ? 'Lower risk' : 'Higher risk'} |

**"Cost of Living" vs "Cost of Freedom"** - Traditional indexes miss the hidden costs of regulation, compliance, and restricted opportunity.

`;
}

// ============================================================================
// SECTION 5: LLM CONSENSUS (Pages 48-52)
// ============================================================================
function formatSection5LLMConsensus(
  result: EnhancedComparisonResult
): string {
  const confidence = result.overallConsensusConfidence;

  // Calculate overall agreement
  let totalMetrics = 0;
  let highAgreementMetrics = 0;
  result.city1.categories.forEach(cat => {
    cat.metrics.forEach(m => {
      totalMetrics++;
      if (m.confidenceLevel === 'unanimous' || m.confidenceLevel === 'strong') {
        highAgreementMetrics++;
      }
    });
  });
  const agreementPct = Math.round((highAgreementMetrics / totalMetrics) * 100);

  // Category agreement
  const categoryAgreement = result.city1.categories.map(cat => {
    const high = cat.metrics.filter(m => m.confidenceLevel === 'unanimous' || m.confidenceLevel === 'strong').length;
    return {
      name: CATEGORY_CONFIG[cat.categoryId]?.name || cat.categoryId,
      agreement: Math.round((high / cat.metrics.length) * 100)
    };
  });

  // Find disagreement points
  const disagreements = result.city1.categories.flatMap(cat =>
    cat.metrics.filter(m => m.confidenceLevel === 'split' || m.confidenceLevel === 'moderate')
      .map(m => ({
        metric: getMetricDisplayName(m.metricId),
        confidence: m.confidenceLevel,
        stdDev: m.standardDeviation ?? 0
      }))
  ).sort((a, b) => b.stdDev - a.stdDev).slice(0, 7);

  return `
## SECTION 5: LLM CONSENSUS

---

### PAGE 48: AI MODELS USED

<smart-layout variant="imagesText" imagePosition="left">
<item label="📝 Claude Sonnet 4.5" subtitle="Anthropic">
**Role:** Primary Evaluator with web search
**Strength:** Comprehensive legal framework analysis
</item>
<item label="🤖 GPT-4o" subtitle="OpenAI">
**Role:** Cross-validation with Tavily search
**Strength:** Independent verification and fact-checking
</item>
<item label="💎 Gemini 3 Pro" subtitle="Google">
**Role:** Real-time data validation
**Strength:** Native Google Search grounding
</item>
<item label="𝕏 Grok 4" subtitle="xAI">
**Role:** Social sentiment analysis
**Strength:** Real-time X/Twitter data integration
</item>
<item label="🔮 Sonar Reasoning Pro" subtitle="Perplexity">
**Role:** Deep web research
**Strength:** Citation quality and source credibility
</item>
</smart-layout>

**Final Judge:**
<labels><label variant="solid" color="#7C3AED">🎭 Claude Opus 4.5 (Anthropic)</label></labels>

Synthesizes all 5 evaluations into final scores and recommendation.

---

### PAGE 49: OVERALL CONSENSUS CONFIDENCE

<display size="lg" color="${getConfidenceColor(confidence)}">${agreementPct}%</display>

**Interpretation: ${confidence?.toUpperCase()} CONFIDENCE**

<smart-layout variant="circleStats">
<item label="Data Points" value="1,200+">Dual scores across 100 metrics × 2 cities × 6 models</item>
<item label="Sources Cited" value="500+">Unique references gathered by AI models</item>
<item label="Agreement Rate" value="${agreementPct}%">Metrics with strong LLM consensus</item>
</smart-layout>

${confidence === 'high' ? 'All 5 LLMs showed strong alignment on the vast majority of metrics, indicating reliable conclusions.' :
  confidence === 'medium' ? 'Most metrics showed good agreement, with some expected divergence on subjective measures.' :
  'Some metrics showed significant disagreement between models, suggesting data limitations or genuinely contested assessments.'}

---

### PAGE 50: AGREEMENT BY CATEGORY

<smart-layout variant="barStats">
${categoryAgreement.map(ca => `<item label="${ca.name}" value="${ca.agreement}" max="100" color="${getConfidenceColor(ca.agreement >= 85 ? 'high' : ca.agreement >= 70 ? 'medium' : 'low')}">
${ca.agreement}% agreement
</item>`).join('\n')}
</smart-layout>

| Category | Agreement | Interpretation |
|----------|-----------|----------------|
${categoryAgreement.map(ca => `| ${ca.name} | ${ca.agreement}% | ${ca.agreement >= 85 ? 'High Consensus' : ca.agreement >= 70 ? 'Moderate' : 'Mixed'} |`).join('\n')}

**Highest Consensus:** ${categoryAgreement.sort((a, b) => b.agreement - a.agreement)[0]?.name || 'N/A'}
**Lowest Consensus:** ${categoryAgreement.sort((a, b) => a.agreement - b.agreement)[0]?.name || 'N/A'}

---

### PAGE 51: TOP DISAGREEMENT POINTS

<smart-layout variant="outlineBoxesWithTopCircle" numbered="true">
${disagreements.map((d, i) => `<item label="${i + 1}. ${d.metric}">
**Confidence:** ${d.confidence}
**Std Deviation:** ${d.stdDev.toFixed(1)}
Different models weighed available evidence differently, leading to score variance.
</item>`).join('\n')}
</smart-layout>

**Why Disagreements Occur:**
- Different search results across AI providers
- Varying interpretation of enforcement data
- Recent legislative changes not uniformly indexed
- Subjective metrics (e.g., "cultural tolerance") naturally diverge

**Impact on Confidence:** ${disagreements.length > 5 ? 'Multiple disagreements suggest reviewing specific metrics carefully before decisions.' : 'Limited disagreements indicate robust overall conclusions.'}

---

### PAGE 52: HOW WE GENERATE REPORTS

<smart-layout variant="processSteps" numbered="true">
<item label="1. User Input">
Two cities entered for comparison
</item>
<item label="2. Parallel AI Research">
5 LLMs simultaneously research 100 metrics:
• Claude Sonnet 4.5 • GPT-4o • Gemini 3 Pro • Grok 4 • Sonar Reasoning Pro
</item>
<item label="3. Dual Scoring">
Each LLM provides Legal + Enforcement scores per metric
= 1,200+ individual data points
</item>
<item label="4. Consensus Calculation">
Statistical analysis to identify agreement, outliers, confidence
</item>
<item label="5. Final Judgment">
Claude Opus 4.5 synthesizes all data into verdicts and recommendations
</item>
<item label="6. Report Generation">
Gamma AI transforms data into this visual presentation
</item>
</smart-layout>

**Processing Stats:**
- ⏱️ Total Time: ${Math.round(result.processingStats.totalTimeMs / 60000)} minutes
- 📊 Metrics Evaluated: ${result.processingStats.metricsEvaluated}
- 🔗 Sources: 500+ citations

<aside variant="note">
Multi-AI consensus eliminates single-model bias and provides more reliable freedom assessments.
</aside>

`;
}

// ============================================================================
// SECTION 6: GUN RIGHTS (Pages 53-56) - OPTIONAL, UNSCORED
// ============================================================================
function formatSection6GunRights(
  _result: EnhancedComparisonResult,
  gunData?: GunComparisonData
): string {
  if (!gunData) {
    return `
## SECTION 6: GUN RIGHTS COMPARISON

---

### PAGE 53: GUN RIGHTS DATA NOT INCLUDED

<labels><label variant="solid" color="#F97316">⚠️ GUN RIGHTS SECTION SKIPPED</label></labels>

The gun rights comparison was not included in this report.

To include gun rights data:
1. Run a Gun Comparison from the results page
2. Check "Include Gun Rights" when generating the Enhanced Report

**Why Gun Rights Are Separated:**
Gun rights are intentionally excluded from the 100-metric scoring system due to the deeply polarizing nature of this topic. We provide factual comparisons without declaring a "winner."

`;
  }

  return `
## SECTION 6: GUN RIGHTS COMPARISON

---

### PAGE 53: GUN RIGHTS DISCLAIMER

<labels><label variant="solid" color="#F97316">⚠️ UNSCORED - FACTS ONLY</label></labels>

# Why Gun Rights Are Separated

We have separated gun rights into a standalone comparison because of the enormous polarizing opinions on whether guns mean more freedom or less freedom.

<blockquote>
To someone in a constitutional carry state, unrestricted firearm access IS freedom — the foundation of personal safety and self-determination. To someone from a country with strict gun control, being surrounded by armed civilians is NOT freedom — it's danger.
</blockquote>

**We do NOT assign a winner for gun rights.**

This section presents factual gun law data only. You decide what it means for YOUR definition of freedom.

<aside variant="note">
Gun rights are NOT included in the LIFE SCORE calculation. This is purely informational.
</aside>

---

### PAGE 54: GUN LAW COMPARISON (Part 1)

<table colwidths="[30,35,35]">

| Category | ${gunData.cityA} | ${gunData.cityB} |
|----------|-----------------|-----------------|
${gunData.categories.slice(0, 6).map(cat => `| **${cat.label}** | ${cat.cityA} | ${cat.cityB} |`).join('\n')}

</table>

---

### PAGE 55: GUN LAW COMPARISON (Part 2)

<table colwidths="[30,35,35]">

| Category | ${gunData.cityA} | ${gunData.cityB} |
|----------|-----------------|-----------------|
${gunData.categories.slice(6).map(cat => `| **${cat.label}** | ${cat.cityA} | ${cat.cityB} |`).join('\n')}

</table>

---

### PAGE 56: GUN LAW SUMMARY

| ${gunData.cityA} | ${gunData.cityB} |
|-----------------|-----------------|
| ${gunData.summary.split('.').slice(0, 3).join('. ')}. | ${gunData.summary.split('.').slice(3, 6).join('. ')}. |

**Key Differences:**
${gunData.categories.slice(0, 4).map(cat => `- **${cat.label}:** ${cat.cityA} vs ${cat.cityB}`).join('\n')}

<aside variant="warning">
${gunData.disclaimer}

This information is provided for comparison purposes only. Laws change frequently. Verify current regulations with official sources before any decisions.
</aside>

`;
}

// ============================================================================
// SECTION 7: METHODOLOGY (Pages 57-60)
// ============================================================================
function formatSection7Methodology(
  result: EnhancedComparisonResult
): string {
  return `
## SECTION 7: METHODOLOGY

---

### PAGE 57: WHAT IS LIFE SCORE™?

# LIFE SCORE™
## Legal Independence & Freedom Evaluation

**Definition:** A comprehensive 100-metric system measuring legal and lived freedom across cities worldwide.

<smart-layout variant="solidBoxes">
<item label="📜 Concrete Laws" color="#6B46C1">
We measure actual statutes, regulations, and official policies — not vague "freedom indexes"
</item>
<item label="🏙️ Real Enforcement" color="#14B8A6">
We capture how laws are actually applied in daily life, not just what's written
</item>
<item label="🤖 Multi-AI Consensus" color="#10A37F">
5 independent AI models research each metric, reducing single-source bias
</item>
<item label="🎭 Expert Judgment" color="#7C3AED">
Claude Opus 4.5 synthesizes all data into actionable recommendations
</item>
</smart-layout>

**Unlike Traditional Indexes:**
- We don't rely on surveys or self-reported data
- We measure 100 specific, actionable metrics
- We capture the gap between law and reality
- We use multi-AI verification for reliability

---

### PAGE 58: THE 6 CATEGORIES

| Category | Metrics | Weight | What It Measures |
|----------|---------|--------|------------------|
| 🗽 Personal Autonomy | 15 | 20% | Vice laws, bodily autonomy, lifestyle choices |
| 🏠 Housing & Property | 20 | 20% | Property rights, HOA rules, housing flexibility |
| 💼 Business & Work | 25 | 20% | Licensing, employment laws, economic freedom |
| 🚇 Transportation | 15 | 15% | Mobility freedom, transit options, car dependency |
| ⚖️ Policing & Courts | 15 | 15% | Legal system fairness, police accountability |
| 🎭 Speech & Lifestyle | 10 | 10% | Expression, privacy, cultural tolerance |

**Total: 100 Metrics = 100% Coverage**

<diagram type="rings">
Personal Autonomy: 20%
Housing & Property: 20%
Business & Work: 20%
Transportation: 15%
Policing & Courts: 15%
Speech & Lifestyle: 10%
</diagram>

---

### PAGE 59: PERSONALIZATION PRESETS

<smart-layout variant="solidBoxes">
<item label="⚖️ Balanced">
Default weights as shown. Best for general comparison.
</item>
<item label="💻 Digital Nomad">
Emphasizes Business (30%), Speech (20%), Transportation (20%)
</item>
<item label="🚀 Entrepreneur">
Emphasizes Business (40%), Housing (25%), Personal (15%)
</item>
<item label="👨‍👩‍👧‍👦 Family">
Emphasizes Housing (30%), Policing (25%), Transportation (20%)
</item>
<item label="🗽 Libertarian">
Emphasizes Personal (35%), Business (30%), Speech (20%)
</item>
<item label="💰 Investor">
Emphasizes Business (35%), Housing (30%), Policing (20%)
</item>
</smart-layout>

**Note:** Different presets may change which city wins! The winner in this report uses default balanced weights.

---

### PAGE 60: EVIDENCE QUALITY BY CATEGORY

<smart-layout variant="circleStatsWithBoldLine">
${Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([catId, config]) => {
  const cat = result.city1.categories.find(c => c.categoryId === catId);
  const agreement = cat?.agreementLevel ?? 75;
  return `<item label="${config.icon} ${config.name}" value="${agreement}%" color="${getConfidenceColor(agreement >= 85 ? 'high' : agreement >= 70 ? 'medium' : 'low')}">
Evidence: Government sources, legal databases, enforcement reports
</item>`;
}).join('\n')}
</smart-layout>

**Overall Report Confidence: ${result.overallConsensusConfidence?.toUpperCase()}**

**What Confidence Means:**
- **High:** Strong agreement across AI models, abundant evidence
- **Medium:** Good agreement with some data gaps
- **Low:** Significant divergence, recommend additional research

`;
}

// ============================================================================
// SECTION 8: EVIDENCE & CLOSING (Pages 61-64)
// ============================================================================
function formatSection8EvidenceClosing(
  result: EnhancedComparisonResult
): string {
  // Collect sample evidence citations
  const sampleEvidence: string[] = [];
  result.city1.categories.slice(0, 3).forEach(cat => {
    cat.metrics.slice(0, 3).forEach(m => {
      if (m.llmScores) {
        m.llmScores.forEach(score => {
          if (score.evidence) {
            score.evidence.slice(0, 1).forEach(e => {
              sampleEvidence.push(`[${e.city}] "${e.title}" - ${e.snippet?.slice(0, 100)}... (${e.url})`);
            });
          } else if (score.sources) {
            score.sources.slice(0, 1).forEach(s => {
              sampleEvidence.push(`[Source] ${s}`);
            });
          }
        });
      }
    });
  });

  return `
## SECTION 8: EVIDENCE & CLOSING

---

### PAGE 61: TOP EVIDENCE CITATIONS

<smart-layout variant="outlineBoxesWithSideLine">
${sampleEvidence.slice(0, 10).map((e, i) => `<item label="Citation ${i + 1}">
${e}
</item>`).join('\n') || `<item label="Evidence Summary">
500+ sources gathered from government websites, legal databases, news sources, and enforcement records across both cities.
</item>`}
</smart-layout>

**Sources Include:**
- Government legislation databases
- Municipal code repositories
- Legal news and analysis
- Enforcement statistics
- Court records and decisions

---

### PAGE 62: DATA LIMITATIONS

<smart-layout variant="outlineBoxes">
<item label="⏱️ Temporal">
Laws change. This report reflects data as of ${new Date(result.generatedAt).toLocaleDateString()}. Verify current status before decisions.
</item>
<item label="🌍 Geographic">
City-level analysis. Neighborhoods, suburbs, and rural areas may differ significantly.
</item>
<item label="📊 Data Quality">
Some metrics rely on enforcement patterns that are difficult to quantify precisely.
</item>
<item label="🤖 AI Limitations">
AI models may have knowledge cutoffs or incomplete indexing of recent changes.
</item>
<item label="⚖️ Legal">
This is not legal advice. Consult qualified attorneys for specific situations.
</item>
<item label="👤 Personalization">
Your experience may vary based on nationality, profession, and personal circumstances.
</item>
<item label="🔮 Predictive">
Trend forecasts are estimates, not guarantees. Political changes can shift trajectories.
</item>
</smart-layout>

<aside variant="note">
LIFE SCORE provides data-driven insights to inform decisions, not replace professional advice or personal research.
</aside>

---

### PAGE 63: ABOUT CLUES INTELLIGENCE LTD

| Our Mission | Our Approach |
|-------------|--------------|
| Making freedom measurable, one city at a time. We help individuals make data-driven decisions about international relocation based on verified legal data. | **Evidence-Based:** 100 concrete, measurable metrics |
| | **Multi-AI:** 5 independent models reduce bias |
| | **Transparent:** Full methodology disclosure |
| | **Updated:** Continuous data refresh |
| | **Privacy-First:** Your data stays yours |

<smart-layout variant="iconsText">
<item icon="🌍" label="Relocators">Planning international moves</item>
<item icon="💼" label="Entrepreneurs">Seeking business-friendly environments</item>
<item icon="💻" label="Remote Workers">Digital nomads choosing bases</item>
<item icon="👨‍👩‍👧" label="Families">Finding freedom-respecting communities</item>
<item icon="🏛️" label="Researchers">Studying global freedom patterns</item>
</smart-layout>

**Contact:**
- 🌐 Website: clueslifescore.com
- 📧 Email: info@clueslifescore.com
- 🐦 Twitter: @CluesLifeScore
- 💼 LinkedIn: Clues Intelligence LTD

---

### PAGE 64: LEGAL NOTICES & COPYRIGHT

**Copyright © 2025-2026 Clues Intelligence LTD. All Rights Reserved.**

**LIFE SCORE™** is a trademark of Clues Intelligence LTD.

<smart-layout variant="iconsText">
<item icon="✅" label="Permitted">Personal use, academic citation, fair use excerpts</item>
<item icon="✅" label="Permitted">Sharing report links, social media discussion</item>
<item icon="❌" label="Prohibited">Commercial redistribution without license</item>
<item icon="❌" label="Prohibited">Modification of data or methodology claims</item>
<item icon="❌" label="Prohibited">Removal of branding or attribution</item>
</smart-layout>

**Disclaimer of Warranties:**
This report is provided "as is" without warranties of any kind. Clues Intelligence LTD does not guarantee accuracy, completeness, or fitness for any particular purpose.

**Limitation of Liability:**
In no event shall Clues Intelligence LTD be liable for any damages arising from the use of this report.

**Governing Law:**
This report is governed by the laws of England and Wales.

**For Licensing Inquiries:**
Contact legal@clueslifescore.com

---

*"Making freedom measurable, one city at a time."*

**LIFE SCORE™ by Clues Intelligence LTD**

`;
}

// ============================================================================
// SECTION 8 FIXED: EVIDENCE FROM BOTH CITIES
// ============================================================================
function formatSection8EvidenceClosingBothCities(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;

  // Collect evidence from BOTH cities - alternating to ensure balance
  const city1Evidence: string[] = [];
  const city2Evidence: string[] = [];

  // Get evidence from city1
  result.city1.categories.forEach(cat => {
    cat.metrics.forEach(m => {
      if (m.llmScores) {
        m.llmScores.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            score.evidence.forEach(e => {
              if (city1Evidence.length < 15) {
                city1Evidence.push(`"${e.title}" - ${e.snippet?.slice(0, 80) || 'Source cited'}... (${e.url?.slice(0, 50)}...)`);
              }
            });
          }
        });
      }
    });
  });

  // Get evidence from city2
  result.city2.categories.forEach(cat => {
    cat.metrics.forEach(m => {
      if (m.llmScores) {
        m.llmScores.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            score.evidence.forEach(e => {
              if (city2Evidence.length < 15) {
                city2Evidence.push(`"${e.title}" - ${e.snippet?.slice(0, 80) || 'Source cited'}... (${e.url?.slice(0, 50)}...)`);
              }
            });
          }
        });
      }
    });
  });

  return `
## SECTION: EVIDENCE & CLOSING

---

### PAGE: ${city1Name.toUpperCase()} - KEY CITATIONS

image-layout="right"
prompt="research documents, legal books, government documents, ${city1Name} official papers"

# 📚 Evidence Sources: ${city1Name}

<smart-layout variant="outlineBoxesWithSideLine">
${city1Evidence.slice(0, 8).map((e, i) => `<item label="Source ${i + 1}">
${e}
</item>`).join('\n') || `<item label="Evidence Summary">
Sources gathered from ${city1Name} government websites, legal databases, and official records.
</item>`}
</smart-layout>

**Source Categories:**
- Government legislation and municipal codes
- Official enforcement statistics
- Legal news and court records
- Local regulatory agencies

---

### PAGE: ${city2Name.toUpperCase()} - KEY CITATIONS

image-layout="right"
prompt="research documents, legal books, government documents, ${city2Name} official papers"

# 📚 Evidence Sources: ${city2Name}

<smart-layout variant="outlineBoxesWithSideLine">
${city2Evidence.slice(0, 8).map((e, i) => `<item label="Source ${i + 1}">
${e}
</item>`).join('\n') || `<item label="Evidence Summary">
Sources gathered from ${city2Name} government websites, legal databases, and official records.
</item>`}
</smart-layout>

**Source Categories:**
- Government legislation and municipal codes
- Official enforcement statistics
- Legal news and court records
- Local regulatory agencies

---

### PAGE: DATA QUALITY & LIMITATIONS

<smart-layout variant="outlineBoxes">
<item label="⏱️ Temporal">
Laws change. This report reflects data as of ${new Date(result.generatedAt).toLocaleDateString()}. Verify current status before decisions.
</item>
<item label="🌍 Geographic">
City-level analysis. Neighborhoods, suburbs, and rural areas may differ significantly.
</item>
<item label="📊 Data Quality">
Some metrics rely on enforcement patterns that are difficult to quantify precisely.
</item>
<item label="🤖 AI Limitations">
AI models may have knowledge cutoffs or incomplete indexing of recent changes.
</item>
<item label="⚖️ Legal">
This is not legal advice. Consult qualified attorneys for specific situations.
</item>
<item label="👤 Personalization">
Your experience may vary based on nationality, profession, and personal circumstances.
</item>
</smart-layout>

---

### PAGE: ABOUT CLUES INTELLIGENCE LTD

image-layout="right"
prompt="modern tech company office, data analytics, professional team, global freedom research"

# About LIFE SCORE™

| Our Mission | Our Approach |
|-------------|--------------|
| Making freedom measurable, one city at a time. We help individuals make data-driven decisions about international relocation based on verified legal data. | **Evidence-Based:** 100 concrete, measurable metrics |
| | **Multi-AI:** 5 independent models reduce bias |
| | **Transparent:** Full methodology disclosure |
| | **Updated:** Continuous data refresh |
| | **Privacy-First:** Your data stays yours |

<smart-layout variant="imagesText" imagePosition="left">
<item label="🌍 Relocators" subtitle="International Moves">Planning your freedom journey</item>
<item label="💼 Entrepreneurs" subtitle="Business Freedom">Seeking low-regulation environments</item>
<item label="💻 Digital Nomads" subtitle="Remote Work">Choosing your base of operations</item>
<item label="👨‍👩‍👧 Families" subtitle="Quality of Life">Finding freedom-respecting communities</item>
</smart-layout>

**Contact:**
- 🌐 Website: clueslifescore.com
- 📧 Email: info@clueslifescore.com
- 🐦 Twitter: @CluesLifeScore

---

### PAGE: LEGAL NOTICES & COPYRIGHT

**Copyright © 2025-2026 Clues Intelligence LTD. All Rights Reserved.**

**LIFE SCORE™** is a trademark of Clues Intelligence LTD.

<smart-layout variant="solidBoxes">
<item label="✅ Permitted" color="#10B981">
Personal use, academic citation, fair use excerpts, sharing report links
</item>
<item label="❌ Prohibited" color="#DC2626">
Commercial redistribution, data modification, branding removal
</item>
</smart-layout>

**Disclaimer:** This report is provided "as is" without warranties. Not legal advice. Consult qualified professionals for your specific situation.

**Governing Law:** England and Wales

---

### PAGE: THANK YOU

image-layout="behind"
prompt="beautiful sunset over global cityscape, freedom and opportunity, hopeful future, cinematic"

# Thank You for Using LIFE SCORE™

<display size="lg" color="#FFD700">Your Freedom Journey Starts Here</display>

**What's Next?**

<smart-layout variant="processSteps" numbered="true">
<item label="1. Review">
Digest this report and identify your priorities
</item>
<item label="2. Research">
Visit your top choice city if possible
</item>
<item label="3. Plan">
Use our Next Steps checklists to prepare
</item>
<item label="4. Move">
Execute your relocation with confidence
</item>
</smart-layout>

<blockquote>
"The freedom you seek is waiting. This data is your compass—now chart your course."

— The LIFE SCORE Team
</blockquote>

*Making freedom measurable, one city at a time.*

**LIFE SCORE™ by Clues Intelligence LTD**

`;
}

// ============================================================================
// NEW SECTION: YOUR LIFE IN EACH CITY (Narrative Storytelling)
// ============================================================================
function formatSectionLifeInEachCity(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;

  // Get category scores for narrative building
  const getScore = (city: 'city1' | 'city2', catId: string): number => {
    const cityData = city === 'city1' ? result.city1 : result.city2;
    return Math.round(cityData.categories.find(c => c.categoryId === catId)?.averageConsensusScore ?? 50);
  };

  // Generate lifestyle descriptors based on scores
  const housingDesc1 = getScore('city1', 'housing_property') > 65 ? 'flexible housing options with minimal restrictions' : 'heavily regulated housing with strict zoning';
  const housingDesc2 = getScore('city2', 'housing_property') > 65 ? 'flexible housing options with minimal restrictions' : 'heavily regulated housing with strict zoning';
  const transitDesc1 = getScore('city1', 'transportation') > 65 ? 'excellent public transit and mobility options' : 'car-dependent infrastructure';
  const transitDesc2 = getScore('city2', 'transportation') > 65 ? 'excellent public transit and mobility options' : 'car-dependent infrastructure';
  const businessDesc1 = getScore('city1', 'business_work') > 65 ? 'streamlined permits and low bureaucracy' : 'complex licensing and regulatory hurdles';
  const businessDesc2 = getScore('city2', 'business_work') > 65 ? 'streamlined permits and low bureaucracy' : 'complex licensing and regulatory hurdles';
  const personalDesc1 = getScore('city1', 'personal_freedom') > 65 ? 'broad personal freedoms and lifestyle tolerance' : 'various lifestyle restrictions and vice laws';
  const personalDesc2 = getScore('city2', 'personal_freedom') > 65 ? 'broad personal freedoms and lifestyle tolerance' : 'various lifestyle restrictions and vice laws';
  const policingDesc1 = getScore('city1', 'policing_legal') > 65 ? 'fair legal system with police accountability' : 'aggressive enforcement and legal complexities';
  const policingDesc2 = getScore('city2', 'policing_legal') > 65 ? 'fair legal system with police accountability' : 'aggressive enforcement and legal complexities';

  return `
## SECTION: YOUR LIFE IN EACH CITY

---

### PAGE: A WEEK IN ${city1Name.toUpperCase()}

image-layout="behind"
prompt="beautiful morning cityscape of ${city1Name} ${city1Country}, lifestyle photography, warm golden hour light, people enjoying city life"

# 🌅 A Week Living in ${city1Name}

<labels>
<label variant="solid" color="${result.winner === 'city1' ? '#FFD700' : '#1E90FF'}">${city1Country}</label>
<label variant="outline">LIFE SCORE: ${Math.round(result.city1.totalConsensusScore)}/100</label>
</labels>

**Experience the daily reality of freedom in ${city1Name}:**

<smart-layout variant="processSteps" numbered="true">
<item label="🌅 MONDAY MORNING">
Wake up in your ${housingDesc1}. ${getScore('city1', 'housing_property') > 70 ? 'Airbnb and short-term rentals are readily available.' : 'Finding flexible housing may require navigating strict regulations.'}
</item>
<item label="🚇 COMMUTE">
Head to work via ${transitDesc1}. ${getScore('city1', 'transportation') > 70 ? 'Multiple transit options keep you mobile without a car.' : 'Plan for car ownership and associated costs.'}
</item>
<item label="💼 WORK DAY">
Run your business with ${businessDesc1}. ${getScore('city1', 'business_work') > 70 ? 'Starting a company is straightforward with minimal red tape.' : 'Expect licensing requirements and compliance costs.'}
</item>
<item label="🌆 EVENING">
Enjoy ${personalDesc1}. ${getScore('city1', 'personal_freedom') > 70 ? 'Nightlife, dining, and personal choices face few restrictions.' : 'Some activities may be restricted or regulated.'}
</item>
<item label="⚖️ PEACE OF MIND">
Live under ${policingDesc1}. ${getScore('city1', 'policing_legal') > 70 ? 'Interactions with authorities are generally straightforward.' : 'Be aware of enforcement patterns and legal considerations.'}
</item>
</smart-layout>

---

### PAGE: A WEEK IN ${city2Name.toUpperCase()}

image-layout="behind"
prompt="beautiful morning cityscape of ${city2Name} ${city2Country}, lifestyle photography, warm golden hour light, people enjoying city life"

# 🌅 A Week Living in ${city2Name}

<labels>
<label variant="solid" color="${result.winner === 'city2' ? '#FFD700' : '#1E90FF'}">${city2Country}</label>
<label variant="outline">LIFE SCORE: ${Math.round(result.city2.totalConsensusScore)}/100</label>
</labels>

**Experience the daily reality of freedom in ${city2Name}:**

<smart-layout variant="processSteps" numbered="true">
<item label="🌅 MONDAY MORNING">
Wake up in your ${housingDesc2}. ${getScore('city2', 'housing_property') > 70 ? 'Airbnb and short-term rentals are readily available.' : 'Finding flexible housing may require navigating strict regulations.'}
</item>
<item label="🚇 COMMUTE">
Head to work via ${transitDesc2}. ${getScore('city2', 'transportation') > 70 ? 'Multiple transit options keep you mobile without a car.' : 'Plan for car ownership and associated costs.'}
</item>
<item label="💼 WORK DAY">
Run your business with ${businessDesc2}. ${getScore('city2', 'business_work') > 70 ? 'Starting a company is straightforward with minimal red tape.' : 'Expect licensing requirements and compliance costs.'}
</item>
<item label="🌆 EVENING">
Enjoy ${personalDesc2}. ${getScore('city2', 'personal_freedom') > 70 ? 'Nightlife, dining, and personal choices face few restrictions.' : 'Some activities may be restricted or regulated.'}
</item>
<item label="⚖️ PEACE OF MIND">
Live under ${policingDesc2}. ${getScore('city2', 'policing_legal') > 70 ? 'Interactions with authorities are generally straightforward.' : 'Be aware of enforcement patterns and legal considerations.'}
</item>
</smart-layout>

---

### PAGE: SIDE-BY-SIDE LIFESTYLE COMPARISON

<columns>
<column>
image-layout="left"
prompt="street scene daily life ${city1Name}, people walking, cafes, local atmosphere"
</column>
<column>
image-layout="right"
prompt="street scene daily life ${city2Name}, people walking, cafes, local atmosphere"
</column>
</columns>

# 📊 Daily Life Comparison

| Moment | ${city1Name} | ${city2Name} |
|--------|-------------|-------------|
| **🏠 Morning** | ${getScore('city1', 'housing_property') > 65 ? '✅ Flexible housing' : '⚠️ Regulated housing'} | ${getScore('city2', 'housing_property') > 65 ? '✅ Flexible housing' : '⚠️ Regulated housing'} |
| **🚇 Commute** | ${getScore('city1', 'transportation') > 65 ? '✅ Great transit' : '⚠️ Car needed'} | ${getScore('city2', 'transportation') > 65 ? '✅ Great transit' : '⚠️ Car needed'} |
| **💼 Work** | ${getScore('city1', 'business_work') > 65 ? '✅ Low bureaucracy' : '⚠️ Complex permits'} | ${getScore('city2', 'business_work') > 65 ? '✅ Low bureaucracy' : '⚠️ Complex permits'} |
| **🍷 Lunch** | ${getScore('city1', 'personal_freedom') > 70 ? '✅ Wine with lunch OK' : '⚠️ Alcohol restrictions'} | ${getScore('city2', 'personal_freedom') > 70 ? '✅ Wine with lunch OK' : '⚠️ Alcohol restrictions'} |
| **🌙 Evening** | ${getScore('city1', 'personal_freedom') > 65 ? '✅ Nightlife freedom' : '⚠️ Some restrictions'} | ${getScore('city2', 'personal_freedom') > 65 ? '✅ Nightlife freedom' : '⚠️ Some restrictions'} |
| **🛡️ Safety** | ${getScore('city1', 'policing_legal') > 65 ? '✅ Fair system' : '⚠️ Enforcement concerns'} | ${getScore('city2', 'policing_legal') > 65 ? '✅ Fair system' : '⚠️ Enforcement concerns'} |

<aside variant="note">
Same person, same day, two completely different freedom experiences. Your daily reality depends heavily on which city you call home.
</aside>

---

### PAGE: FREEDOM MOMENTS THAT MATTER

image-layout="right"
prompt="person enjoying freedom, outdoor cafe, working on laptop, ${result.winner === 'city1' ? city1Name : city2Name} atmosphere"

# 💡 The Little Things That Add Up

**Freedom isn't just big laws—it's daily moments:**

<smart-layout variant="solidBoxes">
<item label="☕ Morning Coffee" color="#8B4513">
Can you sit outside without permits? Open container rules? Street vendor access?
${city1Name}: ${getScore('city1', 'personal_freedom') > 70 ? 'Very relaxed' : 'Some restrictions'} | ${city2Name}: ${getScore('city2', 'personal_freedom') > 70 ? 'Very relaxed' : 'Some restrictions'}
</item>
<item label="🏃 Exercise" color="#228B22">
Park access, gym regulations, outdoor activity permits?
${city1Name}: ${getScore('city1', 'speech_lifestyle') > 70 ? 'Unrestricted' : 'Some rules'} | ${city2Name}: ${getScore('city2', 'speech_lifestyle') > 70 ? 'Unrestricted' : 'Some rules'}
</item>
<item label="🛒 Shopping" color="#4169E1">
Store hours, Sunday trading, market regulations?
${city1Name}: ${getScore('city1', 'business_work') > 65 ? 'Flexible hours' : 'Restricted hours'} | ${city2Name}: ${getScore('city2', 'business_work') > 65 ? 'Flexible hours' : 'Restricted hours'}
</item>
<item label="🎉 Socializing" color="#9932CC">
Noise ordinances, gathering limits, venue regulations?
${city1Name}: ${getScore('city1', 'personal_freedom') > 65 ? 'Relaxed' : 'Strict'} | ${city2Name}: ${getScore('city2', 'personal_freedom') > 65 ? 'Relaxed' : 'Strict'}
</item>
</smart-layout>

`;
}

// ============================================================================
// NEW SECTION: WHO SHOULD CHOOSE WHICH? (Persona Recommendations)
// ============================================================================
function formatSectionPersonaRecommendations(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;

  // Calculate category scores for recommendations
  const getScore = (city: 'city1' | 'city2', catId: string): number => {
    const cityData = city === 'city1' ? result.city1 : result.city2;
    return Math.round(cityData.categories.find(c => c.categoryId === catId)?.averageConsensusScore ?? 50);
  };

  // Determine best city for each persona
  const entrepreneurBest = getScore('city1', 'business_work') > getScore('city2', 'business_work') ? city1Name : city2Name;
  const nomadBest = (getScore('city1', 'business_work') + getScore('city1', 'personal_freedom')) > (getScore('city2', 'business_work') + getScore('city2', 'personal_freedom')) ? city1Name : city2Name;
  const familyBest = (getScore('city1', 'housing_property') + getScore('city1', 'policing_legal')) > (getScore('city2', 'housing_property') + getScore('city2', 'policing_legal')) ? city1Name : city2Name;
  const investorBest = (getScore('city1', 'housing_property') + getScore('city1', 'business_work')) > (getScore('city2', 'housing_property') + getScore('city2', 'business_work')) ? city1Name : city2Name;
  const libertarianBest = (getScore('city1', 'personal_freedom') + getScore('city1', 'speech_lifestyle')) > (getScore('city2', 'personal_freedom') + getScore('city2', 'speech_lifestyle')) ? city1Name : city2Name;
  const retireesBest = (getScore('city1', 'housing_property') + getScore('city1', 'policing_legal') + getScore('city1', 'transportation')) > (getScore('city2', 'housing_property') + getScore('city2', 'policing_legal') + getScore('city2', 'transportation')) ? city1Name : city2Name;

  return `
## SECTION: WHO SHOULD CHOOSE WHICH CITY?

---

### PAGE: PERSONA RECOMMENDATIONS

image-layout="right"
prompt="diverse group of professionals, entrepreneurs, families, digital nomads, lifestyle choice concept, modern photography"

# 🎯 Find YOUR Best Fit

**The "winner" depends on YOUR priorities:**

<smart-layout variant="imagesText" imagePosition="left">
<item label="🚀 Startup Founder" subtitle="Best: ${entrepreneurBest}">
**Why:** ${entrepreneurBest === city1Name ?
  `Lower business taxes, faster permits, less red tape (Business Score: ${getScore('city1', 'business_work')})` :
  `Lower business taxes, faster permits, less red tape (Business Score: ${getScore('city2', 'business_work')})`}
</item>
<item label="💻 Digital Nomad" subtitle="Best: ${nomadBest}">
**Why:** ${nomadBest === city1Name ?
  `Visa flexibility, coworking culture, lifestyle freedom (Combined: ${getScore('city1', 'business_work') + getScore('city1', 'personal_freedom')})` :
  `Visa flexibility, coworking culture, lifestyle freedom (Combined: ${getScore('city2', 'business_work') + getScore('city2', 'personal_freedom')})`}
</item>
<item label="👨‍👩‍👧 Family with Kids" subtitle="Best: ${familyBest}">
**Why:** ${familyBest === city1Name ?
  `Housing options, safety, school freedom (Combined: ${getScore('city1', 'housing_property') + getScore('city1', 'policing_legal')})` :
  `Housing options, safety, school freedom (Combined: ${getScore('city2', 'housing_property') + getScore('city2', 'policing_legal')})`}
</item>
<item label="🏠 Real Estate Investor" subtitle="Best: ${investorBest}">
**Why:** ${investorBest === city1Name ?
  `Property rights, rental freedom, lower taxes (Combined: ${getScore('city1', 'housing_property') + getScore('city1', 'business_work')})` :
  `Property rights, rental freedom, lower taxes (Combined: ${getScore('city2', 'housing_property') + getScore('city2', 'business_work')})`}
</item>
</smart-layout>

---

### PAGE: MORE PERSONAS

<smart-layout variant="imagesText" imagePosition="left">
<item label="🗽 Libertarian" subtitle="Best: ${libertarianBest}">
**Why:** ${libertarianBest === city1Name ?
  `Maximum personal freedom, minimal government interference (Freedom: ${getScore('city1', 'personal_freedom') + getScore('city1', 'speech_lifestyle')})` :
  `Maximum personal freedom, minimal government interference (Freedom: ${getScore('city2', 'personal_freedom') + getScore('city2', 'speech_lifestyle')})`}
</item>
<item label="🏖️ Retiree" subtitle="Best: ${retireesBest}">
**Why:** ${retireesBest === city1Name ?
  `Healthcare access, safety, transit options (Combined: ${getScore('city1', 'housing_property') + getScore('city1', 'transportation')})` :
  `Healthcare access, safety, transit options (Combined: ${getScore('city2', 'housing_property') + getScore('city2', 'transportation')})`}
</item>
<item label="🎨 Creative/Artist" subtitle="Best: ${libertarianBest}">
**Why:** ${libertarianBest === city1Name ?
  `Expression freedom, cultural tolerance, lifestyle flexibility (Speech: ${getScore('city1', 'speech_lifestyle')})` :
  `Expression freedom, cultural tolerance, lifestyle flexibility (Speech: ${getScore('city2', 'speech_lifestyle')})`}
</item>
<item label="⚖️ Attorney/Professional" subtitle="Best: ${entrepreneurBest}">
**Why:** ${entrepreneurBest === city1Name ?
  `Professional licensing, business environment, legal system (Business: ${getScore('city1', 'business_work')})` :
  `Professional licensing, business environment, legal system (Business: ${getScore('city2', 'business_work')})`}
</item>
</smart-layout>

---

### PAGE: DECISION MATRIX

# 🎚️ What If You Weighted Differently?

<smart-layout variant="barStats">
<item label="Scenario: BUSINESS FOCUS (40%)" value1="${Math.round(getScore('city1', 'business_work') * 0.4 + (result.city1.totalConsensusScore * 0.6))}" value2="${Math.round(getScore('city2', 'business_work') * 0.4 + (result.city2.totalConsensusScore * 0.6))}" color1="#FFD700" color2="#1E90FF">
${city1Name} vs ${city2Name}
</item>
<item label="Scenario: PERSONAL FREEDOM (40%)" value1="${Math.round(getScore('city1', 'personal_freedom') * 0.4 + (result.city1.totalConsensusScore * 0.6))}" value2="${Math.round(getScore('city2', 'personal_freedom') * 0.4 + (result.city2.totalConsensusScore * 0.6))}" color1="#FFD700" color2="#1E90FF">
${city1Name} vs ${city2Name}
</item>
<item label="Scenario: FAMILY SAFETY (40%)" value1="${Math.round((getScore('city1', 'policing_legal') + getScore('city1', 'housing_property')) * 0.2 + (result.city1.totalConsensusScore * 0.6))}" value2="${Math.round((getScore('city2', 'policing_legal') + getScore('city2', 'housing_property')) * 0.2 + (result.city2.totalConsensusScore * 0.6))}" color1="#FFD700" color2="#1E90FF">
${city1Name} vs ${city2Name}
</item>
<item label="Scenario: BALANCED (Default)" value1="${Math.round(result.city1.totalConsensusScore)}" value2="${Math.round(result.city2.totalConsensusScore)}" color1="#FFD700" color2="#1E90FF">
${city1Name} vs ${city2Name}
</item>
</smart-layout>

<aside variant="note">
Your "winner" may differ from our default ranking depending on what matters most to YOU. Use these scenarios to find your personal best fit.
</aside>

`;
}

// ============================================================================
// NEW SECTION: SURPRISING FINDINGS (Counterintuitive Insights)
// ============================================================================
function formatSectionSurprisingFindings(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const winner = result.winner === 'city1' ? city1Name : city2Name;
  const loser = result.winner === 'city1' ? city2Name : city1Name;

  const getScore = (city: 'city1' | 'city2', catId: string): number => {
    const cityData = city === 'city1' ? result.city1 : result.city2;
    return Math.round(cityData.categories.find(c => c.categoryId === catId)?.averageConsensusScore ?? 50);
  };

  // Find surprising reversals (where loser beats winner in a category)
  const loserCity = result.winner === 'city1' ? 'city2' : 'city1';
  const winnerCity = result.winner === 'city1' ? 'city1' : 'city2';

  const surprises: string[] = [];
  Object.entries(CATEGORY_CONFIG).forEach(([catId, config]) => {
    const winnerScore = getScore(winnerCity, catId);
    const loserScore = getScore(loserCity, catId);
    if (loserScore > winnerScore + 5) {
      surprises.push(`Despite losing overall, **${loser}** actually beats ${winner} in ${config.name} (${loserScore} vs ${winnerScore})`);
    }
  });

  // Find big gaps between legal and enforcement
  const gapInsights: string[] = [];
  [result.city1, result.city2].forEach(city => {
    city.categories.forEach(cat => {
      cat.metrics.forEach(m => {
        const legal = m.legalScore ?? m.consensusScore ?? 0;
        const enforcement = m.enforcementScore ?? m.consensusScore ?? 0;
        if (Math.abs(legal - enforcement) > 25) {
          const name = getMetricDisplayName(m.metricId);
          if (legal > enforcement) {
            gapInsights.push(`**${city.city}**: ${name} looks free on paper (${Math.round(legal)}) but is heavily enforced (${Math.round(enforcement)})`);
          } else {
            gapInsights.push(`**${city.city}**: ${name} has strict laws (${Math.round(legal)}) but they're rarely enforced (${Math.round(enforcement)})`);
          }
        }
      });
    });
  });

  return `
## SECTION: SURPRISING FINDINGS

---

### PAGE: WHAT MIGHT SURPRISE YOU

image-layout="right"
prompt="surprised person looking at data, revelation moment, light bulb concept, modern professional photography"

# 🤯 Counterintuitive Insights

**Things that don't match common assumptions:**

<smart-layout variant="outlineBoxesWithTopCircle" numbered="true">
${surprises.slice(0, 4).map((s, i) => `<item label="Surprise ${i + 1}">
${s}
</item>`).join('\n') || `<item label="Surprise 1">
The margin between these cities is closer than reputation suggests—only ${Math.abs(result.scoreDifference)} points separate them.
</item>
<item label="Surprise 2">
${winner}'s advantage comes primarily from enforcement reality, not written laws.
</item>`}
</smart-layout>

---

### PAGE: MYTH VS REALITY

# 🎭 Reputation vs Data

<smart-layout variant="solidBoxes">
<item label="❌ MYTH" color="#DC2626">
"${result.city1.country === 'United States' ? city1Name : city2Name} is always more free because America"
</item>
<item label="✅ REALITY" color="#10B981">
${result.city1.country === 'United States' ?
  (result.winner === 'city1' ? `${city1Name} does score higher, but by only ${Math.abs(result.scoreDifference)} points—not the landslide you'd expect.` : `${city2Name} actually beats ${city1Name} by ${Math.abs(result.scoreDifference)} points despite the American freedom narrative.`) :
  (result.winner === 'city2' ? `${city2Name} does score higher, but by only ${Math.abs(result.scoreDifference)} points—not the landslide you'd expect.` : `${city1Name} actually beats ${city2Name} by ${Math.abs(result.scoreDifference)} points.`)}
</item>
</smart-layout>

<smart-layout variant="solidBoxes">
<item label="❌ MYTH" color="#DC2626">
"Low taxes = more freedom"
</item>
<item label="✅ REALITY" color="#10B981">
${getScore('city1', 'business_work') > getScore('city2', 'business_work') ? city1Name : city2Name} has better business freedom, but ${getScore('city1', 'personal_freedom') > getScore('city2', 'personal_freedom') ? city1Name : city2Name} has better personal freedom. Tax policy is just one factor.
</item>
</smart-layout>

---

### PAGE: LAW VS ENFORCEMENT SURPRISES

# 📜 Paper Tigers & Hidden Restrictions

${gapInsights.length > 0 ? `
**Laws That Aren't What They Seem:**

<smart-layout variant="outlineBoxesWithSideLine">
${gapInsights.slice(0, 6).map((g, i) => `<item label="Finding ${i + 1}">
${g}
</item>`).join('\n')}
</smart-layout>
` : `
<aside variant="note">
Both cities show reasonable alignment between written laws and enforcement. What you read is generally what you get.
</aside>
`}

<blockquote>
The gap between law and reality is where freedom actually lives. A permissive law means nothing if aggressively enforced, and a restrictive law matters less if rarely applied.
</blockquote>

`;
}

// ============================================================================
// NEW SECTION: THE HIDDEN COSTS (Restriction Cost Analysis)
// ============================================================================
function formatSectionHiddenCosts(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const winner = result.winner === 'city1' ? city1Name : city2Name;
  const loser = result.winner === 'city1' ? city2Name : city1Name;

  const getScore = (city: 'city1' | 'city2', catId: string): number => {
    const cityData = city === 'city1' ? result.city1 : result.city2;
    return Math.round(cityData.categories.find(c => c.categoryId === catId)?.averageConsensusScore ?? 50);
  };

  // Estimate costs based on low scores (lower score = higher hidden cost)
  const loserData = result.winner === 'city1' ? result.city2 : result.city1;
  const loserCity = result.winner === 'city1' ? 'city2' : 'city1';

  const transitCost = getScore(loserCity, 'transportation') < 60 ? '$6,000-10,000/year (car dependency)' : '$1,000-3,000/year';
  const businessCost = getScore(loserCity, 'business_work') < 60 ? '$3,000-8,000/year (licensing, compliance)' : '$500-2,000/year';
  const housingCost = getScore(loserCity, 'housing_property') < 60 ? '$2,000-5,000/year (restrictions, HOA)' : '$500-1,500/year';
  const policingCost = getScore(loserCity, 'policing_legal') < 60 ? '$1,000-4,000/year (fines, legal fees risk)' : '$200-500/year';

  return `
## SECTION: THE HIDDEN COSTS OF RESTRICTIONS

---

### PAGE: FREEDOM HAS A PRICE TAG

image-layout="right"
prompt="person looking at bills and expenses, calculator, financial planning, professional photography"

# 💸 What Low Scores Actually Cost You

**The "Freedom Tax" of choosing ${loser}:**

<smart-layout variant="barStats">
<item label="🚗 Transportation Costs" value="${getScore(loserCity, 'transportation') < 60 ? 85 : 25}" max="100" color="#F97316">
${transitCost}
</item>
<item label="💼 Business Compliance" value="${getScore(loserCity, 'business_work') < 60 ? 75 : 20}" max="100" color="#F97316">
${businessCost}
</item>
<item label="🏠 Housing Restrictions" value="${getScore(loserCity, 'housing_property') < 60 ? 65 : 15}" max="100" color="#F97316">
${housingCost}
</item>
<item label="⚖️ Legal/Fine Risk" value="${getScore(loserCity, 'policing_legal') < 60 ? 55 : 10}" max="100" color="#F97316">
${policingCost}
</item>
</smart-layout>

---

### PAGE: ANNUAL FREEDOM TAX COMPARISON

# 📊 Estimated Annual "Restriction Costs"

| Category | ${city1Name} | ${city2Name} |
|----------|-------------|-------------|
| **Transportation** | ${getScore('city1', 'transportation') > 65 ? '✅ $1,500' : '⚠️ $8,000'} | ${getScore('city2', 'transportation') > 65 ? '✅ $1,500' : '⚠️ $8,000'} |
| **Business Compliance** | ${getScore('city1', 'business_work') > 65 ? '✅ $1,000' : '⚠️ $5,000'} | ${getScore('city2', 'business_work') > 65 ? '✅ $1,000' : '⚠️ $5,000'} |
| **Housing Extras** | ${getScore('city1', 'housing_property') > 65 ? '✅ $500' : '⚠️ $3,000'} | ${getScore('city2', 'housing_property') > 65 ? '✅ $500' : '⚠️ $3,000'} |
| **Legal Risk Buffer** | ${getScore('city1', 'policing_legal') > 65 ? '✅ $300' : '⚠️ $2,000'} | ${getScore('city2', 'policing_legal') > 65 ? '✅ $300' : '⚠️ $2,000'} |
| **TOTAL FREEDOM TAX** | **${getScore('city1', 'transportation') + getScore('city1', 'business_work') + getScore('city1', 'housing_property') + getScore('city1', 'policing_legal') > 260 ? '$3,300' : '$18,000'}** | **${getScore('city2', 'transportation') + getScore('city2', 'business_work') + getScore('city2', 'housing_property') + getScore('city2', 'policing_legal') > 260 ? '$3,300' : '$18,000'}** |

<aside variant="warning">
These are estimates based on LIFE SCORE data. Actual costs vary by individual circumstances. The point: freedom differences have REAL financial impact beyond just taxes.
</aside>

---

### PAGE: OPPORTUNITY COSTS

# 🚫 What Restrictions Prevent

<smart-layout variant="outlineBoxes">
<item label="🏠 Housing Restrictions (Score: ${Math.min(getScore('city1', 'housing_property'), getScore('city2', 'housing_property'))})">
**In the lower-scoring city:** Can't Airbnb your spare room, HOA fines, renovation permits, rental restrictions
**Annual opportunity cost:** $5,000-15,000 in lost potential income
</item>
<item label="💼 Business Restrictions (Score: ${Math.min(getScore('city1', 'business_work'), getScore('city2', 'business_work'))})">
**In the lower-scoring city:** Delayed business launch, licensing fees, compliance staff, legal consultations
**Annual opportunity cost:** $10,000-50,000 in delayed revenue and overhead
</item>
<item label="🚇 Transit Restrictions (Score: ${Math.min(getScore('city1', 'transportation'), getScore('city2', 'transportation'))})">
**In the lower-scoring city:** Forced car ownership, parking costs, insurance, maintenance, time in traffic
**Annual opportunity cost:** $8,000-15,000 in car costs + 200 hours in traffic
</item>
</smart-layout>

`;
}

// ============================================================================
// NEW SECTION: FUTURE OUTLOOK (5-Year Forecast)
// ============================================================================
function formatSectionFutureOutlook(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;

  const city1Trend = judgeReport?.summaryOfFindings?.city1Trend || 'stable';
  const city2Trend = judgeReport?.summaryOfFindings?.city2Trend || 'stable';

  const getTrendIcon = (trend: string) => trend === 'rising' ? '📈' : trend === 'declining' ? '📉' : '➡️';
  const getTrendColor = (trend: string) => trend === 'rising' ? '#10B981' : trend === 'declining' ? '#EF4444' : '#F59E0B';

  return `
## SECTION: FUTURE OUTLOOK

---

### PAGE: 5-YEAR TRAJECTORY FORECAST

image-layout="right"
prompt="futuristic city skyline, timeline concept, progress and growth, modern architecture, optimistic lighting"

# 🔮 Where Are These Cities Heading?

<smart-layout variant="circleStats">
<item label="${city1Name}" value="${city1Trend.toUpperCase()}" color="${getTrendColor(city1Trend)}">
${getTrendIcon(city1Trend)} ${city1Trend === 'rising' ? 'Improving freedom trajectory' : city1Trend === 'declining' ? 'Increasing restrictions expected' : 'Stable - maintaining current levels'}
</item>
<item label="${city2Name}" value="${city2Trend.toUpperCase()}" color="${getTrendColor(city2Trend)}">
${getTrendIcon(city2Trend)} ${city2Trend === 'rising' ? 'Improving freedom trajectory' : city2Trend === 'declining' ? 'Increasing restrictions expected' : 'Stable - maintaining current levels'}
</item>
</smart-layout>

---

### PAGE: ${city1Name.toUpperCase()} - NEXT 5 YEARS

image-layout="behind"
prompt="${city1Name} ${city1Country} future cityscape, modern development, optimistic urban planning"

# ${getTrendIcon(city1Trend)} ${city1Name} Forecast

<labels>
<label variant="solid" color="${getTrendColor(city1Trend)}">TREND: ${city1Trend.toUpperCase()}</label>
</labels>

**What to Watch:**

<smart-layout variant="processSteps">
<item label="📜 Legislative Pipeline">
${city1Trend === 'rising' ? 'Pro-freedom reforms in progress. Deregulation likely.' : city1Trend === 'declining' ? 'New restrictions being debated. Increased regulation probable.' : 'No major changes expected. Status quo likely to continue.'}
</item>
<item label="🏛️ Political Climate">
${city1Trend === 'rising' ? 'Leadership favoring individual freedom and economic openness.' : city1Trend === 'declining' ? 'Trend toward more government intervention and control.' : 'Balanced political environment with incremental changes.'}
</item>
<item label="💰 Economic Factors">
${city1Trend === 'rising' ? 'Growing economy attracting talent and reducing regulatory burden.' : city1Trend === 'declining' ? 'Economic pressures may lead to increased taxation and regulation.' : 'Stable economy with predictable business environment.'}
</item>
<item label="🌍 Global Position">
${city1Country === 'Portugal' || city1Country === 'Spain' || city1Country === 'Netherlands' ? 'EU regulations may override local freedoms in some areas.' : city1Country === 'United States' ? 'State/federal tensions may create uncertainty.' : 'Sovereign policy likely to remain consistent.'}
</item>
</smart-layout>

---

### PAGE: ${city2Name.toUpperCase()} - NEXT 5 YEARS

image-layout="behind"
prompt="${city2Name} ${city2Country} future cityscape, modern development, urban planning"

# ${getTrendIcon(city2Trend)} ${city2Name} Forecast

<labels>
<label variant="solid" color="${getTrendColor(city2Trend)}">TREND: ${city2Trend.toUpperCase()}</label>
</labels>

**What to Watch:**

<smart-layout variant="processSteps">
<item label="📜 Legislative Pipeline">
${city2Trend === 'rising' ? 'Pro-freedom reforms in progress. Deregulation likely.' : city2Trend === 'declining' ? 'New restrictions being debated. Increased regulation probable.' : 'No major changes expected. Status quo likely to continue.'}
</item>
<item label="🏛️ Political Climate">
${city2Trend === 'rising' ? 'Leadership favoring individual freedom and economic openness.' : city2Trend === 'declining' ? 'Trend toward more government intervention and control.' : 'Balanced political environment with incremental changes.'}
</item>
<item label="💰 Economic Factors">
${city2Trend === 'rising' ? 'Growing economy attracting talent and reducing regulatory burden.' : city2Trend === 'declining' ? 'Economic pressures may lead to increased taxation and regulation.' : 'Stable economy with predictable business environment.'}
</item>
<item label="🌍 Global Position">
${city2Country === 'Portugal' || city2Country === 'Spain' || city2Country === 'Netherlands' ? 'EU regulations may override local freedoms in some areas.' : city2Country === 'United States' ? 'State/federal tensions may create uncertainty.' : 'Sovereign policy likely to remain consistent.'}
</item>
</smart-layout>

---

### PAGE: SCENARIO PLANNING

# ⚡ What Could Change the Outcome?

<smart-layout variant="outlineBoxesWithTopCircle">
<item label="🟢 Best Case for ${result.winner === 'city1' ? city2Name : city1Name}">
Major reform package passes, dramatically improving their weakest categories. Could close the ${Math.abs(result.scoreDifference)}-point gap within 3 years.
</item>
<item label="🔴 Worst Case for ${result.winner === 'city1' ? city1Name : city2Name}">
Political shift leads to new restrictions. Current winner could lose advantage if trend reverses.
</item>
<item label="🔵 Most Likely Scenario">
Both cities maintain current trajectories. ${result.winner === 'city1' ? city1Name : city2Name} remains ahead by 2030, but margin may narrow or widen by 5-10 points.
</item>
<item label="⚠️ Wild Card Events">
Economic crisis, pandemic, major court rulings, or regime change could rapidly shift freedom scores in either direction.
</item>
</smart-layout>

`;
}

// ============================================================================
// NEW SECTION: YOUR NEXT STEPS (Relocation Checklists)
// ============================================================================
function formatSectionNextSteps(
  result: EnhancedComparisonResult
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;

  // Generate country-specific guidance
  const isEU1 = ['Portugal', 'Spain', 'Germany', 'France', 'Netherlands', 'Italy', 'Ireland', 'Greece', 'Malta', 'Cyprus', 'Estonia', 'Czech Republic'].includes(city1Country);
  const isEU2 = ['Portugal', 'Spain', 'Germany', 'France', 'Netherlands', 'Italy', 'Ireland', 'Greece', 'Malta', 'Cyprus', 'Estonia', 'Czech Republic'].includes(city2Country);
  const isUS1 = city1Country === 'United States';
  const isUS2 = city2Country === 'United States';

  return `
## SECTION: YOUR NEXT STEPS

---

### PAGE: IF YOU CHOOSE ${city1Name.toUpperCase()}

image-layout="right"
prompt="person packing suitcase, moving abroad, exciting new chapter, ${city1Name} travel"

# ✅ Relocation Checklist: ${city1Name}

<smart-layout variant="processSteps" numbered="true">
<item label="Step 1: Visa/Residency">
${isUS1 ? 'US citizens: Domestic move, no visa needed. Check state residency requirements.' :
  isEU1 ? `EU citizens: Freedom of movement. Non-EU: Research D7 (passive income), Digital Nomad, or Golden Visa options for ${city1Country}.` :
  `Research visa requirements for ${city1Country}. Consider work visa, investor visa, or residency programs.`}
</item>
<item label="Step 2: Banking & Taxes">
${isUS1 ? 'Update address with bank. Research state income tax implications. Texas/Florida: No state income tax.' :
  isEU1 ? `Open ${city1Country} bank account. Apply for NIF/tax number. Research NHR or special tax regimes.` :
  `Open local bank account. Understand tax treaty implications with home country.`}
</item>
<item label="Step 3: Housing">
${isUS1 ? 'Research neighborhoods carefully—regulations vary by district. Check HOA rules before signing.' :
  isEU1 ? 'Rental market can be competitive. Consider temporary housing first. Register address with local authorities.' :
  'Research local rental market and property laws. Consider short-term rental initially.'}
</item>
<item label="Step 4: Healthcare">
${isUS1 ? 'Private insurance required. Budget $500-1,500/month depending on coverage.' :
  isEU1 ? `Register with public health system (SNS/NHS equivalent) or arrange private insurance. Many expats use both.` :
  'Research healthcare options—public system, private insurance, or international coverage.'}
</item>
<item label="Step 5: Timeline">
${isUS1 ? 'Domestic: 1-2 months typical. Interstate: Consider tax year timing.' :
  isEU1 ? 'EU citizen: 1-2 months. Non-EU: 4-8 months (visa processing).' :
  '3-6 months typical for international relocation.'}
</item>
</smart-layout>

---

### PAGE: IF YOU CHOOSE ${city2Name.toUpperCase()}

image-layout="right"
prompt="person packing suitcase, moving abroad, exciting new chapter, ${city2Name} travel"

# ✅ Relocation Checklist: ${city2Name}

<smart-layout variant="processSteps" numbered="true">
<item label="Step 1: Visa/Residency">
${isUS2 ? 'US citizens: Domestic move, no visa needed. Check state residency requirements.' :
  isEU2 ? `EU citizens: Freedom of movement. Non-EU: Research D7 (passive income), Digital Nomad, or Golden Visa options for ${city2Country}.` :
  `Research visa requirements for ${city2Country}. Consider work visa, investor visa, or residency programs.`}
</item>
<item label="Step 2: Banking & Taxes">
${isUS2 ? 'Update address with bank. Research state income tax implications. Texas/Florida: No state income tax.' :
  isEU2 ? `Open ${city2Country} bank account. Apply for NIF/tax number. Research NHR or special tax regimes.` :
  `Open local bank account. Understand tax treaty implications with home country.`}
</item>
<item label="Step 3: Housing">
${isUS2 ? 'Research neighborhoods carefully—regulations vary by district. Check HOA rules before signing.' :
  isEU2 ? 'Rental market can be competitive. Consider temporary housing first. Register address with local authorities.' :
  'Research local rental market and property laws. Consider short-term rental initially.'}
</item>
<item label="Step 4: Healthcare">
${isUS2 ? 'Private insurance required. Budget $500-1,500/month depending on coverage.' :
  isEU2 ? `Register with public health system (SNS/NHS equivalent) or arrange private insurance. Many expats use both.` :
  'Research healthcare options—public system, private insurance, or international coverage.'}
</item>
<item label="Step 5: Timeline">
${isUS2 ? 'Domestic: 1-2 months typical. Interstate: Consider tax year timing.' :
  isEU2 ? 'EU citizen: 1-2 months. Non-EU: 4-8 months (visa processing).' :
  '3-6 months typical for international relocation.'}
</item>
</smart-layout>

---

### PAGE: KEY CONTACTS & RESOURCES

# 📞 Where to Go for Help

| Need | ${city1Name} | ${city2Name} |
|------|-------------|-------------|
| **Immigration** | ${isUS1 ? 'USCIS.gov' : isEU1 ? `${city1Country} Immigration Office` : `${city1Country} Embassy`} | ${isUS2 ? 'USCIS.gov' : isEU2 ? `${city2Country} Immigration Office` : `${city2Country} Embassy`} |
| **Taxes** | ${isUS1 ? 'IRS.gov + State Revenue' : isEU1 ? `${city1Country} Tax Authority` : `${city1Country} Tax Office`} | ${isUS2 ? 'IRS.gov + State Revenue' : isEU2 ? `${city2Country} Tax Authority` : `${city2Country} Tax Office`} |
| **Healthcare** | ${isUS1 ? 'Healthcare.gov' : isEU1 ? 'National Health Service' : 'Local Health Ministry'} | ${isUS2 ? 'Healthcare.gov' : isEU2 ? 'National Health Service' : 'Local Health Ministry'} |
| **Expat Groups** | InterNations, Facebook Groups, Reddit r/${city1Name.toLowerCase().replace(' ', '')} | InterNations, Facebook Groups, Reddit r/${city2Name.toLowerCase().replace(' ', '')} |
| **Legal Help** | International lawyer referral, ${city1Country} bar association | International lawyer referral, ${city2Country} bar association |

<aside variant="note">
This is general guidance only. Consult qualified professionals (immigration attorneys, tax advisors) for your specific situation.
</aside>

`;
}

// ============================================================================
// MAIN ENHANCED REPORT FORMATTER
// ============================================================================

/**
 * Format comparison for Enhanced Gamma Report v4.0
 * NOW WITH: Unique narrative sections, persona recommendations, surprising findings,
 * hidden costs analysis, future outlook, and relocation checklists.
 *
 * IMPORTANT: This is a NEW function. The existing formatComparisonForGamma()
 * remains completely untouched for standard 35-page reports.
 *
 * @param result - EnhancedComparisonResult from multi-LLM evaluation
 * @param judgeReport - Optional JudgeReport with executive summary and analysis
 * @param gunData - Optional GunComparisonData for gun rights section
 * @returns Formatted prompt string for Gamma API (60,000-90,000 chars)
 */
export function formatEnhancedReportForGamma(
  result: EnhancedComparisonResult,
  judgeReport?: JudgeReportData,
  gunData?: GunComparisonData
): string {
  const city1Name = result.city1.city;
  const city2Name = result.city2.city;
  const city1Country = result.city1.country;
  const city2Country = result.city2.country;
  const winner = result.winner === 'city1' ? city1Name : result.winner === 'city2' ? city2Name : 'TIE';
  const loser = result.winner === 'city1' ? city2Name : result.winner === 'city2' ? city1Name : '';
  const city1TotalScore = Math.round(result.city1.totalConsensusScore);
  const city2TotalScore = Math.round(result.city2.totalConsensusScore);
  const generatedAt = new Date(result.generatedAt).toLocaleDateString();

  // Build all sections - NEW STRUCTURE with unique content
  const sectionExecutive = formatSection1ExecutiveSummary(result, judgeReport);
  const sectionLifeInCity = formatSectionLifeInEachCity(result, judgeReport);  // NEW
  const sectionPersonas = formatSectionPersonaRecommendations(result);          // NEW
  const sectionSurprises = formatSectionSurprisingFindings(result, judgeReport); // NEW
  const sectionLawVsReality = formatSection2LawVsReality(result);
  const sectionCategoryDeepDives = formatSection3CategoryDeepDives(result, judgeReport);
  const sectionHiddenCosts = formatSectionHiddenCosts(result);                  // NEW
  const sectionFutureOutlook = formatSectionFutureOutlook(result, judgeReport); // NEW
  const sectionNextSteps = formatSectionNextSteps(result);                      // NEW
  const sectionLLMConsensus = formatSection5LLMConsensus(result);
  const sectionGunRights = formatSection6GunRights(result, gunData);
  const sectionMethodology = formatSection7Methodology(result);
  const sectionEvidence = formatSection8EvidenceClosingBothCities(result);      // FIXED for both cities

  const fullPrompt = `
LIFE SCORE™ ENHANCED FREEDOM RELOCATION GUIDE - GAMMA AI GENERATION INSTRUCTIONS v4.0

CRITICAL: Generate ALL 82 pages. Do NOT truncate or summarize any section.
This is a PREMIUM report with unique insights NOT available in the web UI.

================================================================================
REPORT METADATA:
================================================================================

Report Type: LIFE SCORE™ Enhanced Freedom Relocation Guide
Cities: ${city1Name}, ${city1Country} vs ${city2Name}, ${city2Country}
Winner: ${winner} (Score: ${result.winner === 'city1' ? city1TotalScore : city2TotalScore}/100)
Loser: ${loser} (Score: ${result.winner === 'city1' ? city2TotalScore : city1TotalScore}/100)
Score Difference: ${Math.abs(result.scoreDifference)} points
Generated: ${generatedAt}
Report ID: ${result.comparisonId}

================================================================================
CORRECT AI MODELS (CRITICAL - USE THESE EXACT NAMES):
================================================================================

5 LLMs Used for Evaluation:
📝 Claude Sonnet 4.5 (Anthropic) - Primary evaluator with web search
🤖 GPT-4o (OpenAI) - Cross-validation with Tavily search
💎 Gemini 3 Pro (Google) - Native Google Search grounding
𝕏 Grok 4 (xAI) - Real-time X/Twitter data integration
🔮 Sonar Reasoning Pro (Perplexity) - Deep web research

Final Judge: 🎭 Claude Opus 4.5 (Anthropic) - Synthesizes all 5 evaluations

================================================================================
VISUAL SPECIFICATIONS (USE DIVERSE VISUALS):
================================================================================

Heat Maps: <smart-layout variant="circleStats"> with label and color attributes
Gauges: <smart-layout variant="semiCircle"> or variant="circleStats">
Bars: <smart-layout variant="barStats">
Process Steps: <smart-layout variant="processSteps" numbered="true">
Solid Boxes: <smart-layout variant="solidBoxes">
Outline Boxes: <smart-layout variant="outlineBoxes"> or variant="outlineBoxesWithTopCircle">
Images with Text: <smart-layout variant="imagesText" imagePosition="left">
Tables: <table colwidths="[30,35,35]">
Diagrams: <diagram type="rings"> or type="venn"> or type="target">
Labels: <labels><label variant="solid" color="#HEX">Text</label></labels>
Blockquotes: <blockquote>Quote text</blockquote>
Asides: <aside variant="note"> or variant="warning">

IMAGE LAYOUTS:
- image-layout="behind" for full-page backgrounds
- image-layout="right" or "left" for side images
- Use <columns> with two images for side-by-side comparisons

================================================================================
COLOR CODING:
================================================================================

Winner: Gold #FFD700 / Green #10B981
Loser: Blue #1E90FF
Legal Scores: Purple #6B46C1
Lived Scores: Teal #14B8A6
Agreement >90%: Dark Green #1C5D1F
Agreement 85-90%: Green #10B981
Agreement 70-85%: Yellow #FBBF24
Agreement <70%: Orange #F97316
Warning/Caution: Red #DC2626 / Orange #F97316
Success: Green #10B981
Info: Blue #3B82F6

================================================================================
REPORT SECTIONS (Generate in this order):
================================================================================

${sectionExecutive}

${sectionLifeInCity}

${sectionPersonas}

${sectionSurprises}

${sectionLawVsReality}

${sectionCategoryDeepDives}

${sectionHiddenCosts}

${sectionFutureOutlook}

${sectionNextSteps}

${sectionLLMConsensus}

${sectionGunRights}

${sectionMethodology}

${sectionEvidence}

================================================================================
END OF LIFE SCORE™ ENHANCED RELOCATION GUIDE DATA
================================================================================

CRITICAL FINAL INSTRUCTIONS:
1. Generate a COMPLETE 82 PAGE visual report from the above data
2. Use DIVERSE visual elements - vary between gauges, bars, boxes, diagrams
3. Generate BEAUTIFUL AI images for lifestyle sections using image-layout prompts
4. DO NOT TRUNCATE - include ALL sections, ALL metrics, ALL insights
5. Use EXACT AI model names as specified above
6. Apply COLOR CODING consistently throughout
7. Gun Rights section is UNSCORED - facts only, no winner
8. Make this feel like a PREMIUM deliverable, not just a data dump
9. Include citations from BOTH cities in the evidence section
`.trim();

  return fullPrompt;
}

// ============================================================================
// ENHANCED REPORT GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate an enhanced 64-page visual report via Gamma API
 *
 * IMPORTANT: This is a NEW function. The existing generateVisualReport()
 * remains completely untouched for standard reports.
 */
export async function generateEnhancedVisualReport(
  result: EnhancedComparisonResult,
  exportFormat: 'pdf' | 'pptx' = 'pdf',
  judgeReport?: JudgeReportData,
  gunData?: GunComparisonData
): Promise<VisualReportResponse> {
  // Generate the enhanced prompt
  const prompt = formatEnhancedReportForGamma(result, judgeReport, gunData);

  // Validate prompt length
  if (prompt.length > PROMPT_LENGTH_MAX) {
    throw new Error(
      `Report data exceeds maximum size (${prompt.length} chars). ` +
      `Try unchecking "Include Gun Rights" to reduce size.`
    );
  }

  if (prompt.length > PROMPT_LENGTH_WARNING) {
    console.warn(
      `[GammaService] Enhanced prompt is ${prompt.length} chars - approaching ${PROMPT_LENGTH_MAX} limit`
    );
  }

  console.log(`[GammaService] Generating enhanced report: ${prompt.length} chars`);

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
    throw new Error(errorData.error || `Failed to generate enhanced report: ${response.status}`);
  }

  const data: VisualReportResponse = await response.json();

  // Record cost (enhanced reports may cost more due to size)
  if (data.generationId) {
    const cost = calculateGammaCost();
    appendServiceCost('gamma', {
      generationId: data.generationId,
      cost,
      timestamp: Date.now(),
    });
  }

  return data;
}

/**
 * Poll for enhanced report completion with extended timeout and progressive messages
 */
export async function pollEnhancedUntilComplete(
  generationId: string,
  onProgress?: (state: VisualReportState) => void
): Promise<VisualReportResponse> {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS_ENHANCED) {
    const status = await checkGenerationStatus(generationId);

    // Calculate progress - 82 pages takes ~8-12 minutes (96-144 attempts)
    const estimatedProgress = Math.min(95, Math.round((attempts / 144) * 100));

    // Progressive status messages for 82-page report
    let statusMessage = 'Generating your 82-page Premium Report...';
    if (attempts > 24) statusMessage = 'Creating lifestyle narratives and AI images...';  // 2 min
    if (attempts > 48) statusMessage = 'Analyzing 100 metrics across 6 categories...';   // 4 min
    if (attempts > 72) statusMessage = 'Building category deep dives and heat maps...';  // 6 min
    if (attempts > 96) statusMessage = 'Generating insights, forecasts, and checklists...'; // 8 min
    if (attempts > 120) statusMessage = 'Finalizing evidence and closing pages...';      // 10 min
    if (attempts > 144) statusMessage = 'Almost done... Complex report nearly complete'; // 12 min
    if (attempts > 168) statusMessage = 'Taking longer than usual. Please wait...';

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
        statusMessage,
      });
    }

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Enhanced report generation failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    attempts++;
  }

  // Timeout with recovery suggestion
  throw new Error(
    'Premium report generation timed out (15 min). ' +
    'The 82-page report is still being processed. Try: (1) Wait a few more minutes and refresh, ' +
    '(2) Uncheck "Include Gun Rights" to reduce size, or (3) Use Standard Report instead.'
  );
}

/**
 * Full enhanced generation flow: generate + poll until complete
 *
 * IMPORTANT: This is a NEW function. The existing generateAndWaitForReport()
 * remains completely untouched for standard reports.
 */
export async function generateEnhancedAndWaitForReport(
  result: EnhancedComparisonResult,
  exportFormat: 'pdf' | 'pptx' = 'pdf',
  judgeReport?: JudgeReportData,
  gunData?: GunComparisonData,
  onProgress?: (state: VisualReportState) => void
): Promise<VisualReportResponse> {
  // Start generation
  if (onProgress) {
    onProgress({
      status: 'generating',
      progress: 0,
      statusMessage: 'Starting 64-page Enhanced Report generation...',
    });
  }

  const initial = await generateEnhancedVisualReport(result, exportFormat, judgeReport, gunData);

  if (onProgress) {
    onProgress({
      status: 'polling',
      generationId: initial.generationId,
      progress: 5,
      statusMessage: 'Generating your 64-page Enhanced Report...',
    });
  }

  // Poll with extended timeout
  return pollEnhancedUntilComplete(initial.generationId, onProgress);
}

// ============================================================================
// SESSION 16: REPORT STORAGE INTEGRATION
// ============================================================================

/**
 * Extended response including saved report reference
 */
export interface VisualReportResponseWithStorage extends VisualReportResponse {
  savedReport?: Report;
  storageError?: string;
}

/**
 * Generate enhanced report and save to Supabase storage.
 *
 * This wraps generateEnhancedAndWaitForReport to also:
 * 1. Fetch the HTML from Gamma after generation
 * 2. Save it to Supabase Storage
 * 3. Store metadata in the reports table
 *
 * @param result - The enhanced comparison result
 * @param exportFormat - PDF or PPTX export format
 * @param judgeReport - Optional judge report data
 * @param gunData - Optional gun comparison data
 * @param onProgress - Progress callback
 * @returns Report response with optional saved report reference
 */
export async function generateAndSaveEnhancedReport(
  result: EnhancedComparisonResult,
  exportFormat: 'pdf' | 'pptx' = 'pdf',
  judgeReport?: JudgeReportData,
  gunData?: GunComparisonData,
  onProgress?: (state: VisualReportState) => void
): Promise<VisualReportResponseWithStorage> {
  const startTime = Date.now();

  // Generate report using existing flow
  const response = await generateEnhancedAndWaitForReport(
    result,
    exportFormat,
    judgeReport,
    gunData,
    onProgress
  );

  // If generation failed, return as-is
  if (response.status !== 'completed' || !response.url) {
    return response;
  }

  // Try to save to our storage
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[GammaService] No authenticated user, skipping storage save');
      return {
        ...response,
        storageError: 'Not authenticated - report not saved to storage'
      };
    }

    // Notify progress
    if (onProgress) {
      onProgress({
        status: 'completed',
        generationId: response.generationId,
        gammaUrl: response.url,
        pdfUrl: response.pdfUrl,
        progress: 98,
        statusMessage: 'Saving report to your library...',
      });
    }

    // Fetch HTML from Gamma URL
    // Note: Gamma URLs are public but may have CORS restrictions
    // If this fails, we'll still return the Gamma URL
    let htmlContent = '';
    try {
      const htmlResponse = await fetch(response.url);
      if (htmlResponse.ok) {
        htmlContent = await htmlResponse.text();
      } else {
        console.warn('[GammaService] Could not fetch Gamma HTML:', htmlResponse.status);
      }
    } catch (fetchError) {
      console.warn('[GammaService] CORS or fetch error getting Gamma HTML:', fetchError);
      // Try via our proxy if direct fetch fails
      try {
        const proxyResponse = await fetch(`/api/proxy-gamma?url=${encodeURIComponent(response.url)}`);
        if (proxyResponse.ok) {
          htmlContent = await proxyResponse.text();
        }
      } catch {
        // Silently fail - we'll still have the Gamma URL
      }
    }

    // Calculate duration
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Determine winner info
    const city1Score = Math.round(result.city1.totalConsensusScore);
    const city2Score = Math.round(result.city2.totalConsensusScore);
    const isCity1Winner = result.winner === 'city1';

    // Prepare report data
    const reportData: SaveReportData = {
      reportType: 'enhanced',
      city1Name: result.city1.city,
      city1Country: result.city1.country,
      city2Name: result.city2.city,
      city2Country: result.city2.country,
      winner: isCity1Winner ? result.city1.city : result.city2.city,
      winnerScore: isCity1Winner ? city1Score : city2Score,
      loserScore: isCity1Winner ? city2Score : city1Score,
      scoreDifference: Math.abs(result.scoreDifference || city1Score - city2Score),
      gammaDocId: response.generationId,
      gammaUrl: response.url,
      durationSeconds,
      pageCount: 82, // v4.0 enhanced reports are 82 pages
      confidence: result.llmConfidence || undefined,
    };

    // Save to storage (only if we got HTML)
    if (htmlContent) {
      const { data: savedReport, error: saveError } = await saveReport(
        user.id,
        reportData,
        htmlContent
      );

      if (saveError) {
        console.error('[GammaService] Failed to save report:', saveError);
        return {
          ...response,
          storageError: saveError.message
        };
      }

      console.log('[GammaService] Report saved to storage:', savedReport?.id);

      // Final progress update
      if (onProgress) {
        onProgress({
          status: 'completed',
          generationId: response.generationId,
          gammaUrl: response.url,
          pdfUrl: response.pdfUrl,
          progress: 100,
          statusMessage: 'Report saved to your library!',
        });
      }

      return {
        ...response,
        savedReport: savedReport || undefined
      };
    } else {
      // No HTML content - still save metadata without HTML
      console.warn('[GammaService] No HTML content to save, report metadata only');
      return {
        ...response,
        storageError: 'Could not fetch HTML content - report available via Gamma URL only'
      };
    }

  } catch (error) {
    console.error('[GammaService] Storage save failed:', error);
    return {
      ...response,
      storageError: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}
