/**
 * LIFE SCORE™ - Legal Independence & Freedom Evaluation
 * Core Type Definitions
 * 
 * John E. Desautels & Associates
 * © 2025 All Rights Reserved
 */

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export type CategoryId = 
  | 'personal_freedom'
  | 'housing_property'
  | 'business_work'
  | 'transportation'
  | 'policing_legal'
  | 'speech_lifestyle';

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  metricCount: number;
  weight: number; // Percentage weight in total score (all should sum to 100)
  icon: string;
}

// ============================================================================
// METRIC DEFINITIONS
// ============================================================================

export type ScoringDirection = 'higher_is_better' | 'lower_is_better';

export interface MetricDefinition {
  id: string;
  categoryId: CategoryId;
  name: string;
  shortName: string;
  description: string;
  weight: number; // Weight within category (0-10)
  scoringDirection: ScoringDirection;
  dataType: 'boolean' | 'numeric' | 'scale' | 'categorical';
  unit?: string;
  searchQueries: string[]; // Queries for web search verification
  scoringCriteria: ScoringCriteria;
}

export interface ScoringCriteria {
  type: 'boolean' | 'range' | 'scale' | 'categorical';
  // For boolean: true = max score, false = 0 (or inverse if lower_is_better)
  // For range: min/max values that map to 0-100
  // For scale: predefined levels
  // For categorical: predefined options with scores
  minValue?: number;
  maxValue?: number;
  levels?: ScaleLevel[];
  options?: CategoricalOption[];
}

export interface ScaleLevel {
  level: number;
  label: string;
  description: string;
  score: number; // 0-100
}

export interface CategoricalOption {
  value: string;
  label: string;
  score: number; // 0-100
}

// ============================================================================
// SCORE RESULTS
// ============================================================================

export interface MetricScore {
  metricId: string;
  rawValue: string | number | boolean | null;
  normalizedScore: number; // 0-100
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  source?: string;
  sourceUrl?: string;
  notes?: string;
  verifiedAt?: string;
}

export interface CategoryScore {
  categoryId: CategoryId;
  metrics: MetricScore[];
  averageScore: number; // 0-100
  weightedScore: number; // Contribution to total
  verifiedMetrics: number;
  totalMetrics: number;
}

export interface CityScore {
  city: string;
  country: string;
  region?: string;
  categories: CategoryScore[];
  totalScore: number; // 0-1000 scale (100 metrics * 10 max each)
  normalizedScore: number; // 0-100 percentage
  overallConfidence: 'high' | 'medium' | 'low';
  comparisonDate: string;
  dataFreshness: 'current' | 'recent' | 'outdated';
}

export interface ComparisonResult {
  city1: CityScore;
  city2: CityScore;
  winner: 'city1' | 'city2' | 'tie';
  scoreDifference: number;
  categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  comparisonId: string;
  generatedAt: string;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ComparisonRequest {
  city1: string;
  city2: string;
  includeDetailedBreakdown?: boolean;
}

export interface APIMetricResult {
  metricId: string;
  city1Value: string | number | boolean | null;
  city2Value: string | number | boolean | null;
  city1Score: number;
  city2Score: number;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  source?: string;
  explanation?: string;
}

export interface APIResponse {
  success: boolean;
  data?: ComparisonResult;
  error?: string;
  processingTime?: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ComparisonState {
  status: 'idle' | 'loading' | 'success' | 'error';
  progress?: {
    currentCategory: CategoryId;
    metricsProcessed: number;
    totalMetrics: number;
    currentMetric?: string;
  };
  result?: ComparisonResult;
  error?: string;
}

export interface CityInput {
  city: string;
  isValid: boolean;
  suggestions?: string[];
}
