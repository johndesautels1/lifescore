/**
 * LIFE SCORE™ Judge Tab - The Final Verdict
 *
 * Claude Opus 4.5 serves as THE JUDGE - providing holistic freedom analysis,
 * future trend forecasting, and executive recommendations.
 *
 * Features:
 * - Replicate video report by "Cristiano" (photorealistic avatar via Wav2Lip)
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

import React, { useState, useRef, useEffect, useMemo, useCallback, startTransition } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import { CATEGORIES } from '../shared/metrics';
import { ALL_METROS } from '../data/metros';
import { getFlagUrl } from '../utils/countryFlags';
import { supabase, isSupabaseConfigured, withRetry, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wrap a Supabase query with retry logic and timeout.
 * Uses exponential backoff on timeout/network errors.
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = SUPABASE_TIMEOUT_MS,
  operationName: string = 'Judge tab query'
): Promise<T> {
  return withRetry(() => promise, {
    timeoutMs: ms,
    operationName,
    maxRetries: 2, // 3 total attempts — ~40s worst case with 12s timeout + backoff
  });
}
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import FeatureGate from './FeatureGate';
import CourtOrderVideo from './CourtOrderVideo';
import GoToMyNewCity from './GoToMyNewCity';
import VideoPhoneWarning from './VideoPhoneWarning';
import { NotifyMeModal } from './NotifyMeModal';
import { useJudgeVideo } from '../hooks/useJudgeVideo';
import { useJobTracker } from '../hooks/useJobTracker';
import { useTierAccess } from '../hooks/useTierAccess';
import type { GenerateJudgeVideoRequest } from '../types/avatar';
import type { NotifyChannel } from '../types/database';
import {
  getLocalComparisons,
  getLocalEnhancedComparisons,
  getSavedJudgeReports,
  saveJudgeReport,
  fetchFullJudgeReport,
  fetchJudgeReportByComparisonId,
  fetchJudgeReportByCities,
  type SavedJudgeReport,
} from '../services/savedComparisons';
import './JudgeTab.css';

// ============================================================================
// TYPE-SAFE HELPERS
// ============================================================================

/** Get the total score from either Enhanced (totalConsensusScore) or Standard (totalScore) city data */
function getCityTotalScore(city: EnhancedComparisonResult['city1'] | ComparisonResult['city1']): number {
  if ('totalConsensusScore' in city) return city.totalConsensusScore;
  if ('totalScore' in city) return city.totalScore;
  return 0;
}

/** Escape HTML entities to prevent XSS / malformed output in generated HTML strings */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Build a JudgeReport from a source object (Supabase, localStorage, or saved report) */
function buildJudgeReport(
  source: {
    reportId: string;
    generatedAt: string;
    comparisonId: string;
    city1: string;
    city2: string;
    city1Country?: string;
    city2Country?: string;
    videoUrl?: string;
    videoStatus?: string;
    summaryOfFindings: {
      city1Score: number;
      city1Trend?: string;
      city2Score: number;
      city2Trend?: string;
      overallConfidence: string;
    };
    categoryAnalysis?: JudgeReport['categoryAnalysis'];
    executiveSummary: {
      recommendation: string;
      rationale: string;
      keyFactors?: string[];
      futureOutlook?: string;
      confidenceLevel?: string;
    };
    freedomEducation?: FreedomEducationData;
    userId?: string;
  },
  overrides?: Partial<Pick<JudgeReport, 'userId' | 'videoUrl' | 'videoStatus'>>
): JudgeReport {
  // Proactive video URL expiration check
  let videoUrl = overrides?.videoUrl ?? source.videoUrl;
  let videoStatus = overrides?.videoStatus ?? source.videoStatus;
  if (videoUrl && (videoUrl.includes('replicate.delivery') || videoUrl.includes('klingai.com'))) {
    videoUrl = undefined;
    videoStatus = 'error';
  }

  return {
    reportId: source.reportId,
    generatedAt: source.generatedAt,
    userId: overrides?.userId ?? source.userId,
    comparisonId: source.comparisonId,
    city1: source.city1,
    city2: source.city2,
    city1Country: source.city1Country,
    city2Country: source.city2Country,
    videoUrl,
    videoStatus: (videoStatus || 'pending') as 'pending' | 'generating' | 'ready' | 'error',
    summaryOfFindings: {
      city1Score: source.summaryOfFindings.city1Score,
      city1Trend: (source.summaryOfFindings.city1Trend || 'stable') as 'improving' | 'stable' | 'declining',
      city2Score: source.summaryOfFindings.city2Score,
      city2Trend: (source.summaryOfFindings.city2Trend || 'stable') as 'improving' | 'stable' | 'declining',
      overallConfidence: source.summaryOfFindings.overallConfidence as 'high' | 'medium' | 'low',
    },
    categoryAnalysis: source.categoryAnalysis || [],
    executiveSummary: {
      recommendation: source.executiveSummary.recommendation as 'city1' | 'city2' | 'tie',
      rationale: source.executiveSummary.rationale,
      keyFactors: source.executiveSummary.keyFactors || [],
      futureOutlook: source.executiveSummary.futureOutlook || '',
      confidenceLevel: (source.executiveSummary.confidenceLevel || source.summaryOfFindings.overallConfidence) as 'high' | 'medium' | 'low',
    },
    freedomEducation: source.freedomEducation,
  };
}

// ============================================================================
// PERSISTENCE KEY — survives tab switches
// ============================================================================
const LAST_JUDGE_COMPARISON_KEY = 'lifescore_last_judge_comparison';

// ============================================================================
// TYPES
// ============================================================================

// Import FreedomEducation types
import type { FreedomEducationData } from '../types/freedomEducation';

export interface JudgeReport {
  reportId: string;
  generatedAt: string;
  userId?: string;
  comparisonId: string;
  city1: string;
  city2: string;
  city1Country?: string;
  city2Country?: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'ready' | 'error' | string;
  summaryOfFindings: {
    city1Score: number;
    city1Trend?: 'improving' | 'stable' | 'declining';
    city2Score: number;
    city2Trend?: 'improving' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low' | string;
  };
  categoryAnalysis?: {
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];
  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie' | string;
    rationale: string;
    keyFactors?: string[];
    futureOutlook?: string;
    confidenceLevel?: 'high' | 'medium' | 'low' | string;
  };
  freedomEducation?: FreedomEducationData;
}

