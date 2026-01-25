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
 * Increased to 45s to handle Supabase free tier cold starts.
 */
export const SUPABASE_TIMEOUT_MS = 45000;

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
