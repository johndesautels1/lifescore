/**
 * LIFE SCORE - The one server-side database connection with full rights.
 *
 * Routes that write on a user's behalf (payments, plans, usage, evidence) use
 * getServiceClient() — never their own createClient() with a key chain. Before
 * 2026-10-03 several routes built their own and fell back to the PUBLIC (anon)
 * key when one setting name was missing, so a paying customer's plan change
 * could fail silently under row security. This client has no such fallback:
 * without the service key it returns null and the caller fails closed.
 *
 * The service key is accepted under its two names (SUPABASE_SERVICE_ROLE_KEY,
 * the Supabase default, and the older SUPABASE_SERVICE_KEY). Server only.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;

/** The project URL, from whichever of its names this deployment uses. */
export function supabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

/** The service-role key, never the public key. Empty when not configured. */
export function serviceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
}

/**
 * Service-role client, created once per server instance, or null when the
 * server is not configured (callers answer 500 rather than guess).
 */
export function getServiceClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) return null;
  if (!serviceClient) {
    serviceClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return serviceClient;
}
