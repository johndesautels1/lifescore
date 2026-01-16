/**
 * LIFE SCORE™ Evidence Panel
 * Collapseable panel displaying GPT-5.2 web search citations
 */

import React, { useState } from 'react';
import type { EnhancedComparisonResult, EvidenceItem } from '../types/enhancedComparison';
import './EvidencePanel.css';

interface EvidencePanelProps {
  result: EnhancedComparisonResult | null;
  isVisible: boolean;
  onClose: () => void;
}

interface CollectedEvidence {
  metricId: string;
  metricName: string;
  city: string;
  evidence: EvidenceItem[];
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ result, isVisible, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterCity, setFilterCity] = useState<'all' | 'city1' | 'city2'>('all');

  if (!isVisible || !result) return null;

  // Collect all evidence from the result
  const collectEvidence = (): CollectedEvidence[] => {
    const collected: CollectedEvidence[] = [];

    // Collect from city1 categories
    result.city1.categories.forEach(category => {
      category.metrics.forEach(metric => {
        metric.llmScores?.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            collected.push({
              metricId: metric.metricId,
              metricName: metric.metricId, // Will be improved with actual names
              city: result.city1.city,
              evidence: score.evidence
            });
          }
        });
      });
    });

    // Collect from city2 categories
    result.city2.categories.forEach(category => {
      category.metrics.forEach(metric => {
        metric.llmScores?.forEach(score => {
          if (score.evidence && score.evidence.length > 0) {
            collected.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: result.city2.city,
              evidence: score.evidence
            });
          }
        });
      });
    });

    return collected;
  };

  const allEvidence = collectEvidence();

  // Filter by city if selected
  const filteredEvidence = filterCity === 'all'
    ? allEvidence
    : allEvidence.filter(e =>
        (filterCity === 'city1' && e.city === result.city1.city) ||
        (filterCity === 'city2' && e.city === result.city2.city)
      );

  // Get unique URLs for the summary
  const uniqueUrls = new Set<string>();
  allEvidence.forEach(e => e.evidence.forEach(ev => uniqueUrls.add(ev.url)));

  return (
    <div className={`evidence-panel-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header - Always visible */}
      <div className="evidence-panel-header">
        <button
          className="evidence-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="evidence-icon">📚</span>
          <span className="evidence-title">
            Evidence & Citations
            <span className="evidence-count">({uniqueUrls.size} sources)</span>
          </span>
          <span className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}>▲</span>
        </button>
        <button className="evidence-close-btn" onClick={onClose} title="Close panel">
          ✕
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
                Evidence will appear here after GPT-5.2 evaluations complete with web search results.
              </p>
            </div>
          )}

          {/* Summary footer */}
          <div className="evidence-summary">
            <span className="summary-text">
              GPT-5.2 with built-in web search provides real-time citations for all evaluations.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
