/**
 * LIFE SCORE™ Results Components
 * Display comparison results between two cities
 */

import React, { useState, useEffect } from 'react';
import type { ComparisonResult, CategoryScore, CategoryId } from '../types/metrics';
import { CATEGORIES, getMetricsByCategory } from '../shared/metrics';
import { saveComparisonLocal, isComparisonSaved } from '../services/savedComparisons';
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

  return (
    <div className={`winner-hero ${isTie ? 'tie' : ''}`}>
      {!isTie ? (
        <>
          <div className="winner-trophy">🏆</div>
          <h2 className="winner-city">{winner.city}, {winner.country}</h2>
          <div className="winner-score">{Math.round(winner.totalScore)}</div>
          <p className="winner-label">LIFE SCORE™</p>
          <p className="winner-difference">
            {result.scoreDifference} points more freedom than {loser.city}, {loser.country}
          </p>
        </>
      ) : (
        <>
          <div className="winner-trophy">⚖️</div>
          <h2 className="winner-city">It's a Tie!</h2>
          <div className="winner-score">{Math.round(result.city1.totalScore)}</div>
          <p className="winner-label">Both cities scored equally</p>
        </>
      )}
      
      <div className="confidence-badge-hero">
        <span className={`confidence-badge confidence-${result.city1.overallConfidence}`}>
          Data Confidence: {result.city1.overallConfidence.toUpperCase()}
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

  return (
    <div className="score-grid card">
      <div className={`score-box ${city1Wins ? 'winner' : ''}`}>
        <h3>{result.city1.city}, {result.city1.country}</h3>
        <div className="score">{Math.round(result.city1.totalScore)}</div>
        <p className="score-label">Total LIFE SCORE™</p>
        <p className="score-normalized">{result.city1.normalizedScore}% of maximum</p>
      </div>
      
      <div className={`score-box ${city2Wins ? 'winner' : ''}`}>
        <h3>{result.city2.city}, {result.city2.country}</h3>
        <div className="score">{Math.round(result.city2.totalScore)}</div>
        <p className="score-label">Total LIFE SCORE™</p>
        <p className="score-normalized">{result.city2.normalizedScore}% of maximum</p>
      </div>
    </div>
  );
};

// ============================================================================
// CATEGORY BREAKDOWN
// ============================================================================

interface CategoryBreakdownProps {
  result: ComparisonResult;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ result }) => {
  const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>(null);

  const getCategoryScore = (cityScore: typeof result.city1, categoryId: CategoryId): CategoryScore | undefined => {
    return cityScore.categories.find(c => c.categoryId === categoryId);
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
          <div key={category.id} className="category">
            <button 
              className="category-header-btn"
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
            >
              <div className="category-header">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-weight">({category.weight}% weight)</span>
              </div>
              <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
            </button>
            
            <div className="category-bars">
              <div className="bar-container">
                <div className="bar-header">
                  <span className="bar-city">{result.city1.city}</span>
                  <span className={`bar-score ${city1Wins ? 'winning' : ''}`}>
                    {Math.round(city1Score)}%
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
              style={{ cursor: hasNotes ? 'pointer' : 'default' }}
            >
              <div className="metric-info">
                <span className="metric-name" title={metric.description}>
                  {metric.shortName}
                  {hasNotes && <span className="expand-indicator">{isExpanded ? ' ▼' : ' ▶'}</span>}
                </span>
                <span className="metric-weight">(wt: {metric.weight})</span>
              </div>

              <div className={`metric-score ${score1 > score2 ? 'winning' : ''}`}>
                {Math.round(score1)}
                {city1Score?.confidence && (
                  <span className={`confidence-dot confidence-${city1Score.confidence}`}
                        title={`Confidence: ${city1Score.confidence}`} />
                )}
              </div>

              <div className={`metric-score ${score2 > score1 ? 'winning' : ''}`}>
                {Math.round(score2)}
                {city2Score?.confidence && (
                  <span className={`confidence-dot confidence-${city2Score.confidence}`}
                        title={`Confidence: ${city2Score.confidence}`} />
                )}
              </div>
            </div>

            {isExpanded && hasNotes && (
              <div className="metric-reasoning" style={{
                backgroundColor: '#f8f9fa',
                padding: '12px 16px',
                marginTop: '4px',
                borderRadius: '6px',
                fontSize: '0.9em',
                lineHeight: '1.5',
                borderLeft: '3px solid #4a90d9'
              }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#333' }}>
                  LLM Analysis:
                </strong>
                <p style={{ margin: 0, color: '#555' }}>
                  {city1Score?.notes || city2Score?.notes}
                </p>
                {city1Score?.source && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.85em', color: '#777' }}>
                    Source: {city1Score.source}
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
          <p style={{ fontSize: '0.85em', color: '#666', marginTop: '8px' }}>
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
}

export const Results: React.FC<ResultsProps> = ({ result, onSaved }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(isComparisonSaved(result.comparisonId));
  }, [result.comparisonId]);

  const handleSave = () => {
    saveComparisonLocal(result);
    setIsSaved(true);
    setSaveMessage('Comparison saved!');
    setTimeout(() => setSaveMessage(null), 3000);
    onSaved?.();
  };

  return (
    <div className="results animate-slideUp">
      <WinnerHero result={result} />
      <ScoreGrid result={result} />
      <CategoryBreakdown result={result} />

      {/* Save Button */}
      <div className="save-comparison-bar">
        {saveMessage && (
          <span className="save-message">{saveMessage}</span>
        )}
        <button
          className={`btn save-btn ${isSaved ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : '💾 Save Comparison'}
        </button>
      </div>

      {result.warning && (
        <div className="results-warning card" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <strong style={{ color: '#856404' }}>Note:</strong>{' '}
          <span style={{ color: '#856404' }}>{result.warning}</span>
        </div>
      )}

      <div className="results-footer card">
        <h4>About This Analysis</h4>
        <p>
          This LIFE SCORE™ comparison analyzed <strong>100 legal freedom metrics</strong> across
          6 categories. Each metric was verified using real-time web search to ensure accuracy.
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
