/**
 * LIFE SCORE - Freedom Education Utilities
 *
 * Data transformation and helper functions for the
 * Freedom Education tabs in Court Order.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import {
  CategoryId,
  FreedomEducationData,
  CategoryFreedomData,
  FreedomExample,
  FREEDOM_CATEGORIES,
} from '../types/freedomEducation';

// ============================================================================
// DATA EXTRACTION
// ============================================================================

/**
 * Find the first category with winning metrics
 * Used to set initial active tab
 */
export function getFirstNonEmptyCategory(
  categories: CategoryFreedomData[]
): CategoryId | null {
  for (const cat of FREEDOM_CATEGORIES) {
    const categoryData = categories.find(c => c.categoryId === cat.id);
    if (categoryData && categoryData.winningMetrics.length > 0) {
      return cat.id;
    }
  }
  return null;
}

/**
 * Get category data by ID
 */
export function getCategoryData(
  categories: CategoryFreedomData[],
  categoryId: CategoryId
): CategoryFreedomData | null {
  return categories.find(c => c.categoryId === categoryId) || null;
}

/**
 * Count total winning metrics across all categories
 */
export function getTotalWinningMetrics(
  categories: CategoryFreedomData[]
): number {
  return categories.reduce(
    (sum, cat) => sum + (cat.winningMetrics?.length || 0),
    0
  );
}

/**
 * Get categories with at least one winning metric
 */
export function getCategoriesWithMetrics(
  categories: CategoryFreedomData[]
): CategoryFreedomData[] {
  return categories.filter(c => c.winningMetrics && c.winningMetrics.length > 0);
}

// ============================================================================
// METRIC HELPERS
// ============================================================================

/**
 * Get the category icon for a given category ID
 */
export function getCategoryIcon(categoryId: CategoryId): string {
  const category = FREEDOM_CATEGORIES.find(c => c.id === categoryId);
  return category?.icon || '📊';
}

/**
 * Get the category name for a given category ID
 */
export function getCategoryName(categoryId: CategoryId): string {
  const category = FREEDOM_CATEGORIES.find(c => c.id === categoryId);
  return category?.name || 'Unknown Category';
}

/**
 * Calculate average score advantage for a category
 */
export function getAverageAdvantage(metrics: FreedomExample[]): number {
  if (!metrics || metrics.length === 0) return 0;
  const totalAdvantage = metrics.reduce(
    (sum, m) => sum + (m.winnerScore - m.loserScore),
    0
  );
  return totalAdvantage / metrics.length;
}

/**
 * Get the biggest advantage metric in a category
 */
export function getBiggestAdvantage(
  metrics: FreedomExample[]
): FreedomExample | null {
  if (!metrics || metrics.length === 0) return null;
  return metrics.reduce((best, current) => {
    const bestDiff = best.winnerScore - best.loserScore;
    const currentDiff = current.winnerScore - current.loserScore;
    return currentDiff > bestDiff ? current : best;
  });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if freedom education data is valid and non-empty
 */
export function isValidFreedomData(
  data: FreedomEducationData | null | undefined
): boolean {
  if (!data || !data.categories) return false;
  return data.categories.some(c => c.winningMetrics && c.winningMetrics.length > 0);
}

/**
 * Create empty freedom education structure
 * Used as fallback when API doesn't return data
 */
export function createEmptyFreedomData(
  winnerCity: string,
  loserCity: string
): FreedomEducationData {
  return {
    categories: FREEDOM_CATEGORIES.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      winningMetrics: [],
      heroStatement: '',
    })),
    winnerCity,
    loserCity,
    generatedAt: new Date().toISOString(),
  };
}
