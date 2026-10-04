/**
 * LIFE SCORE - where the GitHub backup keeps its access key and Gist id.
 *
 * John, 4 Oct 2026 ("Keep for this visit only"): "Connect GitHub" on My Saved
 * Comparisons kept the user's GitHub personal access token in localStorage,
 * readable by any script on the page for as long as the browser kept it. The
 * token now lives in sessionStorage and is forgotten when the tab closes. The
 * Gist id is not a secret and stays in localStorage, so reconnecting on a later
 * visit updates the same backup instead of starting a new one.
 *
 * Used by src/services/savedComparisons.ts; src/main.tsx calls
 * moveStoredGitHubConfig() at start to drop tokens older releases stored.
 */

/** The token, for this visit only (sessionStorage). */
export const GITHUB_TOKEN_KEY = 'lifescore_github_token';
/** The backup Gist's id (localStorage; not a secret). */
export const GITHUB_GIST_KEY = 'lifescore_github_gist';
/** Older releases kept token and Gist id together here, in localStorage. */
export const OLD_GITHUB_CONFIG_KEY = 'lifescore_github_config';

/** The GitHub backup's settings. */
export interface GitHubConfig {
  accessToken: string;
  gistId?: string; // Created on first sync
}

/** The settings, or null when no token was given during this visit. */
export function getGitHubConfig(): GitHubConfig | null {
  try {
    const accessToken = sessionStorage.getItem(GITHUB_TOKEN_KEY);
    if (!accessToken) return null;
    const gistId = localStorage.getItem(GITHUB_GIST_KEY) ?? undefined;
    return gistId ? { accessToken, gistId } : { accessToken };
  } catch {
    return null;
  }
}

/** Keeps the token for this visit and the Gist id for later visits; a config without a Gist id forgets the stored one. */
export function saveGitHubConfig(config: GitHubConfig): void {
  try {
    sessionStorage.setItem(GITHUB_TOKEN_KEY, config.accessToken);
    if (config.gistId) localStorage.setItem(GITHUB_GIST_KEY, config.gistId);
    else localStorage.removeItem(GITHUB_GIST_KEY);
  } catch (err) {
    console.error('[githubToken] Failed to save GitHub settings:', err);
  }
}

/** Forgets the token and the Gist id (disconnect). */
export function clearGitHubConfig(): void {
  try {
    sessionStorage.removeItem(GITHUB_TOKEN_KEY);
    localStorage.removeItem(GITHUB_GIST_KEY);
    localStorage.removeItem(OLD_GITHUB_CONFIG_KEY);
  } catch {
    // storage blocked: nothing stored either
  }
}

/** The Gist id kept from an earlier visit, so reconnecting reuses that backup. */
export function storedGistId(): string | undefined {
  try {
    return localStorage.getItem(GITHUB_GIST_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Removes a token an older release stored permanently, keeping only its Gist id. */
export function moveStoredGitHubConfig(): void {
  try {
    const old = localStorage.getItem(OLD_GITHUB_CONFIG_KEY);
    if (old === null) return;
    localStorage.removeItem(OLD_GITHUB_CONFIG_KEY);
    const parsed: unknown = JSON.parse(old);
    const gistId = typeof parsed === 'object' && parsed !== null ? (parsed as { gistId?: unknown }).gistId : undefined;
    if (typeof gistId === 'string' && gistId) localStorage.setItem(GITHUB_GIST_KEY, gistId);
  } catch {
    // unreadable or blocked: the old entry is gone or was never readable
  }
}
