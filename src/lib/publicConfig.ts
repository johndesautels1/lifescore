/**
 * LIFE SCORE - The browser's public Supabase settings.
 *
 * Vite copies VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY into the page when
 * the site is built. On 3 October 2026 the production builds came out with the
 * address but a blank key, so nobody could sign in ("Auth not configured"),
 * while the server functions still held the key. So the page no longer depends
 * on the build alone: when a built-in value is missing, it asks the server
 * (/api/public-config) BEFORE the app loads (src/main.tsx).
 *
 * Both values are public by design — the anon key is meant to be in every
 * visitor's browser; row-level security in the database protects the data.
 * Values are trimmed: the built address carried a stray line break.
 */

export interface PublicSupabaseSettings {
  url: string;
  anonKey: string;
}

const built: PublicSupabaseSettings = {
  url: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
};

let fetched: PublicSupabaseSettings | null = null;

const FETCH_TIMEOUT_MS = 8000;

/** The settings to create the Supabase client with: built-in first, else what the server sent. */
export function publicSupabaseSettings(): PublicSupabaseSettings {
  return {
    url: built.url || fetched?.url || '',
    anonKey: built.anonKey || fetched?.anonKey || '',
  };
}

/** Narrow the server's reply; null when it is not a usable pair. */
export function parsePublicConfig(body: unknown): PublicSupabaseSettings | null {
  if (typeof body !== 'object' || body === null) return null;
  const { supabaseUrl, supabaseAnonKey } = body as Record<string, unknown>;
  if (typeof supabaseUrl !== 'string' || typeof supabaseAnonKey !== 'string') return null;
  const url = supabaseUrl.trim();
  const anonKey = supabaseAnonKey.trim();
  if (!/^https:\/\/[^\s/]+/.test(url) || anonKey === '') return null;
  return { url, anonKey };
}

/**
 * Fill any setting the build left out, from the server. Never throws: on any
 * failure the app still starts and shows its own "not configured" message.
 */
export async function loadPublicSupabaseSettings(): Promise<void> {
  if (built.url && built.anonKey) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch('/api/public-config', { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      console.error('[publicConfig] /api/public-config answered', response.status);
      return;
    }
    fetched = parsePublicConfig(await response.json());
    if (!fetched) console.error('[publicConfig] /api/public-config reply was not usable');
  } catch (error) {
    console.error('[publicConfig] could not load the public settings:', error);
  } finally {
    clearTimeout(timer);
  }
}
