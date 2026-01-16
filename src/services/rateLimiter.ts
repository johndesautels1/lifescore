/**
 * LIFE SCORE™ Rate Limiter & Retry Logic
 * Handles API rate limits gracefully across all LLM providers
 */

import type { LLMProvider } from '../types/enhancedComparison';

// ============================================================================
// RATE LIMIT CONFIGURATION PER PROVIDER
// ============================================================================

interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  retryAfterMs: number;
  maxRetries: number;
}

const RATE_LIMITS: Record<LLMProvider, RateLimitConfig> = {
  'claude-opus': {
    requestsPerMinute: 50,
    tokensPerMinute: 80000,
    retryAfterMs: 60000,
    maxRetries: 3
  },
  'claude-sonnet': {
    requestsPerMinute: 100,
    tokensPerMinute: 100000,
    retryAfterMs: 30000,
    maxRetries: 3
  },
  'gpt-5.2': {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    retryAfterMs: 60000,
    maxRetries: 3
  },
  'gemini-3-pro': {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
    retryAfterMs: 30000,
    maxRetries: 3
  },
  'grok-4': {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
    retryAfterMs: 60000,
    maxRetries: 3
  },
  'perplexity': {
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
    retryAfterMs: 60000,
    maxRetries: 3
  }
};

// ============================================================================
// REQUEST TRACKING
// ============================================================================

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

const requestHistory: Map<LLMProvider, RequestRecord[]> = new Map();

function getRecentRequests(provider: LLMProvider, windowMs: number = 60000): RequestRecord[] {
  const history = requestHistory.get(provider) || [];
  const cutoff = Date.now() - windowMs;
  return history.filter(r => r.timestamp > cutoff);
}

function recordRequest(provider: LLMProvider, tokens: number = 0): void {
  const history = requestHistory.get(provider) || [];
  history.push({ timestamp: Date.now(), tokens });

  // Keep only last minute of history
  const cutoff = Date.now() - 60000;
  const filtered = history.filter(r => r.timestamp > cutoff);
  requestHistory.set(provider, filtered);
}

// ============================================================================
// RATE LIMIT CHECK
// ============================================================================

export interface RateLimitStatus {
  canProceed: boolean;
  waitMs: number;
  reason?: string;
}

export function checkRateLimit(provider: LLMProvider): RateLimitStatus {
  const config = RATE_LIMITS[provider];
  const recent = getRecentRequests(provider);

  // Check request count
  if (recent.length >= config.requestsPerMinute) {
    const oldestRequest = recent[0];
    const waitMs = oldestRequest.timestamp + 60000 - Date.now();
    return {
      canProceed: false,
      waitMs: Math.max(0, waitMs),
      reason: `Rate limit: ${recent.length}/${config.requestsPerMinute} requests per minute`
    };
  }

  // Check token usage
  const totalTokens = recent.reduce((sum, r) => sum + r.tokens, 0);
  if (totalTokens >= config.tokensPerMinute) {
    const oldestRequest = recent[0];
    const waitMs = oldestRequest.timestamp + 60000 - Date.now();
    return {
      canProceed: false,
      waitMs: Math.max(0, waitMs),
      reason: `Token limit: ${totalTokens}/${config.tokensPerMinute} tokens per minute`
    };
  }

  return { canProceed: true, waitMs: 0 };
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export async function withRetry<T>(
  provider: LLMProvider,
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = RATE_LIMITS[provider];
  const maxRetries = options.maxRetries ?? config.maxRetries;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? config.retryAfterMs;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before proceeding
      const rateLimitStatus = checkRateLimit(provider);
      if (!rateLimitStatus.canProceed) {
        await sleep(rateLimitStatus.waitMs);
      }

      // Record the request attempt
      recordRequest(provider);

      // Execute the operation
      return await operation();

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error
      const isRateLimitError = isRateLimitResponse(lastError);

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        let delayMs = baseDelayMs * Math.pow(2, attempt);

        // If rate limit error, use the retry-after value
        if (isRateLimitError) {
          const retryAfter = extractRetryAfter(lastError);
          delayMs = retryAfter || config.retryAfterMs;
        }

        // Cap the delay
        delayMs = Math.min(delayMs, maxDelayMs);

        // Add jitter (0-25% of delay)
        delayMs += Math.random() * delayMs * 0.25;

        options.onRetry?.(attempt + 1, lastError, delayMs);

        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimitResponse(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded')
  );
}

function extractRetryAfter(error: Error): number | null {
  // Try to extract retry-after from error message
  const match = error.message.match(/retry[- ]?after[: ]*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10) * 1000; // Convert to ms
  }
  return null;
}

// ============================================================================
// BATCH REQUEST MANAGEMENT
// ============================================================================

interface BatchRequest<T> {
  id: string;
  provider: LLMProvider;
  operation: () => Promise<T>;
  priority: number;
}

interface BatchResult<T> {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
}

export async function executeBatch<T>(
  requests: BatchRequest<T>[],
  options: {
    maxConcurrent?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<BatchResult<T>[]> {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const results: BatchResult<T>[] = [];
  let completed = 0;

  // Sort by priority (higher = first)
  const sorted = [...requests].sort((a, b) => b.priority - a.priority);

  // Group by provider to respect rate limits
  const byProvider = new Map<LLMProvider, BatchRequest<T>[]>();
  sorted.forEach(req => {
    const list = byProvider.get(req.provider) || [];
    list.push(req);
    byProvider.set(req.provider, list);
  });

  // Execute with concurrency limit
  const executing: Promise<void>[] = [];

  for (const request of sorted) {
    const promise = (async () => {
      try {
        const result = await withRetry(
          request.provider,
          request.operation,
          { onRetry: (attempt, err, delay) => {
            console.log(`Retry ${attempt} for ${request.provider}: ${err.message}, waiting ${delay}ms`);
          }}
        );
        results.push({ id: request.id, success: true, result });
      } catch (error) {
        results.push({
          id: request.id,
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }

      completed++;
      options.onProgress?.(completed, requests.length);
    })();

    executing.push(promise);

    // Limit concurrency
    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false)
        ]);
        if (settled) {
          executing.splice(i, 1);
        }
      }
    }
  }

  // Wait for remaining
  await Promise.all(executing);

  return results;
}

// ============================================================================
// CIRCUIT BREAKER (prevents cascading failures)
// ============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitStates: Map<LLMProvider, CircuitState> = new Map();

const CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeMs: 60000
};

export function recordFailure(provider: LLMProvider): void {
  const state = circuitStates.get(provider) || { failures: 0, lastFailure: 0, isOpen: false };
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_CONFIG.failureThreshold) {
    state.isOpen = true;
    console.warn(`Circuit breaker OPEN for ${provider} after ${state.failures} failures`);
  }

  circuitStates.set(provider, state);
}

export function recordSuccess(provider: LLMProvider): void {
  const state = circuitStates.get(provider);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
    circuitStates.set(provider, state);
  }
}

export function isCircuitOpen(provider: LLMProvider): boolean {
  const state = circuitStates.get(provider);
  if (!state) return false;

  // Check if circuit should reset
  if (state.isOpen && Date.now() - state.lastFailure > CIRCUIT_CONFIG.resetTimeMs) {
    state.isOpen = false;
    state.failures = 0;
    circuitStates.set(provider, state);
    return false;
  }

  return state.isOpen;
}
