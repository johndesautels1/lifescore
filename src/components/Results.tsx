/**
 * LIFE SCORE™ Results Components
 * Display comparison results between two cities
 */

import React, { useState, useEffect } from 'react';
import type { ComparisonResult, CategoryScore, CategoryId } from '../types/metrics';
import { CATEGORIES, getMetricsByCategory } from '../shared/metrics';
import { saveComparisonLocal, isComparisonSaved } from '../services/savedComparisons';
import EvidencePanel from './EvidencePanel';
import './Results.css';

// ============================================================================
// WINNER HERO
// ============================================================================

interface WinnerHeroProps {
  result: ComparisonResult;
}

export const WinnerHero: React.FC<WinnerHeroProps> = ({ result }) => {
  const winner = result.winner === 'city1' ? result.city1 : result.city2;
  const loser = result.winner === 'city1' ? result.city2 : result.city1;

  const isTie = result.winner === 'tie';

  // Handle both standard (totalScore) and enhanced (totalConsensusScore) comparisons
  const getScore = (city: any) => city.totalScore ?? city.totalConsensusScore ?? 0;
  const confidence = (result.city1 as any).overallConfidence || (result as any).overallConsensusConfidence || 'medium';

  return (
    <div className={`winner-hero ${isTie ? 'tie' : ''}`} aria-live="polite" aria-atomic="true">
      {!isTie ? (
        <>
          <div className="winner-trophy" aria-hidden="true">🏆</div>
          <h2 className="winner-city">{winner.city}, {winner.country}</h2>
          <div className="winner-score">{Math.round(getScore(winner))}</div>
          <p className="winner-label">LIFE SCORE™ — Winner</p>
          <p className="winner-difference">
            {result.scoreDifference} points more freedom than {loser.city}, {loser.country}
          </p>
        </>
      ) : (
        <>
          <div className="winner-trophy" aria-hidden="true">⚖️</div>
          <h2 className="winner-city">It's a Tie!</h2>
          <div className="winner-score">{Math.round(getScore(result.city1))}</div>
          <p className="winner-label">Both cities scored equally</p>
        </>
      )}

      <div className="confidence-badge-hero">
        <span className={`confidence-badge confidence-${confidence}`}>
          Data Confidence: {confidence.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// SCORE GRID
// ============================================================================

interface ScoreGridProps {
  result: ComparisonResult;
}

export const ScoreGrid: React.FC<ScoreGridProps> = ({ result }) => {
  const city1Wins = result.winner === 'city1';
  const city2Wins = result.winner === 'city2';

  // Handle both standard (totalScore) and enhanced (totalConsensusScore) comparisons
  const getScore = (city: any) => city.totalScore ?? city.totalConsensusScore ?? 0;

  return (
    <div className="score-grid card">
      <div className={`score-box ${city1Wins ? 'winner' : ''}`}>
        <h3>{result.city1.city}{result.city1.region ? `, ${result.city1.region}` : ''}, {result.city1.country}</h3>
        <div className="score">{Math.round(getScore(result.city1))}</div>
        <p className="score-label">Total LIFE SCORE™</p>
      </div>

      <div className={`score-box ${city2Wins ? 'winner' : ''}`}>
        <h3>{result.city2.city}{result.city2.region ? `, ${result.city2.region}` : ''}, {result.city2.country}</h3>
        <div className="score">{Math.round(getScore(result.city2))}</div>
        <p className="score-label">Total LIFE SCORE™</p>
      </div>
    </div>
  );
};

// ============================================================================
// CATEGORY BREAKDOWN
// ============================================================================

interface CategoryBreakdownProps {
  result: ComparisonResult;
  customWeights?: Record<string, number> | null;  // User's persona weights
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ result, customWeights }) => {
  const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>(null);

  const getCategoryScore = (cityScore: typeof result.city1, categoryId: CategoryId): CategoryScore | undefined => {
    return cityScore.categories.find(c => c.categoryId === categoryId);
  };

  // Handle category click with scroll to top of section
  const handleCategoryClick = (categoryId: CategoryId, isCurrentlyExpanded: boolean) => {
    const newExpanded = isCurrentlyExpanded ? null : categoryId;
    setExpandedCategory(newExpanded);

    // Scroll to top of the clicked section when expanding
    if (newExpanded) {
      setTimeout(() => {
        const el = document.getElementById(`category-section-${categoryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50); // Small delay to allow DOM to update
    }
  };

  return (
    <div className="category-breakdown card">
      <h3 className="section-title">Category Breakdown</h3>
      <p className="breakdown-subtitle">Click any category to see detailed metric scores</p>

      {CATEGORIES.map((category) => {
        const city1Cat = getCategoryScore(result.city1, category.id);
        const city2Cat = getCategoryScore(result.city2, category.id);

        const city1Score = city1Cat?.averageScore ?? 0;
        const city2Score = city2Cat?.averageScore ?? 0;

        const city1Wins = city1Score > city2Score;
        const city2Wins = city2Score > city1Score;

        const isExpanded = expandedCategory === category.id;

        return (
          <div key={category.id} id={`category-section-${category.id}`} className="category">
            <button
              className="category-header-btn"
              onClick={() => handleCategoryClick(category.id, isExpanded)}
            >
              <div className="category-header">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-weight">({customWeights?.[category.id] ?? category.weight}% weight)</span>
              </div>
              <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
            </button>
            
            <div className="category-bars">
              <div className="bar-container">
                <div className="bar-header">
                  <span className="bar-city">{result.city1.city}</span>
                  <span className={`bar-score ${city1Wins ? 'winning' : ''}`}>
                    {Math.round(city1Score)}%
                    {city1Wins && <span className="winner-indicator" aria-label="Winner"> ✓</span>}
                  </span>
                </div>
                <div className="bar-bg">
                  <div
                    className={`bar-fill city1 ${city1Wins ? 'winning' : ''}`}
                    style={{ width: `${city1Score}%` }}
                  />
                </div>
              </div>

              <div className="bar-container">
                <div className="bar-header">
                  <span className="bar-city">{result.city2.city}</span>
                  <span className={`bar-score ${city2Wins ? 'winning' : ''}`}>
                    {Math.round(city2Score)}%
                    {city2Wins && <span className="winner-indicator" aria-label="Winner"> ✓</span>}
                  </span>
                </div>
                <div className="bar-bg">
                  <div
                    className={`bar-fill city2 ${city2Wins ? 'winning' : ''}`}
                    style={{ width: `${city2Score}%` }}
                  />
                </div>
              </div>
            </div>
            
            {isExpanded && (!city1Cat || !city2Cat) && (
              <div className="metric-details-missing">
                <span className="missing-icon" aria-hidden="true">⚠️</span>
                <span className="missing-text">
                  <strong>Partial Data:</strong> {!city1Cat && !city2Cat ? 'Both cities' : !city1Cat ? result.city1.city : result.city2.city}
                  {' '}missing data for {category.name}. The LLM may have failed to return this category.
                </span>
              </div>
            )}
            {isExpanded && city1Cat && city2Cat && (
              <MetricDetails
                category={category}
                city1Metrics={city1Cat}
                city2Metrics={city2Cat}
                city1Name={result.city1.city}
                city2Name={result.city2.city}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// METRIC DETAILS (Expanded View)
// ============================================================================

interface MetricDetailsProps {
  category: typeof CATEGORIES[0];
  city1Metrics: CategoryScore;
  city2Metrics: CategoryScore;
  city1Name: string;
  city2Name: string;
}

const MetricDetails: React.FC<MetricDetailsProps> = ({
  category,
  city1Metrics,
  city2Metrics,
  city1Name,
  city2Name
}) => {
  const categoryMetrics = getMetricsByCategory(category.id);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  return (
    <div className="metric-details">
      <div className="metric-details-header">
        <span></span>
        <span className="metric-header-city">{city1Name}</span>
        <span className="metric-header-city">{city2Name}</span>
      </div>

      {categoryMetrics.map((metric) => {
        const city1Score = city1Metrics.metrics.find(m => m.metricId === metric.id);
        const city2Score = city2Metrics.metrics.find(m => m.metricId === metric.id);

        const score1 = city1Score?.normalizedScore ?? 0;
        const score2 = city2Score?.normalizedScore ?? 0;
        const isExpanded = expandedMetric === metric.id;
        const hasNotes = city1Score?.notes || city2Score?.notes;

        return (
          <div key={metric.id} className="metric-row-container">
            <div
              className={`metric-row ${hasNotes ? 'clickable' : ''}`}
              onClick={() => hasNotes && setExpandedMetric(isExpanded ? null : metric.id)}
            >
              <div className="metric-info">
                <span className="metric-name" title={metric.description}>
                  {metric.shortName}
                  {hasNotes && <span className="expand-indicator">{isExpanded ? ' ▼' : ' ▶'}</span>}
                </span>
                <span className="metric-weight">(wt: {metric.weight})</span>
              </div>

              <div className={`metric-score ${score1 > score2 ? 'winning' : ''}`}>
                <span className="mobile-city-label">{city1Name}:</span>
                {Math.round(score1)}
                {city1Score?.confidence && (
                  <span className={`confidence-dot confidence-${city1Score.confidence}`}
                        title={`Confidence: ${city1Score.confidence}`} />
                )}
              </div>

              <div className={`metric-score ${score2 > score1 ? 'winning' : ''}`}>
                <span className="mobile-city-label">{city2Name}:</span>
                {Math.round(score2)}
                {city2Score?.confidence && (
                  <span className={`confidence-dot confidence-${city2Score.confidence}`}
                        title={`Confidence: ${city2Score.confidence}`} />
                )}
              </div>
            </div>

            {isExpanded && hasNotes && (
              <div className="metric-reasoning">
                <strong className="reasoning-title">
                  LLM Analysis:
                </strong>
                <p className="reasoning-text">
                  {city1Score?.notes || city2Score?.notes}
                </p>
                {city1Score?.source && (
                  <p className="reasoning-source">
                    Source: {city1Score.sourceUrl ? (
                      <a
                        href={city1Score.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {city1Score.source}
                      </a>
                    ) : city1Score.source}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="metric-details-footer">
        <div className="confidence-legend">
          <span>Confidence:</span>
          <span className="confidence-dot confidence-high" /> High
          <span className="confidence-dot confidence-medium" /> Medium
          <span className="confidence-dot confidence-low" /> Low
        </div>
        {categoryMetrics.some(m => {
          const s1 = city1Metrics.metrics.find(x => x.metricId === m.id);
          const s2 = city2Metrics.metrics.find(x => x.metricId === m.id);
          return s1?.notes || s2?.notes;
        }) && (
          <p className="metric-click-hint">
            Click any metric with ▶ to see detailed LLM analysis
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FULL RESULTS COMPONENT
// ============================================================================

interface ResultsProps {
  result: ComparisonResult;
  onSaved?: () => void;
  customWeights?: Record<string, number> | null;  // User's persona weights (Digital Nomad, etc.)
}

export const Results: React.FC<ResultsProps> = ({ result, onSaved, customWeights }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isComparisonSaved(result.comparisonId));
  }, [result.comparisonId]);

  // FIXED 2026-01-25: Added loading state for better UX feedback
  const handleSave = async () => {
    if (isSaving || isSaved) return; // Prevent double-clicks

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveComparisonLocal(result);
      setIsSaved(true);
      setSaveMessage('✓ Saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
      onSaved?.();
    } catch (error) {
      console.error('Failed to save comparison:', error);
      setSaveMessage('Save failed - try again');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="results animate-slideUp">
      {/* FIX 2026-02-08: Clear report type badge in header */}
      <div className="report-type-header">
        <span className="report-type-badge standard">
          <span className="badge-icon">📊</span>
          <span className="badge-text">Standard Report</span>
        </span>
      </div>
      <WinnerHero result={result} />
      <ScoreGrid result={result} />
      <CategoryBreakdown result={result} customWeights={customWeights} />

      {/* Save Button - FIXED 2026-01-25: Added loading state */}
      <div className="save-comparison-bar">
        {saveMessage && (
          <span className={`save-message ${saveMessage.includes('failed') ? 'error' : 'success'}`}>
            {saveMessage}
          </span>
        )}
        <button
          className={`btn save-btn ${isSaved ? 'saved' : ''} ${isSaving ? 'saving' : ''}`}
          onClick={handleSave}
          disabled={isSaved || isSaving}
        >
          {isSaving ? '⏳ Saving...' : isSaved ? '✓ Saved' : '💾 Save Comparison'}
        </button>
      </div>

      {result.warning && (
        <div className="results-warning card">
          <strong>Note:</strong>{' '}
          <span>{result.warning}</span>
        </div>
      )}

      {/* Evidence & Citations Panel */}
      <EvidencePanel result={result} />

      <div className="results-footer card">
        <h4>About This Analysis</h4>
        <p>
          This LIFE SCORE™ comparison analyzed <strong>100 freedom metrics</strong> across
          6 categories, measuring both <strong>legal freedom</strong> (written law) and <strong>lived freedom</strong> (enforcement reality). Each metric was verified using real-time web search to ensure accuracy.
        </p>
        <p>
          <strong>Generated:</strong> {new Date(result.generatedAt).toLocaleString()}
          <br />
          <strong>Comparison ID:</strong> {result.comparisonId}
        </p>
        <p className="disclaimer">
          This analysis is for informational purposes only and should not be considered legal advice.
          Consult with local experts before making relocation decisions.
        </p>
      </div>
    </div>
  );
};

export default Results;
