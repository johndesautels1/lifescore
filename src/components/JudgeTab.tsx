/**
 * LIFE SCORE™ Judge Tab - The Final Verdict
 *
 * Claude Opus 4.5 serves as THE JUDGE - providing holistic freedom analysis,
 * future trend forecasting, and executive recommendations.
 *
 * Features:
 * - Replicate video report by "Christiano" (photorealistic avatar via MuseTalk)
 * - Summary of findings with trend indicators
 * - Detailed category-by-category analysis
 * - Executive summary with final recommendation
 * - Save, download, forward capabilities
 *
 * Video Generation: Replaced D-ID with Replicate for 95% cost savings
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
import type { ComparisonResult } from '../types/metrics';
import { CATEGORIES } from '../shared/metrics';
import { supabase, isSupabaseConfigured, getCurrentUser, SUPABASE_TIMEOUT_MS } from '../lib/supabase';

/**
 * Wrap a Supabase query with 45s timeout
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number = SUPABASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timeout after ${ms}ms`)), ms)
    ),
  ]);
}
import FeatureGate from './FeatureGate';
import { useJudgeVideo } from '../hooks/useJudgeVideo';
import type { GenerateJudgeVideoRequest } from '../types/avatar';
import {
  getLocalComparisons,
  getLocalEnhancedComparisons,
} from '../services/savedComparisons';
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
  comparisonResult: EnhancedComparisonResult | ComparisonResult | null;
  userId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const JudgeTab: React.FC<JudgeTabProps> = ({ comparisonResult: propComparisonResult, userId = 'guest' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Report selection state - allows user to select from saved comparisons
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);

  // Load saved comparisons for report selection dropdown
  const savedComparisons = getLocalComparisons();
  const savedEnhanced = getLocalEnhancedComparisons();

  // FIX 2026-01-26: Track if report failed to load for user feedback
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);

  // FIX 2026-01-27: Compute comparison result without state updates during render
  // Use a ref to track the error to update via useEffect
  const computedErrorRef = useRef<string | null>(null);

  // Determine which comparison to use (no state updates here!)
  let comparisonResult: EnhancedComparisonResult | ComparisonResult | null = null;
  computedErrorRef.current = null;

  if (selectedComparisonId) {
    // Look up in saved standard comparisons
    const savedStd = savedComparisons.find(c => c.result?.comparisonId === selectedComparisonId);
    if (savedStd?.result) {
      if (savedStd.result.city1 && savedStd.result.city2) {
        console.log('[JudgeTab] Loaded standard comparison:', selectedComparisonId);
        comparisonResult = savedStd.result;
      } else {
        console.error('[JudgeTab] Standard comparison missing city data:', selectedComparisonId);
        computedErrorRef.current = 'Report data is corrupted - missing city information';
      }
    } else {
      // Look up in saved enhanced comparisons
      const savedEnh = savedEnhanced.find(c => c.result?.comparisonId === selectedComparisonId);
      if (savedEnh?.result) {
        if (savedEnh.result.city1 && savedEnh.result.city2) {
          console.log('[JudgeTab] Loaded enhanced comparison:', selectedComparisonId);
          comparisonResult = savedEnh.result;
        } else {
          console.error('[JudgeTab] Enhanced comparison missing city data:', selectedComparisonId);
          computedErrorRef.current = 'Report data is corrupted - missing city information';
        }
      } else {
        console.error('[JudgeTab] Selected comparison not found in storage:', selectedComparisonId);
        computedErrorRef.current = 'Selected report not found - it may have been deleted';
      }
    }
  } else {
    // No selection - use prop if available
    comparisonResult = propComparisonResult || null;
  }

  // Sync error state via useEffect - only update if error changed
  const prevErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevErrorRef.current !== computedErrorRef.current) {
      prevErrorRef.current = computedErrorRef.current;
      setReportLoadError(computedErrorRef.current);
    }
  });

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Replicate video generation hook (replaced D-ID)
  const {
    video: replicateVideo,
    isGenerating: isGeneratingVideo,
    isReady: isVideoReady,
    generate: generateReplicateVideo,
    error: videoError,
  } = useJudgeVideo();

  // Legacy video generation state (for backwards compatibility)
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
  const videoPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Cleanup video polling on unmount
  useEffect(() => {
    return () => {
      if (videoPollingRef.current) {
        clearInterval(videoPollingRef.current);
      }
    };
  }, []);

  // Poll for video status until ready or error (legacy D-ID polling, kept for reference)
  const _pollVideoStatus = async (talkId: string, report: JudgeReport) => {
    console.log('[JudgeTab] Starting video status polling for:', talkId);
    setVideoGenerationProgress('Christiano is preparing your video report...');

    // Clear any existing polling
    if (videoPollingRef.current) {
      clearInterval(videoPollingRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch('/api/judge-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', talkId })
        });

        if (!response.ok) {
          throw new Error('Failed to check video status');
        }

        const data = await response.json();
        console.log('[JudgeTab] Video status:', data.status);

        if (data.status === 'ready' && data.videoUrl) {
          // Video is ready!
          if (videoPollingRef.current) {
            clearInterval(videoPollingRef.current);
            videoPollingRef.current = null;
          }

          const updatedReport: JudgeReport = {
            ...report,
            videoUrl: data.videoUrl,
            videoStatus: 'ready'
          };

          setJudgeReport(updatedReport);
          saveReportToLocalStorage(updatedReport);
          setVideoGenerationProgress('');
          console.log('[JudgeTab] Video ready:', data.videoUrl);
        } else if (data.status === 'error') {
          // Video generation failed
          if (videoPollingRef.current) {
            clearInterval(videoPollingRef.current);
            videoPollingRef.current = null;
          }

          const updatedReport: JudgeReport = {
            ...report,
            videoStatus: 'error'
          };

          setJudgeReport(updatedReport);
          setVideoGenerationProgress('');
          console.error('[JudgeTab] Video generation failed:', data.error);
        } else {
          // Still generating
          setVideoGenerationProgress(
            data.status === 'generating'
              ? 'Christian is recording your verdict...'
              : 'Preparing video generation...'
          );
        }
      } catch (error) {
        console.error('[JudgeTab] Video polling error:', error);
      }
    };

    // Initial check
    await poll();

    // Poll every 5 seconds
    videoPollingRef.current = setInterval(poll, 5000);
  };
  // Suppress unused warning
  void _pollVideoStatus;

  // Generate video from judge report using Replicate (replaced D-ID)
  const generateJudgeVideo = async (report: JudgeReport) => {
    console.log('[JudgeTab] Starting Replicate video generation for report:', report.reportId);
    setVideoGenerationProgress('Initiating video generation...');

    // Build script for Christiano to speak
    const winner = report.executiveSummary.recommendation === 'city1' ? report.city1 :
      report.executiveSummary.recommendation === 'city2' ? report.city2 : 'TIE';
    const winnerScore = report.executiveSummary.recommendation === 'city1'
      ? report.summaryOfFindings.city1Score
      : report.summaryOfFindings.city2Score;
    const loserScore = report.executiveSummary.recommendation === 'city1'
      ? report.summaryOfFindings.city2Score
      : report.summaryOfFindings.city1Score;

    const script = `Good day. I'm Christiano, your LIFE SCORE Judge. After careful analysis of ${report.city1} versus ${report.city2}, my verdict is clear. The winner is ${winner} with a score of ${winnerScore}. ${report.executiveSummary.rationale} Key factors include: ${report.executiveSummary.keyFactors.slice(0, 3).join(', ')}. For the future outlook: ${report.executiveSummary.futureOutlook.slice(0, 200)}. This concludes my verdict.`;

    const request: GenerateJudgeVideoRequest = {
      script,
      city1: report.city1,
      city2: report.city2,
      winner,
      winnerScore,
      loserScore,
    };

    try {
      await generateReplicateVideo(request);

      // Update report with generating status
      const updatedReport: JudgeReport = {
        ...report,
        videoStatus: 'generating'
      };
      setJudgeReport(updatedReport);
      saveReportToLocalStorage(updatedReport);

    } catch (error) {
      console.error('[JudgeTab] Video generation error:', error);
      setVideoGenerationProgress('');

      // Update report with error status
      const updatedReport: JudgeReport = {
        ...report,
        videoStatus: 'error'
      };
      setJudgeReport(updatedReport);
    }
  };

  // Update report when Replicate video is ready
  useEffect(() => {
    if (isVideoReady && replicateVideo?.videoUrl && judgeReport) {
      const updatedReport: JudgeReport = {
        ...judgeReport,
        videoUrl: replicateVideo.videoUrl,
        videoStatus: 'ready'
      };
      setJudgeReport(updatedReport);
      saveReportToLocalStorage(updatedReport);
      setVideoGenerationProgress('');
      console.log('[JudgeTab] Replicate video ready:', replicateVideo.videoUrl);
    }
  }, [isVideoReady, replicateVideo?.videoUrl]);

  // Handle video generation errors
  useEffect(() => {
    if (videoError && judgeReport) {
      const updatedReport: JudgeReport = {
        ...judgeReport,
        videoStatus: 'error'
      };
      setJudgeReport(updatedReport);
      setVideoGenerationProgress('');
      console.error('[JudgeTab] Replicate video error:', videoError);
    }
  }, [videoError]);

  // Generate Judge Report handler - Phase B Implementation
  // Client timeout must exceed server's 240s timeout for Opus
  const JUDGE_API_TIMEOUT_MS = 300000; // 5 minutes

  const handleGenerateReport = async () => {
    if (!comparisonResult) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    console.log('[JudgeTab] Generate report requested for:', {
      city1: comparisonResult.city1.city,
      city2: comparisonResult.city2.city,
      userId
    });

    // Setup abort controller for client-side timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[JudgeTab] Client timeout after', JUDGE_API_TIMEOUT_MS / 1000, 'seconds');
      controller.abort();
    }, JUDGE_API_TIMEOUT_MS);

    try {
      // Simulate progress updates during API call
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // Call the Judge Report API with abort signal
      const response = await fetch('/api/judge-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comparisonResult,
          userId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.report) {
        throw new Error('Invalid response from Judge API');
      }

      setGenerationProgress(100);
      setJudgeReport(data.report);

      // Save to localStorage
      saveReportToLocalStorage(data.report);

      console.log('[JudgeTab] Report generated successfully:', data.report.reportId);

      // Automatically start video generation
      generateJudgeVideo(data.report);

    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const errorMsg = isTimeout
        ? 'Request timed out. The Judge API took too long to respond.'
        : (error instanceof Error ? error.message : 'Unknown error');

      console.error('[JudgeTab] Failed to generate report:', errorMsg);
      setGenerationProgress(0);
      setVideoGenerationProgress(`Error: ${errorMsg}`);

      // Clear error message after 10 seconds
      setTimeout(() => setVideoGenerationProgress(''), 10000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save report to localStorage
  const saveReportToLocalStorage = (report: JudgeReport) => {
    try {
      const storageKey = 'lifescore_judge_reports';
      const existingReports = JSON.parse(localStorage.getItem(storageKey) || '[]');

      // Add new report at the beginning
      existingReports.unshift(report);

      // Keep only last 20 reports
      const trimmedReports = existingReports.slice(0, 20);

      localStorage.setItem(storageKey, JSON.stringify(trimmedReports));
      console.log('[JudgeTab] Report saved to localStorage:', report.reportId);
    } catch (error) {
      console.error('[JudgeTab] Failed to save report to localStorage:', error);
    }
  };

  // Load report from localStorage on mount (if we have a matching comparison)
  useEffect(() => {
    if (!comparisonResult) return;

    try {
      const storageKey = 'lifescore_judge_reports';
      const existingReports: JudgeReport[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

      // Find a report matching this comparison
      const matchingReport = existingReports.find(r =>
        r.comparisonId === comparisonResult.comparisonId ||
        (r.city1 === comparisonResult.city1.city && r.city2 === comparisonResult.city2.city)
      );

      if (matchingReport) {
        console.log('[JudgeTab] Found cached report:', matchingReport.reportId);
        setJudgeReport(matchingReport);
      }
    } catch (error) {
      console.error('[JudgeTab] Failed to load cached report:', error);
    }
  }, [comparisonResult]);

  // Save report to Supabase (for authenticated users)
  const saveReportToSupabase = async (report: JudgeReport): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      console.log('[JudgeTab] Supabase not configured, skipping cloud save');
      return false;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('[JudgeTab] No authenticated user, skipping Supabase save');
        return false;
      }

      // Check if report already exists (with 45s timeout)
      const { data: existing } = await withTimeout(
        supabase
          .from('judge_reports')
          .select('id')
          .eq('report_id', report.reportId)
          .single()
      );

      if (existing) {
        // Update existing report (with 45s timeout)
        const { error } = await withTimeout(
          supabase
            .from('judge_reports')
            .update({
              city1_score: report.summaryOfFindings.city1Score,
              city1_trend: report.summaryOfFindings.city1Trend,
              city2_score: report.summaryOfFindings.city2Score,
              city2_trend: report.summaryOfFindings.city2Trend,
              overall_confidence: report.summaryOfFindings.overallConfidence,
              recommendation: report.executiveSummary.recommendation,
              rationale: report.executiveSummary.rationale,
              key_factors: report.executiveSummary.keyFactors,
              future_outlook: report.executiveSummary.futureOutlook,
              confidence_level: report.executiveSummary.confidenceLevel,
              category_analysis: report.categoryAnalysis,
              full_report: report,
              video_url: report.videoUrl,
              video_status: report.videoStatus,
              updated_at: new Date().toISOString()
            })
            .eq('report_id', report.reportId)
        );

        if (error) throw error;
        console.log('[JudgeTab] Report updated in Supabase:', report.reportId);
      } else {
        // Insert new report (with 45s timeout)
        const { error } = await withTimeout(
          supabase
            .from('judge_reports')
            .insert({
              user_id: user.id,
              report_id: report.reportId,
              city1_name: report.city1,
              city2_name: report.city2,
              city1_score: report.summaryOfFindings.city1Score,
              city1_trend: report.summaryOfFindings.city1Trend,
              city2_score: report.summaryOfFindings.city2Score,
              city2_trend: report.summaryOfFindings.city2Trend,
              overall_confidence: report.summaryOfFindings.overallConfidence,
              recommendation: report.executiveSummary.recommendation,
              rationale: report.executiveSummary.rationale,
              key_factors: report.executiveSummary.keyFactors,
              future_outlook: report.executiveSummary.futureOutlook,
              confidence_level: report.executiveSummary.confidenceLevel,
              category_analysis: report.categoryAnalysis,
              full_report: report,
              video_url: report.videoUrl,
              video_status: report.videoStatus
            })
        );

        if (error) throw error;
        console.log('[JudgeTab] Report saved to Supabase:', report.reportId);
      }

      return true;
    } catch (error) {
      console.error('[JudgeTab] Supabase save error:', error);
      return false;
    }
  };

  // Action handlers - Phase B Implementation
  const handleSaveReport = async () => {
    if (!judgeReport) return;

    console.log('[JudgeTab] Save report requested:', judgeReport.reportId);

    // Save to localStorage
    saveReportToLocalStorage(judgeReport);

    // Save to Supabase for authenticated users
    const savedToCloud = await saveReportToSupabase(judgeReport);

    if (savedToCloud) {
      alert(`Report ${judgeReport.reportId} saved to your account!`);
    } else {
      alert(`Report ${judgeReport.reportId} saved locally. Sign in to save to cloud.`);
    }
  };

  const handleDownloadReport = (format: 'pdf' | 'video') => {
    if (!judgeReport) return;

    console.log('[JudgeTab] Download requested:', format);

    if (format === 'pdf') {
      // Generate PDF content
      const pdfContent = generatePDFContent(judgeReport);

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${judgeReport.reportId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[JudgeTab] PDF downloaded:', judgeReport.reportId);
    } else if (format === 'video') {
      if (!judgeReport.videoUrl) {
        alert('Video not yet available. Generate video report first.');
        return;
      }
      // Download video URL
      const a = document.createElement('a');
      a.href = judgeReport.videoUrl;
      a.download = `${judgeReport.reportId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleForwardReport = () => {
    if (!judgeReport) return;

    console.log('[JudgeTab] Forward report requested');

    // Generate shareable summary
    const summary = `🏆 LIFE SCORE™ Judge's Verdict\n\n` +
      `${judgeReport.city1} vs ${judgeReport.city2}\n\n` +
      `Winner: ${judgeReport.executiveSummary.recommendation === 'city1' ? judgeReport.city1 :
        judgeReport.executiveSummary.recommendation === 'city2' ? judgeReport.city2 : 'TIE'}\n` +
      `Confidence: ${judgeReport.executiveSummary.confidenceLevel.toUpperCase()}\n\n` +
      `Rationale: ${judgeReport.executiveSummary.rationale.slice(0, 200)}...\n\n` +
      `Report ID: ${judgeReport.reportId}\n` +
      `Generated: ${new Date(judgeReport.generatedAt).toLocaleDateString()}`;

    // Copy to clipboard and/or share
    if (navigator.share) {
      navigator.share({
        title: `LIFE SCORE™ Verdict: ${judgeReport.city1} vs ${judgeReport.city2}`,
        text: summary
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(summary).then(() => {
        alert('Report summary copied to clipboard!');
      }).catch(() => {
        alert('Unable to copy to clipboard.');
      });
    }
  };

  // Generate PDF content as HTML (can be printed to PDF)
  const generatePDFContent = (report: JudgeReport): string => {
    const winner = report.executiveSummary.recommendation === 'city1' ? report.city1 :
      report.executiveSummary.recommendation === 'city2' ? report.city2 : 'TIE';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LIFE SCORE™ Judge's Report - ${report.reportId}</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #0a1628; color: #f8fafc; }
    h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #c9a227; margin-top: 30px; }
    h3 { color: #64748b; }
    .verdict { background: linear-gradient(135deg, #0d2847 0%, #1e3a5f 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
    .verdict h2 { color: #d4af37; margin: 0; font-size: 2em; }
    .score-card { display: inline-block; padding: 15px 25px; margin: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; }
    .score-value { font-size: 2.5em; font-weight: bold; color: #10b981; }
    .trend-rising { color: #22c55e; }
    .trend-declining { color: #ef4444; }
    .trend-stable { color: #f59e0b; }
    .category { background: rgba(255,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #c9a227; }
    .key-factor { background: rgba(212,175,55,0.1); padding: 10px 15px; margin: 5px 0; border-radius: 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #64748b; text-align: center; color: #64748b; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>⚖️ LIFE SCORE™ Judge's Report</h1>
  <p><strong>Report ID:</strong> ${report.reportId}<br>
  <strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}<br>
  <strong>User ID:</strong> ${report.userId}</p>

  <div class="verdict">
    <h3>THE JUDGE'S VERDICT</h3>
    <h2>🏆 ${winner}</h2>
    <p>Confidence: <strong>${report.executiveSummary.confidenceLevel.toUpperCase()}</strong></p>
  </div>

  <h2>📊 Summary of Findings</h2>
  <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
    <div class="score-card">
      <h3>${report.city1}</h3>
      <div class="score-value">${report.summaryOfFindings.city1Score}</div>
      <div class="trend-${report.summaryOfFindings.city1Trend}">
        ${report.summaryOfFindings.city1Trend === 'rising' ? '↗️ Rising' :
          report.summaryOfFindings.city1Trend === 'declining' ? '↘️ Declining' : '→ Stable'}
      </div>
    </div>
    <div class="score-card">
      <h3>${report.city2}</h3>
      <div class="score-value">${report.summaryOfFindings.city2Score}</div>
      <div class="trend-${report.summaryOfFindings.city2Trend}">
        ${report.summaryOfFindings.city2Trend === 'rising' ? '↗️ Rising' :
          report.summaryOfFindings.city2Trend === 'declining' ? '↘️ Declining' : '→ Stable'}
      </div>
    </div>
  </div>

  <h2>📖 Detailed Category Analysis</h2>
  ${report.categoryAnalysis.map(cat => `
    <div class="category">
      <h3>${cat.categoryName}</h3>
      <p><strong>${report.city1}:</strong> ${cat.city1Analysis}</p>
      <p><strong>${report.city2}:</strong> ${cat.city2Analysis}</p>
      <p><em>📈 Trend: ${cat.trendNotes}</em></p>
    </div>
  `).join('')}

  <h2>🏆 Executive Summary</h2>
  <p>${report.executiveSummary.rationale}</p>

  <h3>Key Factors</h3>
  ${report.executiveSummary.keyFactors.map(f => `<div class="key-factor">◈ ${f}</div>`).join('')}

  <h3>Future Outlook</h3>
  <p>${report.executiveSummary.futureOutlook}</p>

  <div class="footer">
    <p>LIFE SCORE™ - The Judge's Verdict<br>
    Powered by Claude Opus 4.5<br>
    © 2025-2026 Clues Intelligence LTD</p>
  </div>
</body>
</html>`;
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

  // No comparison data state - show report selector dropdown
  if (!comparisonResult) {
    const hasSavedReports = savedComparisons.length > 0 || savedEnhanced.length > 0;

    return (
      <div className="judge-tab">
        <div className="judge-no-data">
          <div className="no-data-icon">⚖️</div>
          <h3>No Comparison Data</h3>
          <p>Run a city comparison first to generate The Judge's verdict.</p>

          {/* FIX 2026-01-26: Show error message when report fails to load */}
          {reportLoadError && (
            <div className="report-load-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{reportLoadError}</span>
              <button
                className="error-dismiss"
                onClick={() => {
                  setReportLoadError(null);
                  setSelectedComparisonId(null);
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {hasSavedReports && (
            <div className="report-selection-section">
              <p className="or-divider">— OR —</p>
              <label className="report-select-label">Select a Saved Report:</label>
              <select
                className="report-dropdown judge-report-dropdown"
                value={selectedComparisonId || ''}
                onChange={(e) => setSelectedComparisonId(e.target.value || null)}
              >
                <option value="">Choose a report...</option>
                {savedComparisons.length > 0 && (
                  <optgroup label="Standard Reports">
                    {savedComparisons.map((saved) => (
                      <option key={saved.id} value={saved.result.comparisonId}>
                        {saved.result.city1.city} vs {saved.result.city2.city}
                        {saved.nickname ? ` (${saved.nickname})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {savedEnhanced.length > 0 && (
                  <optgroup label="Enhanced Reports">
                    {savedEnhanced.map((saved) => (
                      <option key={saved.id} value={saved.result.comparisonId}>
                        ⭐ {saved.result.city1.city} vs {saved.result.city2.city}
                        {saved.nickname ? ` (${saved.nickname})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
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
          REPORT SELECTION BAR - Switch between saved reports
      ═══════════════════════════════════════════════════════════════════ */}
      {(savedComparisons.length > 0 || savedEnhanced.length > 0) && (
        <div className="report-selector-bar">
          <label className="report-select-label">SELECT REPORT</label>
          <select
            className="report-dropdown judge-report-dropdown"
            value={selectedComparisonId || ''}
            onChange={(e) => {
              setSelectedComparisonId(e.target.value || null);
              setJudgeReport(null); // Clear existing report when switching
            }}
          >
            <option value="">
              {propComparisonResult
                ? `Current: ${propComparisonResult.city1?.city || 'City 1'} vs ${propComparisonResult.city2?.city || 'City 2'}`
                : 'Select a report...'}
            </option>
            {savedComparisons.length > 0 && (
              <optgroup label="Standard Reports">
                {savedComparisons.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    {saved.result.city1.city} vs {saved.result.city2.city}
                    {saved.nickname ? ` (${saved.nickname})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {savedEnhanced.length > 0 && (
              <optgroup label="Enhanced Reports">
                {savedEnhanced.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    ⭐ {saved.result.city1.city} vs {saved.result.city2.city}
                    {saved.nickname ? ` (${saved.nickname})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

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
          VIDEO VIEWPORT - Replicate Christiano's Report
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="video-viewport-section">
        <div className="viewport-frame">
          <div className="viewport-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            <div className="viewport-screen">
              {judgeReport?.videoUrl && judgeReport.videoStatus === 'ready' ? (
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
                      <div className="progress-text">{Math.round(generationProgress)}% Complete</div>
                    </div>
                  ) : isGeneratingVideo || judgeReport?.videoStatus === 'generating' ? (
                    <div className="generating-state video-generating">
                      <div className="generating-ring video-ring"></div>
                      <div className="generating-ring video-ring delay-1"></div>
                      <div className="generating-ring video-ring delay-2"></div>
                      <div className="generating-text">GENERATING VIDEO</div>
                      <div className="generating-subtext">
                        {videoGenerationProgress || 'Christiano is preparing your video report...'}
                      </div>
                      <div className="video-status-indicator">
                        <span className="status-dot pulsing"></span>
                        <span className="status-text">Replicate Processing</span>
                      </div>
                    </div>
                  ) : judgeReport?.videoStatus === 'error' ? (
                    <div className="awaiting-state error-state">
                      <div className="avatar-silhouette error">
                        <span className="silhouette-icon">⚠️</span>
                      </div>
                      <div className="awaiting-text">VIDEO UNAVAILABLE</div>
                      <div className="awaiting-subtext">Video generation encountered an error</div>
                      <button
                        className="generate-report-btn retry-btn"
                        onClick={() => judgeReport && generateJudgeVideo(judgeReport)}
                      >
                        <span className="btn-icon">🔄</span>
                        <span className="btn-text">RETRY VIDEO GENERATION</span>
                      </button>
                    </div>
                  ) : judgeReport ? (
                    <div className="awaiting-state video-pending">
                      <div className="avatar-silhouette">
                        <span className="silhouette-icon">🎬</span>
                      </div>
                      <div className="awaiting-text">VIDEO PENDING</div>
                      <div className="awaiting-subtext">Report ready - generate video</div>
                      <FeatureGate feature="judgeVideos" showUsage={true} blurContent={false}>
                        <button
                          className="generate-report-btn"
                          onClick={() => generateJudgeVideo(judgeReport)}
                        >
                          <span className="btn-icon">🎥</span>
                          <span className="btn-text">GENERATE VIDEO REPORT</span>
                        </button>
                      </FeatureGate>
                    </div>
                  ) : (
                    <div className="awaiting-state">
                      <div className="avatar-silhouette">
                        <span className="silhouette-icon">⚖️</span>
                      </div>
                      <div className="awaiting-text">CHRISTIANO</div>
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

        <div className="findings-grid">
          <div className="finding-card city1">
            <div className="card-header">
              <span className="city-name">{city1Name}</span>
              <span className="city-country">{comparisonResult.city1.country}</span>
            </div>
            <div className="card-score">
              <span className="score-value">
                {judgeReport?.summaryOfFindings.city1Score ?? ('totalConsensusScore' in comparisonResult.city1 ? comparisonResult.city1.totalConsensusScore : comparisonResult.city1.totalScore)}
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
                {judgeReport?.summaryOfFindings.city2Score ?? ('totalConsensusScore' in comparisonResult.city2 ? comparisonResult.city2.totalConsensusScore : comparisonResult.city2.totalScore)}
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
