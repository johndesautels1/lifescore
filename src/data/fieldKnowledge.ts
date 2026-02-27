/**
 * LIFE SCORE - Field Knowledge Database for Olivia AI
 * Deep knowledge about each of the 100 LIFE SCORE metrics
 * Used to enhance Olivia's conversational ability
 *
 * This is the barrel file that re-exports all field knowledge from category files.
 */

export interface FieldKnowledge {
  talkingPoints: string[];
  keySourceTypes: string[];
  commonQuestions: string[];
  dailyLifeImpact?: string;
}

import { FIELD_KNOWLEDGE_PERSONAL_FREEDOM } from './fieldKnowledge-personal-freedom';
import { FIELD_KNOWLEDGE_HOUSING_PROPERTY } from './fieldKnowledge-housing-property';
import { FIELD_KNOWLEDGE_BUSINESS_WORK } from './fieldKnowledge-business-work';
import { FIELD_KNOWLEDGE_TRANSPORTATION } from './fieldKnowledge-transportation';
import { FIELD_KNOWLEDGE_POLICING_LEGAL } from './fieldKnowledge-policing-legal';
import { FIELD_KNOWLEDGE_SPEECH_LIFESTYLE } from './fieldKnowledge-speech-lifestyle';

export const FIELD_KNOWLEDGE: Record<string, FieldKnowledge> = {
  ...FIELD_KNOWLEDGE_PERSONAL_FREEDOM,
  ...FIELD_KNOWLEDGE_HOUSING_PROPERTY,
  ...FIELD_KNOWLEDGE_BUSINESS_WORK,
  ...FIELD_KNOWLEDGE_TRANSPORTATION,
  ...FIELD_KNOWLEDGE_POLICING_LEGAL,
  ...FIELD_KNOWLEDGE_SPEECH_LIFESTYLE,
};

/**
 * Get field knowledge for a metric ID
 */
export function getFieldKnowledge(metricId: string): FieldKnowledge | undefined {
  return FIELD_KNOWLEDGE[metricId];
}

/**
 * Get all field knowledge for a list of metric IDs
 */
export function getFieldKnowledgeForMetrics(metricIds: string[]): Record<string, FieldKnowledge> {
  const result: Record<string, FieldKnowledge> = {};
  for (const id of metricIds) {
    const knowledge = FIELD_KNOWLEDGE[id];
    if (knowledge) {
      result[id] = knowledge;
    }
  }
  return result;
}

/**
 * Get field knowledge for the most significant metrics in a comparison
 */
export function getRelevantFieldKnowledge(
  topMetricIds: string[],
  maxFields: number = 20
): Record<string, FieldKnowledge> {
  return getFieldKnowledgeForMetrics(topMetricIds.slice(0, maxFields));
}
