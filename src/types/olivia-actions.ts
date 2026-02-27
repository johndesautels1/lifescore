/**
 * LIFE SCORE - Olivia AI Assistant Types: Quick Actions
 * Clues Intelligence LTD © 2025
 *
 * Predefined quick action buttons and default actions data
 */

// ============================================================================
// QUICK ACTIONS
// ============================================================================

/**
 * Predefined quick action button
 */
export interface OliviaQuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: 'overview' | 'metrics' | 'advice' | 'sources';
}

/**
 * Default quick actions for Olivia
 */
export const DEFAULT_QUICK_ACTIONS: OliviaQuickAction[] = [
  {
    id: 'explain_winner',
    label: 'Explain the Winner',
    icon: '🏆',
    prompt: 'Why did the winning city score higher? What are the key differences?',
    category: 'overview',
  },
  {
    id: 'biggest_differences',
    label: 'Biggest Differences',
    icon: '📊',
    prompt: 'What are the biggest scoring differences between these cities?',
    category: 'metrics',
  },
  {
    id: 'category_breakdown',
    label: 'Category Breakdown',
    icon: '📋',
    prompt: 'Give me a breakdown of how each category scored for both cities.',
    category: 'overview',
  },
  {
    id: 'personal_freedom',
    label: 'Personal Freedom',
    icon: '🗽',
    prompt: 'Compare the personal freedom and autonomy metrics. Which city is more permissive?',
    category: 'metrics',
  },
  {
    id: 'housing_property',
    label: 'Housing & Property',
    icon: '🏠',
    prompt: 'Compare housing and property rights. Which city has fewer restrictions?',
    category: 'metrics',
  },
  {
    id: 'business_taxes',
    label: 'Business & Taxes',
    icon: '💼',
    prompt: 'Compare business regulations and tax burden. Which city is better for entrepreneurs?',
    category: 'metrics',
  },
  {
    id: 'llm_disagreement',
    label: 'Where LLMs Disagreed',
    icon: '🤔',
    prompt: 'Which metrics had the most disagreement among the AI models? Why might that be?',
    category: 'metrics',
  },
  {
    id: 'best_for_priorities',
    label: 'Best for My Priorities',
    icon: '🎯',
    prompt: 'Based on someone who values personal freedom and low taxes, which city would you recommend?',
    category: 'advice',
  },
  {
    id: 'sources_evidence',
    label: 'Show Sources',
    icon: '📚',
    prompt: 'What sources were used to evaluate these cities? Can you cite specific evidence?',
    category: 'sources',
  },
  {
    id: 'gamma_report',
    label: 'About the Report',
    icon: '📑',
    prompt: 'Tell me about the visual report that was generated. What does it contain?',
    category: 'overview',
  },
];
