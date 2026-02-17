/**
 * LIFE SCORE™ Evidence Panel
 * Collapseable panel displaying LLM web search citations
 * Works with both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 */

import React, { useState, useMemo, useCallback, startTransition } from 'react';
import type { EnhancedComparisonResult, EvidenceItem } from '../types/enhancedComparison';
import { LLM_CONFIGS } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import './EvidencePanel.css';

// Union type to accept both simple and enhanced results
type ResultType = EnhancedComparisonResult | ComparisonResult | null;

interface EvidencePanelProps {
  result: ResultType;
}

interface CollectedEvidence {
  metricId: string;
  metricName: string;
  city: string;
  provider?: string;  // Which LLM found this evidence (B3 fix)
  evidence: EvidenceItem[];
}

// Type guard to check if result is EnhancedComparisonResult
function isEnhancedResult(result: ResultType): result is EnhancedComparisonResult {
  if (!result) return false;
  // Enhanced results have llmsUsed array
  return 'llmsUsed' in result;
}

// Helper to extract domain name from URL for display
function extractDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url.slice(0, 50);
  }
}

// Collect all evidence from the result (handles both simple and enhanced)
function collectEvidenceFromResult(result: NonNullable<ResultType>): CollectedEvidence[] {
  const collected: CollectedEvidence[] = [];

  if (isEnhancedResult(result)) {
    // ENHANCED MODE: Collect from llmScores[].evidence[] with LLM attribution (B3 fix)
    result.city1.categories.forEach(category => {
      category.metrics.forEach(metric => {
        metric.llmScores?.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            collected.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: result.city1.city,
              provider: LLM_CONFIGS[score.llmProvider]?.shortName || 'AI',
              evidence: score.evidence
            });
          }
        });
      });
    });

    result.city2.categories.forEach(category => {
      category.metrics.forEach(metric => {
        metric.llmScores?.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            collected.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: result.city2.city,
              provider: LLM_CONFIGS[score.llmProvider]?.shortName || 'AI',
              evidence: score.evidence
            });
          }
        });
      });
    });
  } else {
    // SIMPLE MODE: Collect from metric.sources[] (URL strings)
    const now = new Date().toISOString();

    // City 1
    result.city1.categories.forEach(category => {
      category.metrics.forEach(metric => {
        if (metric.sources && metric.sources.length > 0) {
          const evidence: EvidenceItem[] = metric.sources.map(url => ({
            city: result.city1.city,
            title: extractDomainFromUrl(url),
            url: url,
            snippet: '',
            retrieved_at: now
          }));
          collected.push({
            metricId: metric.metricId,
            metricName: metric.metricId,
            city: result.city1.city,
            evidence
          });
        }
      });
    });

    // City 2
    result.city2.categories.forEach(category => {
      category.metrics.forEach(metric => {
        if (metric.sources && metric.sources.length > 0) {
          const evidence: EvidenceItem[] = metric.sources.map(url => ({
            city: result.city2.city,
            title: extractDomainFromUrl(url),
            url: url,
            snippet: '',
            retrieved_at: now
          }));
          collected.push({
            metricId: metric.metricId,
            metricName: metric.metricId,
            city: result.city2.city,
            evidence
          });
        }
      });
    });
  }

  return collected;
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ result }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const [filterCity, setFilterCity] = useState<'all' | 'city1' | 'city2'>('all');

  // ALL hooks must be called before any conditional return (React Rules of Hooks)
  // Memoize evidence collection to avoid recalculating on every render
  const allEvidence = useMemo(() => result ? collectEvidenceFromResult(result) : [], [result]);

  // Filter by city if selected
  const filteredEvidence = useMemo(() => {
    if (!result) return [];
    return filterCity === 'all'
      ? allEvidence
      : allEvidence.filter(e =>
          (filterCity === 'city1' && e.city === result.city1.city) ||
          (filterCity === 'city2' && e.city === result.city2.city)
        );
  }, [allEvidence, filterCity, result]);

  // Memoize unique URLs for the summary
  const uniqueUrls = useMemo(() => {
    const urls = new Set<string>();
    allEvidence.forEach(e => e.evidence.forEach(ev => urls.add(ev.url)));
    return urls;
  }, [allEvidence]);

  // Use startTransition for non-blocking collapse toggle (fixes INP issue)
  const handleToggle = useCallback(() => {
    startTransition(() => {
      setIsCollapsed(prev => !prev);
    });
  }, []);

  // Early return AFTER all hooks
  if (!result) return null;

  return (
    <div className={`evidence-panel-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header - Always visible, click to expand/collapse */}
      <div className="evidence-panel-header">
        <button
          className="evidence-toggle-btn"
          onClick={handleToggle}
        >
          <span className="evidence-icon">📚</span>
          <span className="evidence-title">
            Evidence & Citations
            <span className="evidence-count">({uniqueUrls.size} sources)</span>
          </span>
          <span className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}>▼</span>
        </button>
      </div>

      {/* Content - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="evidence-panel-content">
          {/* Filter buttons */}
          <div className="evidence-filters">
            <span className="filter-label">Filter by city:</span>
            <button
              className={`filter-btn ${filterCity === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCity('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterCity === 'city1' ? 'active' : ''}`}
              onClick={() => setFilterCity('city1')}
            >
              {result.city1.city}
            </button>
            <button
              className={`filter-btn ${filterCity === 'city2' ? 'active' : ''}`}
              onClick={() => setFilterCity('city2')}
            >
              {result.city2.city}
            </button>
          </div>

          {/* Evidence list */}
          {filteredEvidence.length > 0 ? (
            <div className="evidence-list">
              {filteredEvidence.map((item, index) => (
                <div key={`${item.metricId}-${item.city}-${index}`} className="evidence-group">
                  <div className="evidence-group-header">
                    <span className="evidence-metric">{item.metricName}</span>
                    <span className="evidence-city">{item.city}</span>
                    {item.provider && <span className="source-llm-badge">{item.provider}</span>}
                  </div>
                  <ul className="evidence-urls">
                    {item.evidence.map((ev, evIndex) => (
                      <li key={evIndex} className="evidence-item">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-link"
                        >
                          <span className="link-icon">🔗</span>
                          <span className="link-title">{ev.title}</span>
                        </a>
                        {ev.snippet && (
                          <p className="evidence-snippet">{ev.snippet}</p>
                        )}
                        {ev.retrieved_at && (
                          <span className="evidence-date">
                            Retrieved: {new Date(ev.retrieved_at).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-evidence">
              <p>No evidence citations available yet.</p>
              <p className="no-evidence-hint">
                Evidence will appear here after LLM evaluations complete with web search results.
              </p>
            </div>
          )}

          {/* Summary footer */}
          <div className="evidence-summary">
            <span className="summary-text">
              LLM with built-in web search provides real-time citations for all evaluations.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
