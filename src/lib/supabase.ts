/**
 * LIFE SCORE - Supabase Client
 * Initialize and export the Supabase client for use throughout the app
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. Auth features will be disabled.\n' +
    'To enable: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

// Create untyped client to avoid strict type inference issues
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'lifescore-auth',
    },
    global: {
      headers: {
        'x-application-name': 'lifescore',
      },
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
}

/**
 * Supabase query timeout in milliseconds.
 * 45s to handle cold starts and slow connections.
 */
export const SUPABASE_TIMEOUT_MS = 45000;

/**
 * Retry configuration for Supabase queries
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,  // 1 second
  maxDelayMs: 10000,     // 10 seconds max
  backoffMultiplier: 2,  // Double delay each retry
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a Supabase query with exponential backoff retry.
 * Retries on timeout or transient errors.
 *
 * @param queryFn - Function that returns a Supabase query promise
 * @param options - Retry configuration overrides
 * @returns Query result or throws after all retries exhausted
 */
export async function withRetry<T>(
  queryFn: () => PromiseLike<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    timeoutMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    initialDelayMs = RETRY_CONFIG.initialDelayMs,
    maxDelayMs = RETRY_CONFIG.maxDelayMs,
    backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
    timeoutMs = SUPABASE_TIMEOUT_MS,
    operationName = 'Supabase query',
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wrap query with timeout
      const result = await Promise.race([
        Promise.resolve(queryFn()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      // Success - log if it was a retry
      if (attempt > 0) {
        console.log(`[Supabase] ${operationName} succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a retryable error
      const isTimeout = lastError.message.includes('timed out');
      const isNetworkError = lastError.message.includes('network') || lastError.message.includes('fetch');
      const isRetryable = isTimeout || isNetworkError;

      if (!isRetryable || attempt === maxRetries) {
        // Non-retryable error or exhausted retries
        console.error(`[Supabase] ${operationName} failed after ${attempt + 1} attempts:`, lastError.message);
        throw lastError;
      }

      // Log retry attempt
      console.warn(`[Supabase] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);

      // Wait before retry
      await sleep(delay);

      // Increase delay for next retry (exponential backoff with cap)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Execute a Supabase query with retry and return fallback on final failure.
 * Use when you want graceful degradation instead of throwing.
 *
 * @param queryFn - Function that returns a Supabase query promise
 * @param fallback - Value to return if all retries fail
 * @param options - Retry configuration overrides
 */
export async function withRetryFallback<T>(
  queryFn: () => PromiseLike<T>,
  fallback: T,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    timeoutMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  try {
    return await withRetry(queryFn, options);
  } catch {
    console.warn(`[Supabase] ${options.operationName || 'Query'} failed, using fallback`);
    return fallback;
  }
}

/**
 * Wrap a Supabase promise with a timeout.
 * Returns fallback value on timeout instead of throwing.
 *
 * @param promise - The Supabase query promise
 * @param timeoutMs - Timeout in milliseconds (default: 45000)
 * @param fallback - Value to return on timeout
 */
export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number = SUPABASE_TIMEOUT_MS,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[Supabase] Query timed out after ${timeoutMs}ms, using fallback`);
        resolve(fallback);
      }, timeoutMs)
    ),
  ]);
}

/**
 * Wrap a Supabase promise with a timeout that throws on timeout.
 * Use when you need to know if timeout occurred.
 *
 * @param promise - The Supabase query promise
 * @param timeoutMs - Timeout in milliseconds (default: 45000)
 */
export async function withSupabaseTimeoutThrow<T>(
  promise: PromiseLike<T>,
  timeoutMs: number = SUPABASE_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Supabase] Error getting user:', error);
    return null;
  }
  return user;
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] Error getting session:', error);
    return null;
  }
  return session;
}

if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, session?.user?.email || 'no user');
  });
}

export default supabase;
