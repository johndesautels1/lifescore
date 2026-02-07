/**
 * LIFE SCORE - Score Methodology Explainer
 *
 * Premium glass-morphic card that explains the complete scoring pipeline:
 * AI Evaluation -> Consensus Building -> Opus Judge -> Category Weighting -> Final Score
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import React, { useState } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import './ScoreMethodology.css';

// ============================================================================
// CATEGORY WEIGHT DATA
// ============================================================================

const CATEGORY_WEIGHTS = [
  { id: 'personal_freedom', label: 'Personal Freedom', weight: 20, color: '#3B82F6' },
  { id: 'housing_property', label: 'Housing & Property', weight: 20, color: '#10B981' },
  { id: 'business_work', label: 'Business & Work', weight: 20, color: '#F59E0B' },
  { id: 'transportation', label: 'Transportation', weight: 15, color: '#8B5CF6' },
  { id: 'policing_legal', label: 'Policing & Legal', weight: 15, color: '#EF4444' },
  { id: 'speech_lifestyle', label: 'Speech & Lifestyle', weight: 10, color: '#EC4899' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface ScoreMethodologyProps {
  result: EnhancedComparisonResult;
}

const ScoreMethodology: React.FC<ScoreMethodologyProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic data from the actual result
  const llmCount = result.llmsUsed?.length || 1;
  const llmNames = result.llmsUsed?.join(', ') || 'AI Evaluator';
  const overallAgreement = result.city1.overallAgreement ?? result.city2.overallAgreement ?? 0;
  const metricsEvaluated = result.processingStats?.metricsEvaluated || 100;
  const confidenceLevel = result.overallConsensusConfidence || 'medium';

  return (
    <div className="score-methodology">
      {/* Toggle Header */}
      <button
        className="methodology-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="methodology-toggle-left">
          <span className="methodology-icon">&#x2699;&#xFE0F;</span>
          <div>
            <h3 className="methodology-title">How Your LIFE SCORE Is Calculated</h3>
            <p className="methodology-subtitle">
              {llmCount} AI model{llmCount > 1 ? 's' : ''} &middot; {metricsEvaluated} metrics &middot; {overallAgreement}% {llmCount > 1 ? 'agreement' : 'confidence'}
            </p>
          </div>
        </div>
        <span className={`methodology-arrow ${isExpanded ? 'expanded' : ''}`}>&#x25BC;</span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="methodology-body">

          {/* ── STAGE 1: AI EVALUATION ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">1</span>
              <div>
                <h4 className="stage-title">AI Evaluation</h4>
                <p className="stage-label">Independent Multi-Model Analysis</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                Your comparison was evaluated by <strong>{llmCount} independent AI model{llmCount > 1 ? 's' : ''}</strong> ({llmNames}).
                Each model independently analyzed <strong>{metricsEvaluated} freedom metrics</strong> across
                every category of daily life. For every metric, each AI produces two separate scores on
                a 0-100 scale:
              </p>
              <div className="dual-score-visual">
                <div className="score-dimension">
                  <span className="dimension-badge legal">LAW</span>
                  <span className="dimension-label">Legal Score (0-100)</span>
                  <span className="dimension-desc">What the written law technically permits or restricts</span>
                </div>
                <div className="score-dimension">
                  <span className="dimension-badge enforcement">REALITY</span>
                  <span className="dimension-label">Enforcement Score (0-100)</span>
                  <span className="dimension-desc">How rules are actually enforced on the ground day-to-day</span>
                </div>
              </div>
              <p>
                These two dimensions are averaged to produce each metric's <strong>combined freedom score</strong>.
                Every AI also assigns a <strong>confidence level</strong> (high, medium, or low) based on the
                quality and consistency of the evidence it found, which directly affects how much weight
                that score carries in the next stage.
              </p>
            </div>
          </div>

          <div className="stage-divider" />

          {/* ── STAGE 2: CONSENSUS ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">2</span>
              <div>
                <h4 className="stage-title">Confidence-Weighted Consensus</h4>
                <p className="stage-label">Statistical Aggregation Across Models</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                {llmCount > 1
                  ? `When multiple AI models score the same metric, their scores aren't simply averaged.
                     Instead, LIFE SCORE uses a confidence-weighted consensus algorithm that gives
                     more influence to models that are more certain about their evaluation:`
                  : `When a single AI model evaluates metrics, its confidence level determines the
                     reliability weight assigned to each score:`
                }
              </p>
              <div className="weight-table">
                <div className="weight-row">
                  <span className="weight-confidence high">HIGH</span>
                  <div className="weight-bar-track">
                    <div className="weight-bar-fill" style={{ width: '100%' }} />
                  </div>
                  <span className="weight-value">1.0x weight</span>
                </div>
                <div className="weight-row">
                  <span className="weight-confidence medium">MEDIUM</span>
                  <div className="weight-bar-track">
                    <div className="weight-bar-fill" style={{ width: '70%' }} />
                  </div>
                  <span className="weight-value">0.7x weight</span>
                </div>
                <div className="weight-row">
                  <span className="weight-confidence low">LOW</span>
                  <div className="weight-bar-track">
                    <div className="weight-bar-fill" style={{ width: '40%' }} />
                  </div>
                  <span className="weight-value">0.4x weight</span>
                </div>
              </div>
              <div className="formula-block">
                <span className="formula-label">Consensus Formula</span>
                <code>Consensus = &Sigma;(score &times; confidence_weight) / &Sigma;(confidence_weights)</code>
              </div>
              <p>
                {llmCount > 1 ? (
                  <>The system also calculates the <strong>standard deviation</strong> (&sigma;) across all AI scores
                  for each metric to measure how much the models agree or disagree.
                  Your comparison achieved <strong>{overallAgreement}% overall agreement</strong> across
                  all evaluated metrics &mdash; classified
                  as <strong className={`confidence-inline ${confidenceLevel}`}>{confidenceLevel.toUpperCase()}</strong> confidence.</>
                ) : (
                  <>Your comparison was evaluated with <strong>{overallAgreement}% confidence</strong> across
                  all metrics &mdash; classified
                  as <strong className={`confidence-inline ${confidenceLevel}`}>{confidenceLevel.toUpperCase()}</strong>.</>
                )}
              </p>
            </div>
          </div>

          <div className="stage-divider" />

          {/* ── STAGE 3: OPUS JUDGE ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">3</span>
              <div>
                <h4 className="stage-title">The Opus Judge</h4>
                <p className="stage-label">Advanced Arbitration by Claude Opus 4.5</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                After consensus scores are established, <strong>Claude Opus 4.5</strong> &mdash; the most
                advanced reasoning model available &mdash; reviews the entire scoring landscape.
                The Opus Judge does not blindly re-score everything. Instead, it applies
                <strong> targeted arbitration</strong>: it identifies metrics where the AI
                evaluators strongly disagreed (standard deviation &gt; 15) and provides an independent
                expert judgment only for those contested scores.
              </p>
              <div className="judge-flow">
                <div className="judge-step">
                  <span className="judge-step-icon">&#x1F50D;</span>
                  <span>Reviews all {metricsEvaluated} consensus scores</span>
                </div>
                <div className="judge-arrow">&rarr;</div>
                <div className="judge-step">
                  <span className="judge-step-icon">&#x26A0;&#xFE0F;</span>
                  <span>Flags metrics with &sigma; &gt; 15 disagreement</span>
                </div>
                <div className="judge-arrow">&rarr;</div>
                <div className="judge-step">
                  <span className="judge-step-icon">&#x2696;&#xFE0F;</span>
                  <span>Overrides only disputed scores with written reasoning</span>
                </div>
              </div>
              <p>
                The Judge's overrides adjust the consensus scores but <strong>never change the
                agreement level</strong> &mdash; confidence always remains a pure mathematical
                derivation of how closely the models agreed, ensuring full statistical integrity.
              </p>
            </div>
          </div>

          <div className="stage-divider" />

          {/* ── STAGE 4: CATEGORY WEIGHTING ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">4</span>
              <div>
                <h4 className="stage-title">Category Weighting</h4>
                <p className="stage-label">Weighted Aggregation Across 6 Life Categories</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                Individual metrics roll up into <strong>6 life categories</strong>, each reflecting
                a critical dimension of everyday freedom. Within each category, metrics are
                averaged using their individual importance weights (scale of 1-10).
                The categories themselves contribute to the final score according to these proportions:
              </p>
              <div className="category-weights-visual">
                {CATEGORY_WEIGHTS.map((cat) => (
                  <div className="category-weight-row" key={cat.id}>
                    <span className="category-weight-label">{cat.label}</span>
                    <div className="category-weight-bar-track">
                      <div
                        className="category-weight-bar-fill"
                        style={{ width: `${cat.weight * 5}%`, backgroundColor: cat.color }}
                      />
                    </div>
                    <span className="category-weight-pct">{cat.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stage-divider" />

          {/* ── STAGE 5: FINAL SCORE ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">5</span>
              <div>
                <h4 className="stage-title">Final Score Calculation</h4>
                <p className="stage-label">Score Differentiation &amp; Winner Determination</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                Each city's <strong>total LIFE SCORE</strong> is the weighted sum of all six
                category scores. To prevent artificially close results when one city is genuinely
                superior, the algorithm applies two differentiation bonuses:
              </p>
              <div className="bonus-cards">
                <div className="bonus-card">
                  <span className="bonus-value">+2</span>
                  <span className="bonus-label">points per category won</span>
                  <span className="bonus-detail">Awarded for each category where a city leads by &gt;5 points</span>
                </div>
                <div className="bonus-card">
                  <span className="bonus-value">&times;0.5</span>
                  <span className="bonus-label">spread multiplier</span>
                  <span className="bonus-detail">Largest category gap &times; 0.5 added to the overall leader</span>
                </div>
              </div>
              <p>
                Final scores are capped at 100. The city with the highest total is declared the
                winner &mdash; in this comparison, <strong>
                {result.winner === 'city1' ? result.city1.city : result.winner === 'city2' ? result.city2.city : 'neither city'}
                </strong> with a margin of <strong>{result.scoreDifference} points</strong>.
              </p>
            </div>
          </div>

          <div className="stage-divider" />

          {/* ── STAGE 6: TRANSPARENCY ── */}
          <div className="methodology-stage">
            <div className="stage-header">
              <span className="stage-number">6</span>
              <div>
                <h4 className="stage-title">Full Transparency</h4>
                <p className="stage-label">Verifiable Evidence &amp; Source Attribution</p>
              </div>
            </div>
            <div className="stage-content">
              <p>
                Every score in LIFE SCORE is derived from <strong>verifiable legal data, not opinions</strong>.
                Each metric measures specific regulations, statutes, government data, and their real-world
                enforcement patterns.
              </p>
              <div className="transparency-features">
                <div className="transparency-feature">
                  <span className="transparency-icon">📄</span>
                  <div>
                    <strong>Click any metric</strong> to see the specific sources, citations, and evidence
                    used to derive that score.
                  </div>
                </div>
                <div className="transparency-feature">
                  <span className="transparency-icon">📚</span>
                  <div>
                    <strong>View Data Sources</strong> button below provides a complete list of all
                    references used across the entire comparison.
                  </div>
                </div>
                <div className="transparency-feature">
                  <span className="transparency-icon">🔍</span>
                  <div>
                    <strong>Evidence Panel</strong> shows all web citations with direct links so you
                    can verify findings yourself.
                  </div>
                </div>
              </div>
              <p>
                This commitment to transparency means you never have to &quot;just trust&quot; a score &mdash;
                you can trace every number back to its source.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ScoreMethodology;
