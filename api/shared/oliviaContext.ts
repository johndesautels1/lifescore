/**
 * LIFE SCORE - Olivia's view of a comparison, and its reader.
 *
 * /api/olivia/context builds it from a comparison and sends it to the browser;
 * the browser sends it back with each chat message, and /api/olivia/chat reads
 * it again here, field by field (./jsonRead.ts), because by then it is outside
 * input like any other.
 */

import { asRecord, finite, isRecord, text } from './jsonRead.js';

/** One city's headline numbers. */
export interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

/** One metric, both cities. */
export interface ContextMetric {
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

/** One category, both cities, with its three most different metrics. */
export interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: string;
  topMetrics: ContextMetric[];
}

/** The pages cited for one metric in one city. */
export interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

/** Where the models disagreed most (Enhanced). */
export interface ContextDisagreement {
  metricName: string;
  standardDeviation: number;
  explanation: string;
}

/** Everything Olivia is told about the comparison on screen. */
export interface LifeScoreContext {
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
    topDisagreements: ContextDisagreement[];
  };
  gammaReportUrl?: string;
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readCity(value: unknown): ContextCity {
  const r = asRecord(value);
  return {
    name: text(r.name) ?? '',
    country: text(r.country) ?? '',
    totalScore: finite(r.totalScore) ?? 0,
    normalizedScore: finite(r.normalizedScore) ?? 0,
  };
}

function readMetric(value: unknown): ContextMetric {
  const r = asRecord(value);
  const metric: ContextMetric = {
    id: text(r.id) ?? '',
    name: text(r.name) ?? '',
    city1Score: finite(r.city1Score) ?? 0,
    city2Score: finite(r.city2Score) ?? 0,
  };
  const consensusLevel = text(r.consensusLevel);
  const judgeExplanation = text(r.judgeExplanation);
  const legalScore = finite(r.legalScore);
  const enforcementScore = finite(r.enforcementScore);
  const diff = finite(r.diff);
  const category = text(r.category);
  if (consensusLevel !== undefined) metric.consensusLevel = consensusLevel;
  if (judgeExplanation !== undefined) metric.judgeExplanation = judgeExplanation;
  if (legalScore !== undefined) metric.legalScore = legalScore;
  if (enforcementScore !== undefined) metric.enforcementScore = enforcementScore;
  if (diff !== undefined) metric.diff = diff;
  if (category !== undefined) metric.category = category;
  return metric;
}

function readCategory(value: unknown): ContextCategory {
  const r = asRecord(value);
  return {
    id: text(r.id) ?? '',
    name: text(r.name) ?? '',
    city1Score: finite(r.city1Score) ?? 0,
    city2Score: finite(r.city2Score) ?? 0,
    winner: text(r.winner) ?? 'tie',
    topMetrics: list(r.topMetrics).map(readMetric),
  };
}

function readEvidence(value: unknown): ContextEvidence {
  const r = asRecord(value);
  return {
    metricId: text(r.metricId) ?? '',
    metricName: text(r.metricName) ?? '',
    city: text(r.city) ?? '',
    sources: list(r.sources).flatMap((entry) => {
      const s = asRecord(entry);
      const url = text(s.url);
      return url ? [{ url, title: text(s.title), snippet: text(s.snippet) }] : [];
    }),
  };
}

function readConsensus(value: unknown): LifeScoreContext['consensus'] {
  if (!isRecord(value)) return undefined;
  return {
    llmsUsed: list(value.llmsUsed).filter((model): model is string => typeof model === 'string'),
    judgeModel: text(value.judgeModel) ?? '',
    overallConfidence: text(value.overallConfidence) ?? '',
    disagreementSummary: text(value.disagreementSummary),
    topDisagreements: list(value.topDisagreements).map((entry) => {
      const d = asRecord(entry);
      return {
        metricName: text(d.metricName) ?? '',
        standardDeviation: finite(d.standardDeviation) ?? 0,
        explanation: text(d.explanation) ?? '',
      };
    }),
  };
}

/** Olivia's context as the browser sent it back, or null when it is not one. */
export function readLifeScoreContext(value: unknown): LifeScoreContext | null {
  if (!isRecord(value) || !isRecord(value.comparison)) return null;
  const comparison = value.comparison;
  const context: LifeScoreContext = {
    comparison: {
      city1: readCity(comparison.city1),
      city2: readCity(comparison.city2),
      winner: text(comparison.winner) ?? 'Tie',
      scoreDifference: finite(comparison.scoreDifference) ?? 0,
      generatedAt: text(comparison.generatedAt) ?? '',
      comparisonId: text(comparison.comparisonId) ?? '',
    },
    categories: list(value.categories).map(readCategory),
    topMetrics: list(value.topMetrics).map(readMetric),
    evidence: list(value.evidence).map(readEvidence),
  };
  const consensus = readConsensus(value.consensus);
  if (consensus) context.consensus = consensus;
  return context;
}
