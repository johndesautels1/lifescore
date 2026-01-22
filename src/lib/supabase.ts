/**
 * LIFE SCORE - Supabase Client
 * Initialize and export the Supabase client for use throughout the app
 *
 * Setup:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your project URL and anon key
 * 3. Add to your .env file (see .env.example)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables. Auth features will be disabled.\n' +
    'To enable: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Supabase client instance
 * Use this for all database and auth operations
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Persist session in localStorage (works with Capacitor)
      persistSession: true,
      // Auto-refresh tokens before they expire
      autoRefreshToken: true,
      // Detect session from URL (for OAuth redirects)
      detectSessionInUrl: true,
      // Storage key prefix
      storageKey: 'lifescore-auth',
    },
    // Global options
    global: {
      headers: {
        'x-application-name': 'lifescore',
      },
    },
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Supabase] Error getting user:', error);
    return null;
  }
  return user;
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] Error getting session:', error);
    return null;
  }
  return session;
}

// ============================================================================
// AUTH EVENT LISTENER (for debugging)
// ============================================================================

if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, session?.user?.email || 'no user');
  });
}

export default supabase;
