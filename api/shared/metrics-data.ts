/**
 * LIFE SCORE™ - Legal Independence & Freedom Evaluation
 * Complete 100 Metric Definitions
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 *
 * IMPORTANT: These metrics are carefully designed to measure LEGAL FREEDOM (written law)
 * AND LIVED FREEDOM (enforcement reality). Each metric has specific search queries for verification via Claude API + Web Search
 *
 * This is the barrel file that re-exports all metrics from their category files.
 */

import type { Category, CategoryId, MetricDefinition } from './types.js';

import { PERSONAL_FREEDOM_METRICS } from './metrics-data-personal-freedom.js';
import { HOUSING_PROPERTY_METRICS } from './metrics-data-housing-property.js';
import { BUSINESS_WORK_METRICS } from './metrics-data-business-work.js';
import { TRANSPORTATION_METRICS } from './metrics-data-transportation.js';
import { POLICING_LEGAL_METRICS } from './metrics-data-policing-legal.js';
import { SPEECH_LIFESTYLE_METRICS } from './metrics-data-speech-lifestyle.js';

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const CATEGORIES: Category[] = [
  {
    id: 'personal_freedom',
    name: 'Personal Autonomy',
    shortName: 'Personal Autonomy',
    description: 'Laws governing personal choices, bodily autonomy, and individual liberty',
    metricCount: 15,
    weight: 20,
    icon: '🗽'
  },
  {
    id: 'housing_property',
    name: 'Housing, Property & HOA Control',
    shortName: 'Housing & Property',
    description: 'Property rights, ownership restrictions, HOA regulations, and housing freedom',
    metricCount: 20,
    weight: 20,
    icon: '🏠'
  },
  {
    id: 'business_work',
    name: 'Business & Work Regulation',
    shortName: 'Business & Work',
    description: 'Employment laws, licensing requirements, business regulations, and economic freedom',
    metricCount: 25,
    weight: 20,
    icon: '💼'
  },
  {
    id: 'transportation',
    name: 'Transportation & Daily Movement',
    shortName: 'Transportation',
    description: 'Mobility freedom, car dependency, public transit, and movement restrictions',
    metricCount: 15,
    weight: 15,
    icon: '🚇'
  },
  {
    id: 'policing_legal',
    name: 'Policing, Courts & Enforcement',
    shortName: 'Legal System',
    description: 'Law enforcement practices, incarceration rates, legal costs, and justice system',
    metricCount: 15,
    weight: 15,
    icon: '⚖️'
  },
  {
    id: 'speech_lifestyle',
    name: 'Speech, Lifestyle & Culture',
    shortName: 'Speech & Lifestyle',
    description: 'Free expression, cultural norms, privacy rights, and lifestyle autonomy',
    metricCount: 10,
    weight: 10,
    icon: '🎭'
  }
];

export const CATEGORIES_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.id]: cat }),
  {} as Record<CategoryId, Category>
);

// ============================================================================
// COMBINED METRICS EXPORT
// ============================================================================

export const ALL_METRICS: MetricDefinition[] = [
  ...PERSONAL_FREEDOM_METRICS,
  ...HOUSING_PROPERTY_METRICS,
  ...BUSINESS_WORK_METRICS,
  ...TRANSPORTATION_METRICS,
  ...POLICING_LEGAL_METRICS,
  ...SPEECH_LIFESTYLE_METRICS
];

// Create a map for quick lookup
export const METRICS_MAP: Record<string, MetricDefinition> = ALL_METRICS.reduce(
  (acc, metric) => ({ ...acc, [metric.id]: metric }),
  {} as Record<string, MetricDefinition>
);

// Get metrics by category
export const getMetricsByCategory = (categoryId: CategoryId): MetricDefinition[] => {
  return ALL_METRICS.filter(m => m.categoryId === categoryId);
};

// Validation
export const validateMetricCounts = (): boolean => {
  const counts: Record<CategoryId, number> = {
    personal_freedom: 0,
    housing_property: 0,
    business_work: 0,
    transportation: 0,
    policing_legal: 0,
    speech_lifestyle: 0
  };

  ALL_METRICS.forEach(m => {
    counts[m.categoryId]++;
  });

  const expected: Record<CategoryId, number> = {
    personal_freedom: 15,
    housing_property: 20,
    business_work: 25,
    transportation: 15,
    policing_legal: 15,
    speech_lifestyle: 10
  };

  for (const cat of Object.keys(expected) as CategoryId[]) {
    if (counts[cat] !== expected[cat]) {
      console.error(`Category ${cat}: expected ${expected[cat]}, got ${counts[cat]}`);
      return false;
    }
  }

  return true;
};

// Confirm total
console.log(`Total LIFE SCORE metrics defined: ${ALL_METRICS.length}`);
