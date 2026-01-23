/**
 * LIFE SCORE™ Judge Tab - The Final Verdict
 *
 * Claude Opus 4.5 serves as THE JUDGE - providing holistic freedom analysis,
 * future trend forecasting, and executive recommendations.
 *
 * Features:
 * - HeyGen video report by "Christian" (male humanoid avatar)
 * - Summary of findings with trend indicators
 * - Detailed category-by-category analysis
 * - Executive summary with final recommendation
 * - Save, download, forward capabilities
 *
 * Design DNA:
 * - James Bond: MI6 briefing room authority
 * - Airbus A320: Glass cockpit precision
 * - Patek Philippe: Timeless craftsmanship
 * - Mid-century modern: Clean lines, purposeful design
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useRef, useEffect } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import { CATEGORIES } from '../shared/metrics';
import './JudgeTab.css';

// ============================================================================
// TYPES
// ============================================================================

export interface JudgeReport {
  reportId: string;
  generatedAt: string;
  userId: string;
  comparisonId: string;
  city1: string;
  city2: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'ready' | 'error';
  summaryOfFindings: {
    city1Score: number;
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'rising' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
  categoryAnalysis: {
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];
  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

interface JudgeTabProps {
  comparisonResult: EnhancedComparisonResult | null;
  userId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const JudgeTab: React.FC<JudgeTabProps> = ({ comparisonResult, userId = 'guest' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Real-time clock for cockpit feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cockpit-style time formatting
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  // Video time formatting
  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Video controls
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentVideoTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + seconds));
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Generate Judge Report handler (shell - API integration in Phase B)
  const handleGenerateReport = async () => {
    if (!comparisonResult) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // TODO: Phase B - Implement actual API call to Claude Opus
    // TODO: Phase B - Implement HeyGen video generation
    console.log('[JudgeTab] Generate report requested for:', {
      city1: comparisonResult.city1.city,
      city2: comparisonResult.city2.city,
      userId
    });
  };

  // Action handlers (shell - implementation in Phase B)
  const handleSaveReport = () => {
    console.log('[JudgeTab] Save report requested');
    // TODO: Phase B - Save to localStorage + Supabase
  };

  const handleDownloadReport = (format: 'pdf' | 'video') => {
    console.log('[JudgeTab] Download requested:', format);
    // TODO: Phase B - Generate and download PDF/video
  };

  const handleForwardReport = () => {
    console.log('[JudgeTab] Forward report requested');
    // TODO: Phase B - Share/forward functionality
  };

  // Trend icon helper
  const getTrendIcon = (trend: 'rising' | 'stable' | 'declining') => {
    switch (trend) {
      case 'rising': return '↗️';
      case 'stable': return '→';
      case 'declining': return '↘️';
    }
  };

  const getTrendClass = (trend: 'rising' | 'stable' | 'declining') => {
    switch (trend) {
      case 'rising': return 'trend-rising';
      case 'stable': return 'trend-stable';
      case 'declining': return 'trend-declining';
    }
  };

  // No comparison data state
  if (!comparisonResult) {
    return (
      <div className="judge-tab">
        <div className="judge-no-data">
          <div className="no-data-icon">⚖️</div>
          <h3>No Comparison Data</h3>
          <p>Run a city comparison first to generate The Judge's verdict.</p>
        </div>
      </div>
    );
  }

  const city1Name = comparisonResult.city1.city;
  const city2Name = comparisonResult.city2.city;
  const reportId = `LIFE-JDG-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${userId.slice(0,8).toUpperCase()}`;

  return (
    <div className="judge-tab">
      {/* ═══════════════════════════════════════════════════════════════════
          COCKPIT HEADER - A320 Glass Cockpit Style
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="judge-header">
        <div className="header-left">
          <div className="status-cluster">
            <div className="status-indicator">
              <span className="indicator-icon">⚖️</span>
              <span className="indicator-label">JUDGE STATUS</span>
              <span className={`indicator-value ${judgeReport ? 'active' : ''}`}>
                {isGenerating ? 'ANALYZING' : judgeReport ? 'VERDICT READY' : 'AWAITING'}
              </span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="judge-wordmark">
            <span className="wordmark-prefix">THE</span>
            <span className="wordmark-main">JUDGE</span>
          </div>
          <div className="wordmark-tagline">Claude Opus 4.5 • Final Arbiter</div>
        </div>

        <div className="header-right">
          <div className="time-cluster">
            <div className="time-display">
              <span className="time-label">LOCAL</span>
              <span className="time-value">{formatTime(currentTime)}</span>
            </div>
            <div className="date-display">
              <span className="date-value">{formatDate(currentTime)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          REPORT IDENTIFICATION BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="report-id-bar">
        <div className="report-id-segment">
          <span className="segment-icon">◈</span>
          <span className="segment-label">REPORT ID</span>
          <span className="segment-value">{reportId}</span>
        </div>
        <div className="report-id-segment">
          <span className="segment-icon">◇</span>
          <span className="segment-label">COMPARISON</span>
          <span className="segment-value">{city1Name} vs {city2Name}</span>
        </div>
        <div className="report-id-segment">
          <span className="segment-icon">◉</span>
          <span className="segment-label">USER</span>
          <span className="segment-value">{userId}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          VIDEO VIEWPORT - HeyGen Christian's Report
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="video-viewport-section">
        <div className="viewport-frame">
          <div className="viewport-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            <div className="viewport-screen">
              {judgeReport?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={judgeReport.videoUrl}
                  className="judge-video"
                  onTimeUpdate={() => setCurrentVideoTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <div className="video-placeholder">
                  {isGenerating ? (
                    <div className="generating-state">
                      <div className="generating-ring"></div>
                      <div className="generating-ring delay-1"></div>
                      <div className="generating-ring delay-2"></div>
                      <div className="generating-text">ANALYZING EVIDENCE</div>
                      <div className="generating-subtext">
                        Claude Opus 4.5 is reviewing all metrics and sources...
                      </div>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${generationProgress}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">{generationProgress}% Complete</div>
                    </div>
                  ) : (
                    <div className="awaiting-state">
                      <div className="avatar-silhouette">
                        <span className="silhouette-icon">👤</span>
                      </div>
                      <div className="awaiting-text">CHRISTIAN</div>
                      <div className="awaiting-subtext">Judge's Video Report</div>
                      <button
                        className="generate-report-btn"
                        onClick={handleGenerateReport}
                      >
                        <span className="btn-icon">⚖️</span>
                        <span className="btn-text">GENERATE JUDGE'S VERDICT</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Screen vignette effect */}
              <div className="screen-vignette"></div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="video-controls">
            <div className="controls-left">
              <button className="control-btn" onClick={() => handleSkip(-10)} title="Rewind 10s">
                <span>⏮️</span>
              </button>
              <button className="control-btn" onClick={() => handleSkip(-5)} title="Back 5s">
                <span>◀️</span>
              </button>
              <button
                className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayPause}
                disabled={!judgeReport?.videoUrl}
              >
                <span>{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              <button className="control-btn" onClick={() => handleSkip(5)} title="Forward 5s">
                <span>▶️</span>
              </button>
              <button className="control-btn" onClick={() => handleSkip(10)} title="Forward 10s">
                <span>⏭️</span>
              </button>
            </div>

            <div className="controls-center">
              <span className="time-current">{formatVideoTime(currentVideoTime)}</span>
              <input
                type="range"
                className="seek-bar"
                min="0"
                max={videoDuration || 100}
                value={currentVideoTime}
                onChange={handleSeek}
                disabled={!judgeReport?.videoUrl}
              />
              <span className="time-duration">{formatVideoTime(videoDuration)}</span>
            </div>

            <div className="controls-right">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                className="volume-bar"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION BUTTONS - Save, Download, Forward
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="action-buttons-section">
        <button
          className="action-btn save-btn"
          onClick={handleSaveReport}
          disabled={!judgeReport}
        >
          <span className="btn-icon">💾</span>
          <span className="btn-text">SAVE REPORT</span>
        </button>
        <button
          className="action-btn download-btn"
          onClick={() => handleDownloadReport('pdf')}
          disabled={!judgeReport}
        >
          <span className="btn-icon">📄</span>
          <span className="btn-text">DOWNLOAD PDF</span>
        </button>
        <button
          className="action-btn download-btn"
          onClick={() => handleDownloadReport('video')}
          disabled={!judgeReport?.videoUrl}
        >
          <span className="btn-icon">🎬</span>
          <span className="btn-text">DOWNLOAD VIDEO</span>
        </button>
        <button
          className="action-btn forward-btn"
          onClick={handleForwardReport}
          disabled={!judgeReport}
        >
          <span className="btn-icon">📤</span>
          <span className="btn-text">FORWARD</span>
        </button>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SUMMARY OF FINDINGS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="findings-section">
        <div className="section-header">
          <span className="section-icon">📊</span>
          <h2 className="section-title">SUMMARY OF FINDINGS</h2>
        </div>

        <div className="findings-grid">
          <div className="finding-card city1">
            <div className="card-header">
              <span className="city-name">{city1Name}</span>
              <span className="city-country">{comparisonResult.city1.country}</span>
            </div>
            <div className="card-score">
              <span className="score-value">
                {judgeReport?.summaryOfFindings.city1Score ?? comparisonResult.city1.totalConsensusScore}
              </span>
              <span className="score-label">LIFE SCORE</span>
            </div>
            <div className={`card-trend ${judgeReport ? getTrendClass(judgeReport.summaryOfFindings.city1Trend) : ''}`}>
              <span className="trend-icon">
                {judgeReport ? getTrendIcon(judgeReport.summaryOfFindings.city1Trend) : '—'}
              </span>
              <span className="trend-label">
                {judgeReport?.summaryOfFindings.city1Trend.toUpperCase() ?? 'PENDING ANALYSIS'}
              </span>
            </div>
          </div>

          <div className="finding-card versus">
            <span className="versus-text">VS</span>
            <div className="confidence-badge">
              <span className="confidence-label">CONFIDENCE</span>
              <span className={`confidence-value ${judgeReport?.summaryOfFindings.overallConfidence ?? 'pending'}`}>
                {judgeReport?.summaryOfFindings.overallConfidence?.toUpperCase() ?? 'PENDING'}
              </span>
            </div>
          </div>

          <div className="finding-card city2">
            <div className="card-header">
              <span className="city-name">{city2Name}</span>
              <span className="city-country">{comparisonResult.city2.country}</span>
            </div>
            <div className="card-score">
              <span className="score-value">
                {judgeReport?.summaryOfFindings.city2Score ?? comparisonResult.city2.totalConsensusScore}
              </span>
              <span className="score-label">LIFE SCORE</span>
            </div>
            <div className={`card-trend ${judgeReport ? getTrendClass(judgeReport.summaryOfFindings.city2Trend) : ''}`}>
              <span className="trend-icon">
                {judgeReport ? getTrendIcon(judgeReport.summaryOfFindings.city2Trend) : '—'}
              </span>
              <span className="trend-label">
                {judgeReport?.summaryOfFindings.city2Trend.toUpperCase() ?? 'PENDING ANALYSIS'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DETAILED CATEGORY ANALYSIS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="analysis-section">
        <div className="section-header">
          <span className="section-icon">📖</span>
          <h2 className="section-title">DETAILED ANALYSIS</h2>
        </div>

        <div className="category-analysis-list">
          {CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const analysis = judgeReport?.categoryAnalysis.find(a => a.categoryId === category.id);

            return (
              <div
                key={category.id}
                className={`category-analysis-card ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  className="category-header-btn"
                  onClick={() => toggleCategory(category.id)}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-weight">{category.weight}%</span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </button>

                {isExpanded && (
                  <div className="category-content">
                    {analysis ? (
                      <>
                        <div className="analysis-row">
                          <div className="analysis-city">
                            <span className="city-label">{city1Name}</span>
                            <p className="analysis-text">{analysis.city1Analysis}</p>
                          </div>
                          <div className="analysis-city">
                            <span className="city-label">{city2Name}</span>
                            <p className="analysis-text">{analysis.city2Analysis}</p>
                          </div>
                        </div>
                        <div className="trend-notes">
                          <span className="trend-label">📈 Trend Analysis:</span>
                          <p className="trend-text">{analysis.trendNotes}</p>
                        </div>
                      </>
                    ) : (
                      <div className="analysis-pending">
                        <span className="pending-icon">◇</span>
                        <span className="pending-text">Generate Judge's Verdict to view analysis</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          EXECUTIVE SUMMARY & RECOMMENDATION
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="executive-section">
        <div className="section-header">
          <span className="section-icon">🏆</span>
          <h2 className="section-title">EXECUTIVE SUMMARY & RECOMMENDATION</h2>
        </div>

        <div className="executive-content">
          {judgeReport?.executiveSummary ? (
            <>
              <div className="verdict-banner">
                <span className="verdict-label">THE JUDGE'S VERDICT</span>
                <span className="verdict-winner">
                  🏆 {judgeReport.executiveSummary.recommendation === 'city1'
                    ? city1Name
                    : judgeReport.executiveSummary.recommendation === 'city2'
                    ? city2Name
                    : 'TIE'}
                </span>
                <span className={`verdict-confidence ${judgeReport.executiveSummary.confidenceLevel}`}>
                  {judgeReport.executiveSummary.confidenceLevel.toUpperCase()} CONFIDENCE
                </span>
              </div>

              <div className="rationale-section">
                <h3 className="rationale-header">Rationale</h3>
                <p className="rationale-text">{judgeReport.executiveSummary.rationale}</p>
              </div>

              <div className="key-factors-section">
                <h3 className="factors-header">Key Factors</h3>
                <ul className="factors-list">
                  {judgeReport.executiveSummary.keyFactors.map((factor, idx) => (
                    <li key={idx} className="factor-item">
                      <span className="factor-bullet">◈</span>
                      <span className="factor-text">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="outlook-section">
                <h3 className="outlook-header">Future Outlook</h3>
                <p className="outlook-text">{judgeReport.executiveSummary.futureOutlook}</p>
              </div>
            </>
          ) : (
            <div className="executive-pending">
              <div className="pending-gavel">⚖️</div>
              <h3 className="pending-title">Verdict Pending</h3>
              <p className="pending-description">
                Click "Generate Judge's Verdict" above to receive Claude Opus 4.5's comprehensive analysis,
                including future trend forecasting and executive recommendation.
              </p>
              <div className="pending-features">
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span className="feature-text">Holistic Freedom Analysis</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <span className="feature-text">Future Trend Forecasting</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span className="feature-text">Personalized Recommendation</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎬</span>
                  <span className="feature-text">Video Report by Christian</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="judge-footer">
        <div className="footer-left">
          <span className="footer-brand">LIFE SCORE™</span>
          <span className="footer-divider">|</span>
          <span className="footer-tagline">The Judge's Verdict</span>
        </div>
        <div className="footer-center">
          <div className="judge-status">
            <span className={`status-dot ${judgeReport ? 'ready' : 'awaiting'}`}></span>
            <span className="status-text">
              {judgeReport ? 'VERDICT RENDERED' : 'AWAITING ANALYSIS'}
            </span>
          </div>
        </div>
        <div className="footer-right">
          <span className="footer-model">Powered by Claude Opus 4.5</span>
        </div>
      </footer>
    </div>
  );
};

export default JudgeTab;
