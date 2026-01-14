/**
 * LIFE SCORE™ Main Application
 * Legal Independence & Freedom Evaluation
 * 
 * John E. Desautels & Associates
 * © 2025 All Rights Reserved
 */

import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CitySelector from './components/CitySelector';
import LoadingState from './components/LoadingState';
import Results from './components/Results';
import SavedComparisons from './components/SavedComparisons';
import type { ComparisonResult } from './types/metrics';
import useComparison from './hooks/useComparison';
import { ALL_METRICS } from './data/metrics';
import './styles/globals.css';
import './App.css';

const App: React.FC = () => {
  const { state, compare, reset, loadResult } = useComparison({ useDemoMode: true });
  const [savedKey, setSavedKey] = useState(0);

  const handleLoadSavedComparison = useCallback((result: ComparisonResult) => {
    loadResult(result);
  }, [loadResult]);

  const handleSaved = useCallback(() => {
    setSavedKey(prev => prev + 1);
  }, []);

  const handleCompare = async (city1: string, city2: string) => {
    await compare(city1, city2);
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="container">
          {/* Demo Badge */}
          <div className="demo-badge">
            ⚡ LIVE PREVIEW - 100 Freedom Metrics Defined 
          </div>

          {/* City Selector */}
          <CitySelector 
            onCompare={handleCompare}
            isLoading={state.status === 'loading'}
          />

          {/* Loading State */}
          {state.status === 'loading' && state.progress && (
            <LoadingState
              currentCategory={state.progress.currentCategory}
              metricsProcessed={state.progress.metricsProcessed}
              totalMetrics={state.progress.totalMetrics}
              currentMetric={state.progress.currentMetric}
            />
          )}

          {/* Error State */}
          {state.status === 'error' && (
            <div className="error-card card">
              <div className="error-icon">❌</div>
              <h3>Analysis Failed</h3>
              <p>{state.error}</p>
              <button className="btn btn-primary" onClick={reset}>
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {state.status === 'success' && state.result && (
            <>
              <Results result={state.result} onSaved={handleSaved} />
              <div className="new-comparison">
                <button className="btn btn-secondary" onClick={reset}>
                  ← New Comparison
                </button>
              </div>
            </>
          )}

          {/* Saved Comparisons */}
          <SavedComparisons
            key={savedKey}
            onLoadComparison={handleLoadSavedComparison}
            currentComparisonId={state.result?.comparisonId}
          />

          {/* About Section - Show when idle */}
          {state.status === 'idle' && (
            <div className="about-section card">
              <h3 className="section-title">About LIFE SCORE™</h3>
              <div className="about-content">
                <p>
                  <strong>LIFE SCORE™ (Legal Independence & Freedom Evaluation)</strong> is a comprehensive
                  framework developed by John E. Desautels & Associates that analyzes legal freedom across
                  <span className="highlight"> 100 specific metrics</span> in six key categories:
                </p>
                
                <div className="category-summary">
                  <div className="category-item">
                    <span className="cat-icon">🗽</span>
                    <div className="cat-info">
                      <strong>Personal Freedom & Morality</strong>
                      <span>15 metrics - Vice laws, substance policies, personal choices</span>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <span className="cat-icon">🏠</span>
                    <div className="cat-info">
                      <strong>Housing & Property Rights</strong>
                      <span>20 metrics - HOA restrictions, property taxes, zoning</span>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <span className="cat-icon">💼</span>
                    <div className="cat-info">
                      <strong>Business & Work Regulation</strong>
                      <span>25 metrics - Licensing, employment laws, regulatory burden</span>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <span className="cat-icon">🚇</span>
                    <div className="cat-info">
                      <strong>Transportation & Movement</strong>
                      <span>15 metrics - Car dependency, public transit, mobility freedom</span>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <span className="cat-icon">⚖️</span>
                    <div className="cat-info">
                      <strong>Policing & Legal System</strong>
                      <span>15 metrics - Enforcement, incarceration, legal costs</span>
                    </div>
                  </div>
                  
                  <div className="category-item">
                    <span className="cat-icon">🎭</span>
                    <div className="cat-info">
                      <strong>Speech & Lifestyle</strong>
                      <span>10 metrics - Free expression, cultural norms, privacy</span>
                    </div>
                  </div>
                </div>
                
                <p className="methodology">
                  Unlike other "freedom indexes" that rely on subjective ratings, LIFE SCORE™ uses Claude AI
                  with real-time web search to verify each metric with actual laws, regulations, and current data.
                  <span className="highlight"> No fabricated data.</span> Every score
                  is backed by verifiable sources.
                </p>
                
                <p className="part-of">
                  This tool is part of the <strong className="brand-text">CLUES™</strong> (Comprehensive
                  Location & Utility Evaluation System) platform, helping individuals make informed decisions
                  about international relocation based on real data, not assumptions.
                </p>
              </div>
              
              <div className="metrics-count">
                <div className="count-box">
                  <span className="count-number">{ALL_METRICS.length}</span>
                  <span className="count-label">Total Metrics</span>
                </div>
                <div className="count-box">
                  <span className="count-number">6</span>
                  <span className="count-label">Categories</span>
                </div>
                <div className="count-box">
                  <span className="count-number">∞</span>
                  <span className="count-label">Cities Comparable</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default App;