interface JudgeTabProps {
  comparisonResult: EnhancedComparisonResult | ComparisonResult | null;
  userId?: string;
  // FIX 2026-02-08: Accept a saved Judge report to load directly
  savedJudgeReport?: SavedJudgeReport | null;
  onSavedReportLoaded?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const JudgeTab: React.FC<JudgeTabProps> = ({
  comparisonResult: propComparisonResult,
  userId = 'guest',
  savedJudgeReport,
  onSavedReportLoaded
}) => {
  const { supabaseUser, isAuthenticated, session } = useAuth();
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // FIX: Track video errors to detect expired Replicate URLs
  const [videoErrorCount, setVideoErrorCount] = useState(0);
  const MAX_VIDEO_ERRORS = 3;

  // Notification system
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Bottom display screen toggle — null means neither open
  const [openDisplay, setOpenDisplay] = useState<'court-order' | 'freedom-tour' | null>(null);

  // Confidence interval hover cards — which card is open
  const [hoverCard, setHoverCard] = useState<'city1' | 'city2' | 'confidence' | null>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const { createJob } = useJobTracker();

  // Video generation progress simulation (Replicate doesn't return %)
  const [videoProgress, setVideoProgress] = useState(0);
  const videoProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIX 2026-02-16: Track which comparisonId we've already loaded cached data for
  // Declared here so it's available to the prop-change reset effect below
  const checkedComparisonIdRef = useRef<string | null>(null);

  // Report selection state - allows user to select from saved comparisons
  // FIX: Restore from localStorage when prop is null (tab switch persistence)
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(() => {
    if (!propComparisonResult) {
      try {
        return localStorage.getItem(LAST_JUDGE_COMPARISON_KEY) || null;
      } catch { return null; }
    }
    return null;
  });

  // FIX 7.1: Memoize savedComparisons reads with refresh mechanism
  // This prevents stale reads while allowing refresh when data changes
  const [comparisonsRefreshKey, setComparisonsRefreshKey] = useState(0);
  const refreshComparisons = useCallback(() => setComparisonsRefreshKey(k => k + 1), []);

  // Memoized comparisons - only re-read when refreshKey changes
  const savedComparisons = useMemo(() => getLocalComparisons(), [comparisonsRefreshKey]);
  const savedEnhanced = useMemo(() => getLocalEnhancedComparisons(), [comparisonsRefreshKey]);

  // FIX: Auto-reset video when expired URL errors exceed threshold
  useEffect(() => {
    if (videoErrorCount >= MAX_VIDEO_ERRORS && judgeReport) {
      console.log('[JudgeTab] Video error threshold reached — clearing expired videoUrl');
      setJudgeReport(prev => prev ? { ...prev, videoUrl: undefined, videoStatus: 'error' as const } : null);
      setVideoErrorCount(0);
    }
  }, [videoErrorCount, judgeReport]);

  // Listen for storage events to refresh when data changes in another tab/component
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lifescore_saved_comparisons' || e.key === 'lifescore_saved_enhanced') {
        refreshComparisons();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshComparisons]);

  // FIX 2026-02-14: Persist selectedComparisonId so it survives tab switches
  useEffect(() => {
    try {
      if (selectedComparisonId) {
        localStorage.setItem(LAST_JUDGE_COMPARISON_KEY, selectedComparisonId);
      }
    } catch { /* ignore */ }
  }, [selectedComparisonId]);

  // FIX 2026-02-16: When the parent loads a DIFFERENT comparison (user ran a new comparison
  // or loaded one from Saved), reset stale Judge state so we don't show city A's report
  // under city B's header. The prop is the single source of truth when present.
  const prevPropComparisonIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const incomingId = propComparisonResult?.comparisonId || null;
    // Skip the very first render (ref is undefined) — only react to CHANGES
    if (prevPropComparisonIdRef.current === undefined) {
      prevPropComparisonIdRef.current = incomingId;
      return;
    }
    if (incomingId && incomingId !== prevPropComparisonIdRef.current) {
      console.log('[JudgeTab] Prop comparison changed:', prevPropComparisonIdRef.current, '→', incomingId, '— resetting stale state');
      // Clear manual dropdown selection so useMemo falls through to propComparisonResult
      setSelectedComparisonId(null);
      // Clear stale judge report so we don't show the old verdict under new cities
      setJudgeReport(null);
      setGenerationProgress(0);
      // Allow loadCachedData effect to run for the new comparisonId
      checkedComparisonIdRef.current = null;
      // Update localStorage to point to the new comparison
      try { localStorage.setItem(LAST_JUDGE_COMPARISON_KEY, incomingId); } catch { /* ignore */ }
    }
    prevPropComparisonIdRef.current = incomingId;
  }, [propComparisonResult?.comparisonId]);

  // FIX 2026-02-08: Load saved Judge report when passed from SavedComparisons
  // Fetches full report from Supabase to get complete data (categoryAnalysis, etc.)
  useEffect(() => {
    if (!savedJudgeReport) return;

    const loadReport = async () => {
      console.log('[JudgeTab] Loading saved Judge report:', savedJudgeReport.reportId);

      // Try to fetch the full report from Supabase
      const fullReport = await fetchFullJudgeReport(savedJudgeReport.reportId);

      if (fullReport) {
        console.log('[JudgeTab] Loaded full report from Supabase:', fullReport.reportId);
        const loadedReport = buildJudgeReport(fullReport, { userId: fullReport.userId || userId });
        setJudgeReport(loadedReport);
      } else {
        console.log('[JudgeTab] Full report not available from Supabase, checking localStorage...');

        // FIX 2026-02-14: Before falling back to empty data, check localStorage
        // for a full report that may have categoryAnalysis etc. intact.
        const localReports = getSavedJudgeReports();
        const localMatch = localReports.find(r => r.reportId === savedJudgeReport.reportId);

        // Use localStorage data if it has richer content (categoryAnalysis)
        const source = (localMatch?.categoryAnalysis && localMatch.categoryAnalysis.length > 0) ? localMatch : savedJudgeReport;
        const loadedReport = buildJudgeReport(source, { userId });
        setJudgeReport(loadedReport);

        if (localMatch?.categoryAnalysis && localMatch.categoryAnalysis.length > 0) {
          console.log('[JudgeTab] Loaded full report from localStorage fallback');
        } else {
          console.log('[JudgeTab] Using summary-only data (no categoryAnalysis available)');
        }
      }

      // Notify parent that we loaded the report
      if (onSavedReportLoaded) {
        onSavedReportLoaded();
      }
    };

    loadReport();
  }, [savedJudgeReport, userId, onSavedReportLoaded]);

  // FIX 2026-01-26: Track if report failed to load for user feedback
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);

  // FIX 2026-01-27: Compute comparison result without state updates during render
  // FIX 2026-02-14: Memoize lookup to avoid .find() on every render (INP optimisation)

  const { comparisonResult, computedError } = useMemo(() => {
    if (selectedComparisonId) {
      // Look up in saved standard comparisons
      const savedStd = savedComparisons.find(c => c.result?.comparisonId === selectedComparisonId);
      if (savedStd?.result) {
        if (savedStd.result.city1 && savedStd.result.city2) {
          return { comparisonResult: savedStd.result as EnhancedComparisonResult | ComparisonResult, computedError: null };
        }
        return { comparisonResult: null, computedError: 'Report data is corrupted - missing city information' };
      }
      // Look up in saved enhanced comparisons
      const savedEnh = savedEnhanced.find(c => c.result?.comparisonId === selectedComparisonId);
      if (savedEnh?.result) {
        if (savedEnh.result.city1 && savedEnh.result.city2) {
          return { comparisonResult: savedEnh.result as EnhancedComparisonResult | ComparisonResult, computedError: null };
        }
        return { comparisonResult: null, computedError: 'Report data is corrupted - missing city information' };
      }
      return { comparisonResult: null, computedError: 'Selected report not found - it may have been deleted' };
    }
    // No selection - use prop if available
    return { comparisonResult: (propComparisonResult || null) as EnhancedComparisonResult | ComparisonResult | null, computedError: null };
  }, [selectedComparisonId, savedComparisons, savedEnhanced, propComparisonResult]);

  // Sync error state via useEffect - only update when computedError changes
  // FIX 2026-02-14: Also clear stale localStorage key when comparison was deleted
  useEffect(() => {
    setReportLoadError(computedError);

    // If the selected comparison was deleted, clear the stale localStorage pointer
    // so next visit doesn't try to load a dead reference
    if (computedError && selectedComparisonId) {
      try {
        localStorage.removeItem(LAST_JUDGE_COMPARISON_KEY);
        console.log('[JudgeTab] Cleared stale LAST_JUDGE_COMPARISON_KEY for deleted comparison');
      } catch { /* ignore */ }
    }
  }, [computedError, selectedComparisonId]);

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
    checkExistingVideo,
    cancel: cancelVideoGeneration,
    error: videoError,
  } = useJudgeVideo();

  // Legacy video generation state (for backwards compatibility)
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');

  // Collapsible panel state — defaults: media open, others collapsed
  const [panelMediaOpen, setPanelMediaOpen] = useState(true);
  const [panelEvidenceOpen, setPanelEvidenceOpen] = useState(false);
  const [panelVerdictOpen, setPanelVerdictOpen] = useState(false);
  // Simulated video progress bar — runs during video generation (~90s estimated)
  // Steps: 0-15% storyboard, 15-40% audio, 40-85% rendering, 85-95% finalizing
  useEffect(() => {
    const generating = isGeneratingVideo || judgeReport?.videoStatus === 'generating';
    if (generating) {
      setVideoProgress(0);
      const startTime = Date.now();
      const ESTIMATED_TOTAL_MS = 90000; // ~90 seconds typical
      videoProgressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const raw = (elapsed / ESTIMATED_TOTAL_MS) * 92; // Cap at 92% until done
        setVideoProgress(Math.min(raw, 92));
      }, 500);
    } else {
      if (videoProgressRef.current) {
        clearInterval(videoProgressRef.current);
        videoProgressRef.current = null;
      }
      if (judgeReport?.videoStatus === 'ready') {
        setVideoProgress(100);
      } else {
        setVideoProgress(0);
      }
    }
    return () => {
      if (videoProgressRef.current) {
        clearInterval(videoProgressRef.current);
        videoProgressRef.current = null;
      }
    };
  }, [isGeneratingVideo, judgeReport?.videoStatus]);

  // Real-time clock for cockpit feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close hover card on outside click
  useEffect(() => {
    if (!hoverCard) return;
    const handler = (e: MouseEvent) => {
      if (hoverCardRef.current && !hoverCardRef.current.contains(e.target as Node)) {
        setHoverCard(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hoverCard]);

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

  // Toggle category expansion with scroll to top
  const toggleCategory = (categoryId: string) => {
    const isCurrentlyExpanded = expandedCategories.has(categoryId);

    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });

    // Scroll to top of section when expanding
    if (!isCurrentlyExpanded) {
      setTimeout(() => {
        const el = document.getElementById(`judge-category-${categoryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Generate video from judge report using Replicate (replaced D-ID)
  const generateJudgeVideo = async (report: JudgeReport) => {
    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin) {
      // Check usage limits before generating video
      const usageResult = await checkUsage('judgeVideos');
      if (!usageResult.allowed) {
        console.log('[JudgeTab] Judge video limit reached:', usageResult);
        setVideoGenerationProgress('');
        return;
      }

      // Increment usage counter before starting generation
      await incrementUsage('judgeVideos');
      console.log('[JudgeTab] Incremented judgeVideos usage');
    }

    // Prevent concurrent video generations
    if (isGeneratingVideo) {
      console.log('[JudgeTab] Video generation already in progress, cancelling previous');
      cancelVideoGeneration();
    }

    console.log('[JudgeTab] Starting Replicate video generation for report:', report.reportId);
    setVideoGenerationProgress('Initiating video generation...');

    // Build script for Cristiano to speak
    const rec = report.executiveSummary.recommendation;
    const isTie = rec === 'tie' ||
      Math.abs(report.summaryOfFindings.city1Score - report.summaryOfFindings.city2Score) < 0.5;

    // On tie: display city1 as slight leader (matches API behavior)
    const winner = isTie ? report.city1 :
      rec === 'city1' ? report.city1 : report.city2;
    const winnerScore = isTie ? report.summaryOfFindings.city1Score :
      rec === 'city1' ? report.summaryOfFindings.city1Score : report.summaryOfFindings.city2Score;
    const loserScore = isTie ? report.summaryOfFindings.city2Score :
      rec === 'city1' ? report.summaryOfFindings.city2Score : report.summaryOfFindings.city1Score;

    const tieScript = `Good day. I'm Cristiano, your LIFE SCORE Judge. After careful analysis of ${report.city1} versus ${report.city2}, I find this an exceptionally close case — both cities scored nearly identically at ${report.summaryOfFindings.city1Score} and ${report.summaryOfFindings.city2Score} respectively. ${report.executiveSummary.rationale} Key factors include: ${(report.executiveSummary.keyFactors || []).slice(0, 3).join(', ')}. For the future outlook: ${(report.executiveSummary.futureOutlook || '').slice(0, 200)}. This concludes my verdict.`;
    const winnerScript = `Good day. I'm Cristiano, your LIFE SCORE Judge. After careful analysis of ${report.city1} versus ${report.city2}, my verdict is clear. The winner is ${winner} with a freedom score of ${winnerScore} out of 100. ${report.executiveSummary.rationale} Key factors include: ${(report.executiveSummary.keyFactors || []).slice(0, 3).join(', ')}. For the future outlook: ${(report.executiveSummary.futureOutlook || '').slice(0, 200)}. This concludes my verdict.`;
    const script = isTie ? tieScript : winnerScript;

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

  // Show notify modal before generating
  const handleGenerateReportClick = () => {
    if (!comparisonResult || isGenerating) return;
    setShowNotifyModal(true);
  };

  const handleJudgeWaitHere = () => {
    handleGenerateReport();
  };

  const handleJudgeNotifyMe = async (channels: NotifyChannel[]) => {
    const city1 = comparisonResult?.city1?.city || '';
    const city2 = comparisonResult?.city2?.city || '';
    const jobId = await createJob({
      type: 'judge_verdict',
      payload: { city1, city2, comparisonId: comparisonResult?.comparisonId },
      notifyVia: channels,
    });
    if (jobId) {
      toastInfo(`We'll notify you when The Judge's Verdict is ready.`);
    }
    handleGenerateReport();
  };

  const handleGenerateReport = async () => {
    if (!comparisonResult) return;

    // Generation lock: Prevent concurrent report generations
    if (isGenerating) {
      console.log('[JudgeTab] Generation already in progress, ignoring request');
      return;
    }

    // Also check if video is still being generated
    if (isGeneratingVideo) {
      console.log('[JudgeTab] Video generation in progress, cancelling before new report');
      cancelVideoGeneration();
    }

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
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
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

  // Save report to localStorage via centralized service
  const saveReportToLocalStorage = (report: JudgeReport) => {
    saveJudgeReport(report);
    // FIX 2026-02-14: Also persist the comparisonId for tab-switch restoration
    try { localStorage.setItem(LAST_JUDGE_COMPARISON_KEY, report.comparisonId); } catch { /* ignore */ }
    console.log('[JudgeTab] Report saved to localStorage:', report.reportId);
  };

  // Load report from localStorage on mount (if we have a matching comparison)
  // Also check for pre-generated video
  // FIX: Only depend on comparisonId STRING, not the full object (which changes identity every render)
  const currentComparisonId = comparisonResult?.comparisonId || null;

  useEffect(() => {
    if (!currentComparisonId || !comparisonResult) return;

    // FIX 2026-01-29: Prevent runaway polling - only check once per comparisonId
    if (checkedComparisonIdRef.current === currentComparisonId) {
      console.log('[JudgeTab] Already checked this comparison, skipping:', currentComparisonId);
      return;
    }
    checkedComparisonIdRef.current = currentComparisonId;

    const loadCachedData = async () => {
      try {
        const existingReports = getSavedJudgeReports();

        // Find a report matching this comparison
        // FIX 2026-02-08: ONLY match by comparisonId, NOT by city names
        // Loose city name matching caused Berlin/Tampa report to load for Kansas City/Edinburgh
        const matchingReport = existingReports.find(r =>
          r.comparisonId === currentComparisonId
        );

        if (matchingReport) {
          console.log('[JudgeTab] Found cached report:', matchingReport.reportId);

          // FIX 2026-02-14: Proactive video URL expiration check.
          // Replicate delivery URLs expire after ~24h. Clear them now instead
          // of waiting for 3 consecutive video load errors.
          if (matchingReport.videoUrl &&
              (matchingReport.videoUrl.includes('replicate.delivery') ||
               matchingReport.videoUrl.includes('klingai.com'))) {
            console.log('[JudgeTab] Clearing expired provider video URL:', matchingReport.videoUrl.substring(0, 60));
            matchingReport.videoUrl = undefined;
            matchingReport.videoStatus = 'error';
            // Persist the cleanup
            saveReportToLocalStorage(matchingReport as JudgeReport);
          }

          setJudgeReport(matchingReport);

          // If report exists but no video, check for pre-generated video
          if (!matchingReport.videoUrl || matchingReport.videoStatus !== 'ready') {
            console.log('[JudgeTab] Checking for pre-generated video...');
            const existingVideo = await checkExistingVideo(currentComparisonId);
            if (existingVideo?.videoUrl) {
              console.log('[JudgeTab] Found pre-generated video:', existingVideo.videoUrl);
              const updatedReport: JudgeReport = {
                ...matchingReport,
                videoUrl: existingVideo.videoUrl,
                videoStatus: 'ready',
              };
              setJudgeReport(updatedReport);
              saveReportToLocalStorage(updatedReport);
            }
          }
        } else {
          // ════════════════════════════════════════════════════════════════
          // FIX 2026-02-14: SUPABASE FALLBACK
          // No match in localStorage — try Supabase before giving up.
          // This is the critical fix: saved comparisons loaded from the
          // list would show a blank judge page because the report was in
          // Supabase but not in localStorage.
          // ════════════════════════════════════════════════════════════════
          console.log('[JudgeTab] No local report match. Trying Supabase fallback...');

          // Strategy 1: Lookup by comparisonId in Supabase
          let supabaseReport = await fetchJudgeReportByComparisonId(currentComparisonId);

          // Strategy 2: Lookup by city names (covers different-session comparisonIds)
          if (!supabaseReport && comparisonResult.city1?.city && comparisonResult.city2?.city) {
            console.log('[JudgeTab] Supabase comparisonId miss. Trying city name lookup...');
            supabaseReport = await fetchJudgeReportByCities(
              comparisonResult.city1.city,
              comparisonResult.city2.city
            );
          }

          if (supabaseReport) {
            console.log('[JudgeTab] Supabase fallback found report:', supabaseReport.reportId);
            const loadedReport = buildJudgeReport(
              {
                ...supabaseReport,
                comparisonId: currentComparisonId,
                summaryOfFindings: {
                  city1Score: supabaseReport.summaryOfFindings?.city1Score || 0,
                  city1Trend: supabaseReport.summaryOfFindings?.city1Trend || 'stable',
                  city2Score: supabaseReport.summaryOfFindings?.city2Score || 0,
                  city2Trend: supabaseReport.summaryOfFindings?.city2Trend || 'stable',
                  overallConfidence: supabaseReport.summaryOfFindings?.overallConfidence || 'medium',
                },
                executiveSummary: {
                  recommendation: supabaseReport.executiveSummary?.recommendation || 'tie',
                  rationale: supabaseReport.executiveSummary?.rationale || '',
                  keyFactors: supabaseReport.executiveSummary?.keyFactors || [],
                  futureOutlook: supabaseReport.executiveSummary?.futureOutlook || '',
                  confidenceLevel: supabaseReport.executiveSummary?.confidenceLevel || 'medium',
                },
              },
              { userId: supabaseReport.userId || userId }
            );

            setJudgeReport(loadedReport);
            // Cache to localStorage so next time it loads instantly
            saveReportToLocalStorage(loadedReport);
            console.log('[JudgeTab] Supabase report cached to localStorage');
          } else {
            // No report anywhere — check if there's a pre-generated video waiting
            console.log('[JudgeTab] No report in localStorage or Supabase.');
            const existingVideo = await checkExistingVideo(currentComparisonId);
            if (existingVideo) {
              console.log('[JudgeTab] Found pre-generated video (no report yet):', existingVideo.status);
            }
          }
        }
      } catch (error) {
        console.error('[JudgeTab] Failed to load cached data:', error);
      }
    };

    loadCachedData();
  }, [currentComparisonId]); // FIX: Only depend on the ID string, not full object or callback

  // FIX: Auto-play video when a cached report with video loads
  useEffect(() => {
    if (judgeReport?.videoUrl && judgeReport.videoStatus === 'ready' && videoRef.current) {
      // Small delay to ensure the <video> element has mounted and src is set
      const timer = setTimeout(() => {
        if (videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            console.log('[JudgeTab] Auto-playing cached video');
          }).catch((err) => {
            // Browser may block autoplay - that's OK, user can click play
            console.log('[JudgeTab] Autoplay blocked by browser:', err.message);
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [judgeReport?.videoUrl, judgeReport?.videoStatus]);

  // Save report to Supabase (for authenticated users)
  const saveReportToSupabase = async (report: JudgeReport): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      console.log('[JudgeTab] Supabase not configured, skipping cloud save');
      return false;
    }

    // Use auth context user instead of API call (avoids AbortError issues)
    if (!isAuthenticated || !supabaseUser) {
      console.log('[JudgeTab] No authenticated user, skipping Supabase save');
      return false;
    }

    const user = supabaseUser;

    try {

      // Check if report already exists (with timeout)
      // FIX 2026-01-29: Use maybeSingle() - report may not exist yet
      const { data: existing } = await withTimeout(
        supabase
          .from('judge_reports')
          .select('id')
          .eq('report_id', report.reportId)
          .maybeSingle()
      );

      if (existing) {
        // Update existing report (with timeout)
        // FIX 2026-02-08: Include city names in UPDATE to prevent metadata/content mismatch
        const { error } = await withTimeout(
          supabase
            .from('judge_reports')
            .update({
              city1: report.city1,
              city2: report.city2,
              city1_score: report.summaryOfFindings.city1Score,
              city1_trend: report.summaryOfFindings.city1Trend || null,
              city2_score: report.summaryOfFindings.city2Score,
              city2_trend: report.summaryOfFindings.city2Trend || null,
              winner: report.executiveSummary.recommendation === 'city1' ? report.city1
                : report.executiveSummary.recommendation === 'city2' ? report.city2 : 'tie',
              winner_score: Math.max(report.summaryOfFindings.city1Score, report.summaryOfFindings.city2Score),
              margin: Math.abs(report.summaryOfFindings.city1Score - report.summaryOfFindings.city2Score),
              key_findings: report.executiveSummary.keyFactors || [],
              category_analysis: report.categoryAnalysis || [],
              verdict: report.executiveSummary.recommendation,
              full_report: report,
              // Only save permanent URLs — skip stale provider CDN URLs
              video_url: report.videoUrl && !report.videoUrl.includes('replicate.delivery') && !report.videoUrl.includes('klingai.com')
                ? report.videoUrl : null,
              comparison_id: report.comparisonId || null,
            })
            .eq('report_id', report.reportId)
        );

        if (error) throw error;
        console.log('[JudgeTab] Report updated in Supabase:', report.reportId);
      } else {
        // Insert new report (with timeout)
        const { error } = await withTimeout(
          supabase
            .from('judge_reports')
            .insert({
              user_id: user.id,
              report_id: report.reportId,
              city1: report.city1,
              city2: report.city2,
              city1_score: report.summaryOfFindings.city1Score,
              city1_trend: report.summaryOfFindings.city1Trend || null,
              city2_score: report.summaryOfFindings.city2Score,
              city2_trend: report.summaryOfFindings.city2Trend || null,
              winner: report.executiveSummary.recommendation === 'city1' ? report.city1
                : report.executiveSummary.recommendation === 'city2' ? report.city2 : 'tie',
              winner_score: Math.max(report.summaryOfFindings.city1Score, report.summaryOfFindings.city2Score),
              margin: Math.abs(report.summaryOfFindings.city1Score - report.summaryOfFindings.city2Score),
              key_findings: report.executiveSummary.keyFactors || [],
              category_analysis: report.categoryAnalysis || [],
              verdict: report.executiveSummary.recommendation,
              full_report: report,
              // Only save permanent URLs — skip stale provider CDN URLs
              video_url: report.videoUrl && !report.videoUrl.includes('replicate.delivery') && !report.videoUrl.includes('klingai.com')
                ? report.videoUrl : null,
              comparison_id: report.comparisonId || null,
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

    // Save to localStorage (deferred to avoid blocking UI)
    saveReportToLocalStorage(judgeReport);

    // Save to Supabase for authenticated users
    const savedToCloud = await saveReportToSupabase(judgeReport);

    if (savedToCloud) {
      toastSuccess(`Report ${judgeReport.reportId} saved to your account!`);
    } else {
      toastSuccess(`Report ${judgeReport.reportId} saved locally. Sign in to save to cloud.`);
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
        toastError('Video not yet available. Generate video report first.');
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
      `Confidence: ${(judgeReport.executiveSummary.confidenceLevel || 'medium').toUpperCase()}\n\n` +
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
        toastSuccess('Report summary copied to clipboard!');
      }).catch(() => {
        toastError('Unable to copy to clipboard.');
      });
    }
  };

  // Generate PDF content as HTML (can be printed to PDF)
  const generatePDFContent = (report: JudgeReport): string => {
    const winner = report.executiveSummary.recommendation === 'city1' ? report.city1 :
      report.executiveSummary.recommendation === 'city2' ? report.city2 : 'TIE';
    const e = escapeHtml; // alias for readability

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LIFE SCORE™ Judge's Report - ${e(report.reportId)}</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #0a1628; color: #f8fafc; }
    h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #c9a227; margin-top: 30px; }
    h3 { color: #64748b; }
    .verdict { background: linear-gradient(135deg, #0d2847 0%, #1e3a5f 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
    .verdict h2 { color: #d4af37; margin: 0; font-size: 2em; }
    .score-card { display: inline-block; padding: 15px 25px; margin: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; }
    .score-value { font-size: 2.5em; font-weight: bold; color: #10b981; }
    .trend-improving { color: #22c55e; }
    .trend-declining { color: #ef4444; }
    .trend-stable { color: #f59e0b; }
    .category { background: rgba(255,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #c9a227; }
    .key-factor { background: rgba(212,175,55,0.1); padding: 10px 15px; margin: 5px 0; border-radius: 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #64748b; text-align: center; color: #64748b; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>⚖️ LIFE SCORE™ Judge's Report</h1>
  <p><strong>Report ID:</strong> ${e(report.reportId)}<br>
  <strong>Generated:</strong> ${e(new Date(report.generatedAt).toLocaleString())}<br>
  <strong>User ID:</strong> ${e(report.userId || 'N/A')}</p>

  <div class="verdict">
    <h3>THE JUDGE'S VERDICT</h3>
    <h2>🏆 ${e(winner)}</h2>
    <p>Confidence: <strong>${e((report.executiveSummary.confidenceLevel || 'medium').toUpperCase())}</strong></p>
  </div>

  <h2>📊 Summary of Findings</h2>
  <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
    <div class="score-card">
      <h3>${e(report.city1)}</h3>
      <div class="score-value">${report.summaryOfFindings.city1Score}</div>
      <div class="trend-${e(report.summaryOfFindings.city1Trend || 'stable')}">
        ${report.summaryOfFindings.city1Trend === 'improving' ? '↗️ Improving' :
          report.summaryOfFindings.city1Trend === 'declining' ? '↘️ Declining' : '→ Stable'}
      </div>
    </div>
    <div class="score-card">
      <h3>${e(report.city2)}</h3>
      <div class="score-value">${report.summaryOfFindings.city2Score}</div>
      <div class="trend-${e(report.summaryOfFindings.city2Trend || 'stable')}">
        ${report.summaryOfFindings.city2Trend === 'improving' ? '↗️ Improving' :
          report.summaryOfFindings.city2Trend === 'declining' ? '↘️ Declining' : '→ Stable'}
      </div>
    </div>
  </div>

  <h2>📖 Detailed Category Analysis</h2>
  ${(report.categoryAnalysis || []).map(cat => `
    <div class="category">
      <h3>${e(cat.categoryName)}</h3>
      <p><strong>${e(report.city1)}:</strong> ${e(cat.city1Analysis)}</p>
      <p><strong>${e(report.city2)}:</strong> ${e(cat.city2Analysis)}</p>
      <p><em>📈 Trend: ${e(cat.trendNotes)}</em></p>
    </div>
  `).join('')}

  <h2>🏆 Executive Summary</h2>
  <p>${e(report.executiveSummary.rationale)}</p>

  <h3>Key Factors</h3>
  ${(report.executiveSummary.keyFactors || []).map(f => `<div class="key-factor">◈ ${e(f)}</div>`).join('')}

  <h3>Future Outlook</h3>
  <p>${e(report.executiveSummary.futureOutlook || '')}</p>

  <div class="footer">
    <p>LIFE SCORE™ - The Judge's Verdict<br>
    Powered by Claude Opus 4.5<br>
    © 2025-2026 Clues Intelligence LTD</p>
  </div>
</body>
</html>`;
  };

  // Trend icon helper
  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return '↗️';
      case 'stable': return '→';
      case 'declining': return '↘️';
    }
  };

  const getTrendClass = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return 'trend-improving';
      case 'stable': return 'trend-stable';
      case 'declining': return 'trend-declining';
    }
  };

  // ── Confidence interval stats for hover cards ──
  const getConfidenceStats = (cityKey: 'city1' | 'city2') => {
    const enhanced = comparisonResult as EnhancedComparisonResult | null;
    const cityData = enhanced?.[cityKey];
    if (!cityData?.categories) return null;

    const allMetrics = cityData.categories.flatMap(c => c.metrics || []);
    const scored = allMetrics.filter(m => m.consensusScore != null && !m.isMissing);
    const totalPossible = allMetrics.length;
    const stdDevs = scored.map(m => m.standardDeviation).filter((s): s is number => s != null);
    const avgStdDev = stdDevs.length ? stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length : null;

    // Count agreement levels
    const unanimous = scored.filter(m => m.confidenceLevel === 'unanimous').length;
    const strong = scored.filter(m => m.confidenceLevel === 'strong').length;
    const moderate = scored.filter(m => m.confidenceLevel === 'moderate').length;
    const split = scored.filter(m => m.confidenceLevel === 'split').length;

    return {
      metricsEvaluated: scored.length,
      totalMetrics: totalPossible,
      overallAgreement: cityData.overallAgreement,
      avgStdDev,
      unanimous,
      strong,
      moderate,
      split,
      llmsUsed: enhanced?.llmsUsed?.length ?? 0,
      scoreDifference: enhanced?.scoreDifference ?? null,
    };
  };

  const confidenceExplanation = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'Multiple LLMs reached strong consensus with low disagreement across metrics.';
      case 'medium':
        return 'LLMs showed moderate agreement. Some metrics had notable variation in scores.';
      case 'low':
        return 'LLMs disagreed significantly on several metrics. Results should be treated as estimates.';
      default:
        return 'Confidence level pending analysis.';
    }
  };

  // ── Shared hover card renderer for city score confidence ──
  const renderCityConfidenceCard = (cityKey: 'city1' | 'city2') => {
    const stats = getConfidenceStats(cityKey);
    return (
      <div className="confidence-hover-card" ref={hoverCardRef}>
        <div className="hover-card-header">
          <span className="hover-card-title">Score Confidence</span>
          <button className="hover-card-close" onClick={() => setHoverCard(null)}>×</button>
        </div>
        {stats ? (
          <div className="hover-card-body">
            <div className="hover-card-row">
              <span className="hover-card-label">Metrics Evaluated</span>
              <span className="hover-card-value">{stats.metricsEvaluated} / {stats.totalMetrics}</span>
            </div>
            <div className="hover-card-row">
              <span className="hover-card-label">LLMs Used</span>
              <span className="hover-card-value">{stats.llmsUsed}</span>
            </div>
            <div className="hover-card-row">
              <span className="hover-card-label">Overall Agreement</span>
              <span className="hover-card-value">{stats.overallAgreement != null ? `${Math.round(stats.overallAgreement)}%` : '—'}</span>
            </div>
            {stats.avgStdDev != null && (
              <div className="hover-card-row">
                <span className="hover-card-label">Avg Std Deviation</span>
                <span className="hover-card-value">{stats.avgStdDev.toFixed(1)}</span>
              </div>
            )}
            <div className="hover-card-agreement-bar">
              <div className="agreement-segment unanimous" style={{ flex: stats.unanimous }} title={`Unanimous: ${stats.unanimous}`} />
              <div className="agreement-segment strong" style={{ flex: stats.strong }} title={`Strong: ${stats.strong}`} />
              <div className="agreement-segment moderate" style={{ flex: stats.moderate }} title={`Moderate: ${stats.moderate}`} />
              <div className="agreement-segment split" style={{ flex: stats.split }} title={`Split: ${stats.split}`} />
            </div>
            <div className="hover-card-legend">
              <span className="legend-item"><span className="legend-dot unanimous" />Unanimous</span>
              <span className="legend-item"><span className="legend-dot strong" />Strong</span>
              <span className="legend-item"><span className="legend-dot moderate" />Moderate</span>
              <span className="legend-item"><span className="legend-dot split" />Split</span>
            </div>
          </div>
        ) : (
          <div className="hover-card-body">
            <p className="hover-card-empty">Detailed consensus data not available for this comparison.</p>
          </div>
        )}
      </div>
    );
  };

  // ── Shared option groups for report selector dropdowns ──
  const reportOptionGroups = (
    <>
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
    </>
  );

  // Saved report is loading from Supabase — show brief loading state
  if (!comparisonResult && !judgeReport && savedJudgeReport) {
    return (
      <div className="judge-tab">
        <div className="judge-no-data">
          <div className="no-data-icon">⚖️</div>
          <h3>Loading Judge Report...</h3>
          <p>{savedJudgeReport.city1} vs {savedJudgeReport.city2}</p>
        </div>
      </div>
    );
  }

  // No comparison data state - show report selector dropdown
  // Skip this gate when a saved Judge report has been loaded into state.
  if (!comparisonResult && !judgeReport) {
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
                value={selectedComparisonId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedComparisonId(value === '' ? null : value);
                  startTransition(() => {
                    cancelVideoGeneration();
                    checkedComparisonIdRef.current = null;
                  });
                }}
              >
                <option value="">Choose a report...</option>
                {reportOptionGroups}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FIX 2026-02-08: Use judgeReport's city names when viewing saved report
  // This prevents showing wrong cities (e.g., Bern/Mesa for Baltimore/Bratislava)
  const city1Name = judgeReport?.city1 || comparisonResult?.city1?.city || 'City 1';
  const city2Name = judgeReport?.city2 || comparisonResult?.city2?.city || 'City 2';
  // FIX 2026-02-10: Country must come from the SAME source as the city name.
  // Priority: judgeReport's own country > matching comparisonResult > ALL_METROS lookup
  const city1Country = judgeReport?.city1Country
    || (comparisonResult?.city1?.city === city1Name ? comparisonResult.city1.country : '')
    || ALL_METROS.find(m => m.city === city1Name)?.country
    || '';
  const city2Country = judgeReport?.city2Country
    || (comparisonResult?.city2?.city === city2Name ? comparisonResult.city2.country : '')
    || ALL_METROS.find(m => m.city === city2Name)?.country
    || '';
  // Region (state/province) from metro data
  const city1Region = ALL_METROS.find(m => m.city === city1Name && m.country === city1Country)?.region
    || ALL_METROS.find(m => m.city === city1Name)?.region
    || '';
  const city2Region = ALL_METROS.find(m => m.city === city2Name && m.country === city2Country)?.region
    || ALL_METROS.find(m => m.city === city2Name)?.region
    || '';
  const reportId = judgeReport?.reportId
    || `LIFE-JDG-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${userId.slice(0,8).toUpperCase()}`;

  // Pre-compute winner/loser derived values to avoid repeating the same ternary 9+ times
  const verdict = useMemo(() => {
    if (!judgeReport) return null;
    const rec = judgeReport.executiveSummary.recommendation;
    const isCity1 = rec === 'city1';
    const isCity2 = rec === 'city2';
    return {
      winnerCity: isCity1 ? city1Name : isCity2 ? city2Name : city1Name,
      loserCity: isCity1 ? city2Name : isCity2 ? city1Name : city2Name,
      winnerCountry: isCity1 ? city1Country : isCity2 ? city2Country : city1Country,
      winnerRegion: isCity1 ? city1Region : isCity2 ? city2Region : city1Region,
      winnerScore: isCity1
        ? judgeReport.summaryOfFindings.city1Score
        : isCity2
        ? judgeReport.summaryOfFindings.city2Score
        : judgeReport.summaryOfFindings.city1Score,
      winnerCategories: (() => {
        const cats = isCity1
          ? comparisonResult?.city1?.categories
          : isCity2
          ? comparisonResult?.city2?.categories
          : comparisonResult?.city1?.categories;
        // Normalize: Enhanced uses averageConsensusScore, Standard uses averageScore
        return cats?.map(c => ({
          categoryId: c.categoryId,
          averageScore: 'averageScore' in c ? c.averageScore : ('averageConsensusScore' in c ? c.averageConsensusScore : null),
        }));
      })(),
    };
  }, [judgeReport, city1Name, city2Name, city1Country, city2Country, city1Region, city2Region, comparisonResult]);

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
            value={selectedComparisonId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              // Urgent: update select value immediately so the UI reflects the choice
              setSelectedComparisonId(value === '' ? null : value);
              // Non-urgent: defer heavy state updates to avoid blocking paint (INP fix)
              startTransition(() => {
                cancelVideoGeneration();
                checkedComparisonIdRef.current = null;
                setJudgeReport(null);
                setIsPlaying(false);
                setCurrentVideoTime(0);
                setVideoDuration(0);
              });
            }}
          >
            <option value="">
              {propComparisonResult
                ? `Current: ${propComparisonResult.city1?.city || 'City 1'} vs ${propComparisonResult.city2?.city || 'City 2'}`
                : 'Select a report...'}
            </option>
            {reportOptionGroups}
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
          PANEL: JUDGE'S VIDEO & MEDIA
      ═══════════════════════════════════════════════════════════════════ */}
      <div className={`collapsible-panel ${panelMediaOpen ? 'open' : ''}`}>
        <button
          className="panel-header-bar"
          onClick={() => setPanelMediaOpen(prev => !prev)}
        >
          <span className="panel-icon">🎬</span>
          <span className="panel-title">JUDGE'S VIDEO & MEDIA</span>
          <span className="panel-summary">
            {judgeReport?.videoStatus === 'ready' ? 'Video ready' :
             isGeneratingVideo ? 'Generating...' :
             judgeReport ? 'Video pending' : 'Awaiting verdict'}
          </span>
          <span className={`panel-chevron ${panelMediaOpen ? 'open' : ''}`}>▼</span>
        </button>
        <div className="panel-content" style={{ display: panelMediaOpen ? 'block' : 'none' }}>

      {/* Phone call audio warning (mobile only) */}
      <VideoPhoneWarning />

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
                  playsInline
                  autoPlay
                  onTimeUpdate={() => setCurrentVideoTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => {
                    setVideoDuration(videoRef.current?.duration || 0);
                    console.log('[JudgeTab] Video loaded, duration:', videoRef.current?.duration);
                  }}
                  onCanPlay={() => {
                    // FIX: Auto-play when video is ready (e.g. loaded from cache)
                    if (videoRef.current && videoRef.current.paused) {
                      videoRef.current.play().then(() => {
                        setIsPlaying(true);
                      }).catch(() => {
                        // Autoplay blocked - user can click play
                      });
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onError={(e) => {
                    console.error('[JudgeTab] Video error:', e.currentTarget.error?.message);
                    console.error('[JudgeTab] Video URL was:', judgeReport.videoUrl);
                    setVideoErrorCount(prev => prev + 1);
                  }}
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
                        {videoGenerationProgress || (
                          videoProgress < 15 ? 'Building storyboard...' :
                          videoProgress < 40 ? 'Generating audio narration...' :
                          videoProgress < 85 ? 'Rendering Cristiano video...' :
                          'Finalizing and uploading...'
                        )}
                      </div>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill video-progress"
                          style={{ width: `${videoProgress}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">{Math.round(videoProgress)}% Complete</div>
                      <button
                        className="cancel-video-btn"
                        onClick={() => cancelVideoGeneration()}
                      >
                        <span className="btn-icon">✕</span>
                        <span className="btn-text">CANCEL VIDEO</span>
                      </button>
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
                      <div className="awaiting-text">CRISTIANO</div>
                      <div className="awaiting-subtext">Judge's Video Report</div>
                      <button
                        className="generate-report-btn"
                        onClick={handleGenerateReportClick}
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
              <button
                className="control-btn"
                onClick={() => handleSkip(-10)}
                title="Rewind 10s"
                disabled={!judgeReport?.videoUrl || videoDuration === 0}
              >
                <span>⏮️</span>
              </button>
              <button
                className="control-btn"
                onClick={() => handleSkip(-5)}
                title="Back 5s"
                disabled={!judgeReport?.videoUrl || videoDuration === 0}
              >
                <span>◀️</span>
              </button>
              <button
                className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayPause}
                disabled={!judgeReport?.videoUrl}
              >
                <span>{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              <button
                className="control-btn"
                onClick={() => handleSkip(5)}
                title="Forward 5s"
                disabled={!judgeReport?.videoUrl || videoDuration === 0}
              >
                <span>▶️</span>
              </button>
              <button
                className="control-btn"
                onClick={() => handleSkip(10)}
                title="Forward 10s"
                disabled={!judgeReport?.videoUrl || videoDuration === 0}
              >
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
          <span className="btn-text btn-text-full">SAVE REPORT</span>
          <span className="btn-text btn-text-short">SAVE</span>
        </button>
        <button
          className="action-btn download-btn"
          onClick={() => handleDownloadReport('pdf')}
          disabled={!judgeReport}
        >
          <span className="btn-icon">📄</span>
          <span className="btn-text btn-text-full">DOWNLOAD PDF</span>
          <span className="btn-text btn-text-short">PDF</span>
        </button>
        <button
          className="action-btn download-btn"
          onClick={() => handleDownloadReport('video')}
          disabled={!judgeReport?.videoUrl}
        >
          <span className="btn-icon">🎬</span>
          <span className="btn-text btn-text-full">DOWNLOAD VIDEO</span>
          <span className="btn-text btn-text-short">VIDEO</span>
        </button>
        <button
          className="action-btn forward-btn"
          onClick={handleForwardReport}
          disabled={!judgeReport}
        >
          <span className="btn-icon">📤</span>
          <span className="btn-text btn-text-full">FORWARD</span>
          <span className="btn-text btn-text-short">SHARE</span>
        </button>
      </section>

        </div>{/* end panel-content: media */}
      </div>{/* end collapsible-panel: media */}

      {/* ═══════════════════════════════════════════════════════════════════
          PANEL: EVIDENCE & ANALYSIS
      ═══════════════════════════════════════════════════════════════════ */}
      <div className={`collapsible-panel ${panelEvidenceOpen ? 'open' : ''}`}>
        <button
          className="panel-header-bar"
          onClick={() => setPanelEvidenceOpen(prev => !prev)}
        >
          <span className="panel-icon">📊</span>
          <span className="panel-title">EVIDENCE & ANALYSIS</span>
          <span className="panel-summary">
            {judgeReport
              ? `${city1Name} ${judgeReport.summaryOfFindings.city1Score} vs ${city2Name} ${judgeReport.summaryOfFindings.city2Score}`
              : 'Awaiting verdict'}
          </span>
          <span className={`panel-chevron ${panelEvidenceOpen ? 'open' : ''}`}>▼</span>
        </button>
        <div className="panel-content" style={{ display: panelEvidenceOpen ? 'block' : 'none' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          SUMMARY OF FINDINGS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="findings-section">

        <div className="findings-grid">
          {/* ── CITY 1 CARD ── */}
          <div className="finding-card city1">
            <div className="card-header">
              <span className="city-name">{city1Name}</span>
              {city1Region && <span className="city-region">{city1Region}</span>}
              <span className="city-country">
                {city1Country && (
                  <img className="city-flag-img" src={getFlagUrl(city1Country)} alt={city1Country} width={20} height={15} loading="lazy" />
                )}
                {city1Country}
              </span>
            </div>
            <div className="card-score hover-card-anchor">
              <span
                className="score-value score-clickable"
                onClick={() => setHoverCard(hoverCard === 'city1' ? null : 'city1')}
                title="Tap for confidence details"
              >
                {judgeReport?.summaryOfFindings.city1Score ?? (comparisonResult?.city1?.city === city1Name ? getCityTotalScore(comparisonResult.city1) : 0)}
              </span>
              <span className="score-label">LIFE SCORE</span>
              <span className="score-tap-hint">tap score for details</span>

              {/* Hover Card — City 1 */}
              {hoverCard === 'city1' && renderCityConfidenceCard('city1')}
            </div>
            <div className={`card-trend ${judgeReport ? getTrendClass(judgeReport.summaryOfFindings.city1Trend || 'stable') : ''}`}>
              <span className="trend-icon">
                {judgeReport ? getTrendIcon(judgeReport.summaryOfFindings.city1Trend || 'stable') : '—'}
              </span>
              <span className="trend-label">
                {judgeReport?.summaryOfFindings.city1Trend?.toUpperCase() ?? 'PENDING ANALYSIS'}
              </span>
            </div>
          </div>

          {/* ── VS / CONFIDENCE CENTER CARD ── */}
          <div className="finding-card versus">
            <span className="versus-text">VS</span>
            <div className="confidence-badge hover-card-anchor">
              <span className="confidence-label">CONFIDENCE</span>
              <span
                className={`confidence-value confidence-clickable ${judgeReport?.summaryOfFindings.overallConfidence ?? 'pending'}`}
                onClick={() => setHoverCard(hoverCard === 'confidence' ? null : 'confidence')}
                title="Tap for confidence breakdown"
              >
                {judgeReport?.summaryOfFindings.overallConfidence?.toUpperCase() ?? 'PENDING'}
              </span>

              {/* Hover Card — Confidence explanation */}
              {hoverCard === 'confidence' && (() => {
                const conf = judgeReport?.summaryOfFindings.overallConfidence ?? 'pending';
                const enhanced = comparisonResult as EnhancedComparisonResult | null;
                return (
                  <div className="confidence-hover-card confidence-center-card" ref={hoverCardRef}>
                    <div className="hover-card-header">
                      <span className="hover-card-title">Confidence Level</span>
                      <button className="hover-card-close" onClick={() => setHoverCard(null)}>×</button>
                    </div>
                    <div className="hover-card-body">
                      <p className="hover-card-explanation">{confidenceExplanation(conf)}</p>
                      {enhanced?.scoreDifference != null && (
                        <div className="hover-card-row">
                          <span className="hover-card-label">Score Margin</span>
                          <span className="hover-card-value">{Math.round(enhanced.scoreDifference)} pts</span>
                        </div>
                      )}
                      {enhanced?.llmsUsed && (
                        <div className="hover-card-row">
                          <span className="hover-card-label">LLMs in Panel</span>
                          <span className="hover-card-value">{enhanced.llmsUsed.length}</span>
                        </div>
                      )}
                      {enhanced?.disagreementSummary && (
                        <div className="hover-card-disagreement">
                          <span className="hover-card-label">Key Disagreements</span>
                          <p className="hover-card-disagreement-text">{enhanced.disagreementSummary}</p>
                        </div>
                      )}
                      {judgeReport?.executiveSummary?.confidenceLevel && (
                        <div className="hover-card-row">
                          <span className="hover-card-label">Judge Confidence</span>
                          <span className={`hover-card-value conf-${judgeReport.executiveSummary.confidenceLevel}`}>
                            {judgeReport.executiveSummary.confidenceLevel.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── CITY 2 CARD ── */}
          <div className="finding-card city2">
            <div className="card-header">
              <span className="city-name">{city2Name}</span>
              {city2Region && <span className="city-region">{city2Region}</span>}
              <span className="city-country">
                {city2Country && (
                  <img className="city-flag-img" src={getFlagUrl(city2Country)} alt={city2Country} width={20} height={15} loading="lazy" />
                )}
                {city2Country}
              </span>
            </div>
            <div className="card-score hover-card-anchor">
              <span
                className="score-value score-clickable"
                onClick={() => setHoverCard(hoverCard === 'city2' ? null : 'city2')}
                title="Tap for confidence details"
              >
                {judgeReport?.summaryOfFindings.city2Score ?? (comparisonResult?.city2?.city === city2Name ? getCityTotalScore(comparisonResult.city2) : 0)}
              </span>
              <span className="score-label">LIFE SCORE</span>
              <span className="score-tap-hint">tap score for details</span>

              {/* Hover Card — City 2 */}
              {hoverCard === 'city2' && renderCityConfidenceCard('city2')}
            </div>
            <div className={`card-trend ${judgeReport ? getTrendClass(judgeReport.summaryOfFindings.city2Trend || 'stable') : ''}`}>
              <span className="trend-icon">
                {judgeReport ? getTrendIcon(judgeReport.summaryOfFindings.city2Trend || 'stable') : '—'}
              </span>
              <span className="trend-label">
                {judgeReport?.summaryOfFindings.city2Trend?.toUpperCase() ?? 'PENDING ANALYSIS'}
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
            const analysis = judgeReport?.categoryAnalysis?.find(a => a.categoryId === category.id);

            return (
              <div
                key={category.id}
                id={`judge-category-${category.id}`}
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

        </div>{/* end panel-content: evidence */}
      </div>{/* end collapsible-panel: evidence */}

      {/* ═══════════════════════════════════════════════════════════════════
          PANEL: VERDICT & ACTIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <div className={`collapsible-panel ${panelVerdictOpen ? 'open' : ''}`}>
        <button
          className="panel-header-bar"
          onClick={() => setPanelVerdictOpen(prev => !prev)}
        >
          <span className="panel-icon">⚖️</span>
          <span className="panel-title">VERDICT & ACTIONS</span>
          <span className="panel-summary">
            {judgeReport?.executiveSummary
              ? `🏆 ${judgeReport.executiveSummary.recommendation === 'city1' ? city1Name
                  : judgeReport.executiveSummary.recommendation === 'city2' ? city2Name
                  : 'TIE'}`
              : 'Verdict pending'}
          </span>
          <span className={`panel-chevron ${panelVerdictOpen ? 'open' : ''}`}>▼</span>
        </button>
        <div className="panel-content" style={{ display: panelVerdictOpen ? 'block' : 'none' }}>

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
                <span className={`verdict-confidence ${judgeReport.executiveSummary.confidenceLevel || 'medium'}`}>
                  {(judgeReport.executiveSummary.confidenceLevel || 'medium').toUpperCase()} CONFIDENCE
                </span>
              </div>

              <div className="rationale-section">
                <h3 className="rationale-header">Rationale</h3>
                <p className="rationale-text">{judgeReport.executiveSummary.rationale}</p>
              </div>

              <div className="key-factors-section">
                <h3 className="factors-header">Key Factors</h3>
                <ul className="factors-list">
                  {(judgeReport.executiveSummary.keyFactors || []).map((factor, idx) => (
                    <li key={idx} className="factor-item">
                      <span className="factor-bullet">◈</span>
                      <span className="factor-text">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="outlook-section">
                <h3 className="outlook-header">Future Outlook</h3>
                <p className="outlook-text">{judgeReport.executiveSummary.futureOutlook || ''}</p>
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
                  <span className="feature-text">Video Report by Cristiano</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DISPLAY SCREEN BUTTONS — Two glassmorphic buttons at the bottom
          Left: Court Order Video | Right: My New City
          Click to expand the screen below. Click again to collapse.
      ═══════════════════════════════════════════════════════════════════ */}
      {judgeReport && (
        <>
          <div className="display-screen-buttons">
            <button
              className={`display-screen-btn${openDisplay === 'court-order' ? ' active' : ''}`}
              onClick={() => setOpenDisplay(openDisplay === 'court-order' ? null : 'court-order')}
            >
              <span className="display-screen-btn-icon">&#9878;</span>
              <span className="display-screen-btn-label">COURT ORDER VIDEO</span>
            </button>
            <button
              className={`display-screen-btn${openDisplay === 'freedom-tour' ? ' active' : ''}`}
              onClick={() => setOpenDisplay(openDisplay === 'freedom-tour' ? null : 'freedom-tour')}
            >
              <span className="display-screen-btn-icon">&#127757;</span>
              <span className="display-screen-btn-label">MY NEW CITY</span>
            </button>
          </div>

          {openDisplay === 'court-order' && (
            <section className="court-order-section">
              <CourtOrderVideo
                comparisonId={judgeReport.comparisonId || comparisonResult?.comparisonId || ''}
                winnerCity={verdict!.winnerCity}
                loserCity={verdict!.loserCity}
                winnerScore={verdict!.winnerScore}
                freedomEducation={judgeReport.freedomEducation}
              />
            </section>
          )}

          {openDisplay === 'freedom-tour' && (
            <section className="new-city-section">
              <GoToMyNewCity
                winnerCity={verdict!.winnerCity}
                winnerCountry={verdict!.winnerCountry}
                winnerRegion={verdict!.winnerRegion}
                winnerScore={verdict!.winnerScore}
                winnerCategories={verdict!.winnerCategories}
                executiveSummary={judgeReport.executiveSummary}
                categoryWinners={comparisonResult?.categoryWinners}
                comparisonId={judgeReport.comparisonId || comparisonResult?.comparisonId || ''}
              />
            </section>
          )}
        </>
      )}

        </div>{/* end panel-content: verdict */}
      </div>{/* end collapsible-panel: verdict */}

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

      {/* Notify Me Modal */}
      <NotifyMeModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        onWaitHere={handleJudgeWaitHere}
        onNotifyMe={handleJudgeNotifyMe}
        taskLabel="Judge's Verdict"
        estimatedSeconds={60}
      />
    </div>
  );
};

export default JudgeTab;
