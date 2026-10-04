/**
 * LIFE SCORE - a comparison that came from outside the server, read field by field.
 *
 * Olivia's context (api/olivia/context.ts) and the Judge's report
 * (api/judge-report.ts) read the comparison the browser sends; Olivia's source
 * lookup (api/shared/fieldEvidence.ts) reads the one the app saved. Each field
 * is checked for its type (./jsonRead.ts): a missing or malformed field is left
 * out instead of crashing the route or printing "undefined".
 *
 * A Standard comparison carries totalScore / averageScore / normalizedScore; an
 * Enhanced (multi-AI) one carries totalConsensusScore / averageConsensusScore /
 * consensusScore and lists its models in llmsUsed. Categories and metrics keep
 * their places in the lists, because the routes pair city 1's n-th metric with
 * city 2's.
 */

import { asRecord, finite, isRecord, text } from './jsonRead.js';

/** One cited page: a link, with its title, snippet and city when the model gave them. */
export interface InputSource {
  url: string;
  title?: string;
  snippet?: string;
  city?: string;
}

/** One model's reading of a metric (Enhanced). */
export interface InputLlmScore {
  /** Pages the model cited, with title and snippet. */
  evidence: InputSource[];
  /** Bare links. */
  sources: InputSource[];
}

/** One metric for one city. */
export interface InputMetric {
  metricId: string;
  /** Standard score (0-100). */
  normalizedScore?: number;
  /** Enhanced score: the models' consensus (0-100). */
  consensusScore?: number;
  legalScore?: number;
  enforcementScore?: number;
  confidenceLevel?: string;
  standardDeviation?: number;
  judgeExplanation?: string;
  llmScores: InputLlmScore[];
  /** Standard mode's links. */
  sources: InputSource[];
}

/** One category for one city. */
export interface InputCategory {
  categoryId: string;
  averageScore?: number;
  averageConsensusScore?: number;
  agreementLevel?: number;
  metrics: InputMetric[];
}

/** One city's side of the comparison. */
export interface InputCity {
  city: string;
  country: string;
  totalScore?: number;
  totalConsensusScore?: number;
  normalizedScore?: number;
  overallAgreement?: number;
  categories: InputCategory[];
}

/** The comparison, both kinds. */
export interface InputComparison {
  /** Enhanced (multi-AI): the result lists the models it used. */
  enhanced: boolean;
  city1: InputCity;
  city2: InputCity;
  winner: 'city1' | 'city2' | 'tie';
  scoreDifference: number;
  comparisonId?: string;
  generatedAt?: string;
  llmsUsed: string[];
  judgeModel?: string;
  overallConsensusConfidence?: string;
  disagreementSummary?: string;
  metricsEvaluated?: number;
  totalTimeMs?: number;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** A link given as a bare string or as { url, title?, snippet?, city? }; entries without a link are dropped. */
function readSources(value: unknown): InputSource[] {
  return list(value).flatMap((entry): InputSource[] => {
    if (typeof entry === 'string') return entry.length > 0 ? [{ url: entry }] : [];
    const r = asRecord(entry);
    const url = text(r.url);
    if (!url) return [];
    const source: InputSource = { url };
    const title = text(r.title);
    const snippet = text(r.snippet);
    const city = text(r.city);
    if (title) source.title = title;
    if (snippet) source.snippet = snippet;
    if (city) source.city = city;
    return [source];
  });
}

function readMetric(value: unknown): InputMetric {
  const r = asRecord(value);
  return {
    metricId: text(r.metricId) ?? '',
    normalizedScore: finite(r.normalizedScore),
    consensusScore: finite(r.consensusScore),
    legalScore: finite(r.legalScore),
    enforcementScore: finite(r.enforcementScore),
    confidenceLevel: text(r.confidenceLevel),
    standardDeviation: finite(r.standardDeviation),
    judgeExplanation: text(r.judgeExplanation),
    llmScores: list(r.llmScores).map((score) => {
      const s = asRecord(score);
      return { evidence: readSources(s.evidence), sources: readSources(s.sources) };
    }),
    sources: readSources(r.sources),
  };
}

function readCategory(value: unknown): InputCategory {
  const r = asRecord(value);
  return {
    categoryId: text(r.categoryId) ?? '',
    averageScore: finite(r.averageScore),
    averageConsensusScore: finite(r.averageConsensusScore),
    agreementLevel: finite(r.agreementLevel),
    metrics: list(r.metrics).map(readMetric),
  };
}

function readCity(value: unknown): InputCity | null {
  const r = asRecord(value);
  const city = text(r.city);
  if (!city) return null;
  return {
    city,
    country: text(r.country) ?? '',
    totalScore: finite(r.totalScore),
    totalConsensusScore: finite(r.totalConsensusScore),
    normalizedScore: finite(r.normalizedScore),
    overallAgreement: finite(r.overallAgreement),
    categories: list(r.categories).map(readCategory),
  };
}

/** The comparison, or null when it is not one (no object, or a city without a name). */
export function readComparison(value: unknown): InputComparison | null {
  if (!isRecord(value)) return null;
  const city1 = readCity(value.city1);
  const city2 = readCity(value.city2);
  if (!city1 || !city2) return null;
  const stats = asRecord(value.processingStats);
  return {
    enhanced: Array.isArray(value.llmsUsed),
    city1,
    city2,
    winner: value.winner === 'city1' ? 'city1' : value.winner === 'city2' ? 'city2' : 'tie',
    scoreDifference: finite(value.scoreDifference) ?? 0,
    comparisonId: text(value.comparisonId),
    generatedAt: text(value.generatedAt),
    llmsUsed: list(value.llmsUsed).filter((model): model is string => typeof model === 'string'),
    judgeModel: text(value.judgeModel),
    overallConsensusConfidence: text(value.overallConsensusConfidence),
    disagreementSummary: text(value.disagreementSummary),
    metricsEvaluated: finite(stats.metricsEvaluated),
    totalTimeMs: finite(stats.totalTimeMs),
  };
}

/** A city's total, Enhanced or Standard; 0 when neither is there. */
export function cityTotal(city: InputCity): number {
  return city.totalConsensusScore ?? city.totalScore ?? 0;
}

/** A metric's score, Enhanced or Standard; 0 when neither is there. */
export function metricScore(metric: InputMetric): number {
  return metric.consensusScore ?? metric.normalizedScore ?? 0;
}
