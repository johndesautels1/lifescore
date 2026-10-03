/**
 * LIFE SCORE - One set of Tavily web research per city pair, shared by every
 * evaluation of that pair for 30 minutes (table `tavily_context_cache`,
 * migration 20261003_tavily_context_cache.sql).
 *
 * Ruling (John, 3 Oct 2026): search once per comparison and reuse the results
 * for every category. Before, each category call, and each half of a split
 * category, ran the same 12 searches and research order again: per comparison
 * 72 searches for GPT, 96 for Perplexity and 132 for Claude, where 12 would do.
 *
 * The calls for one comparison arrive at different servers, often two at once,
 * so the shared copy lives in the database, not in a server's memory:
 * - the first call claims the pair (a "pending" row), searches, and fills it;
 * - a call that finds the pair pending waits for it (up to 50 s), then reads it;
 * - a call that finds a fresh "ready" row uses it and searches nothing;
 * - when the database cannot be reached, each call searches for itself, as
 *   before. Nothing is ever lost, only repeated.
 *
 * The rows hold city names and public web results only, no personal data.
 */

import { serviceDb } from './supabaseAdmin.js';
import { asRecord, isRecord, text } from './jsonRead.js';
import type { TavilyResearchReport, TavilyResult } from './tavily.js';

/** How long a city pair's research is reused. */
export const TAVILY_CONTEXT_TTL_MS = 30 * 60 * 1000;
/** How long a call waits for another call's searches before searching itself. */
const PENDING_WAIT_MS = 50_000;
/** How often a waiting call looks again. */
const PENDING_POLL_MS = 1500;
/** Each database step's time limit. */
const DB_TIMEOUT_MS = 5000;

const TABLE = 'tavily_context_cache';
const UNIQUE_VIOLATION = '23505';

/** One search's answer, as the evaluator prompts use it. */
export interface CachedSearch {
  results: TavilyResult[];
  answer?: string;
}

/** The shared research for one city pair. */
export interface TavilyContextData {
  /** The research report, or null when it was not ready in time (or failed). */
  research: TavilyResearchReport | null;
  /** A report ordered but not yet collected; a later call asks Tavily for it once. */
  researchRequestId?: string;
  /** Each search's answer, by lower-cased query. */
  searches: Record<string, CachedSearch>;
}

/** What asking the cache came to. */
export type TavilyCacheClaim =
  | { kind: 'hit'; data: TavilyContextData }
  /** This call must search, then fillTavilyContext() or releaseTavilyContext(). */
  | { kind: 'claimed' }
  /** No shared copy can be used: search without writing one. */
  | { kind: 'unavailable' };

/** The cache key: both city names, lower-cased and sorted, so either order shares. */
export function tavilyPairKey(city1: string, city2: string): string {
  return [city1.trim().toLowerCase(), city2.trim().toLowerCase()].sort().join(' | ');
}

/** The key one search's answer is stored under. */
export function searchKey(query: string): string {
  return query.trim().toLowerCase();
}

/** Reads a stored row's data; anything malformed reads as empty. Never throws. */
export function readContextData(value: unknown): TavilyContextData {
  const data = asRecord(value);
  const research = asRecord(data.research);
  const researchText = text(research.text);
  const searches: Record<string, CachedSearch> = {};
  for (const [query, entry] of Object.entries(asRecord(data.searches))) {
    const e = asRecord(entry);
    const results = Array.isArray(e.results)
      ? e.results.filter(isRecord).map((r) => ({ title: text(r.title) ?? '', url: text(r.url) ?? '', content: text(r.content) ?? '' }))
      : [];
    searches[query] = { results, answer: text(e.answer) };
  }
  return {
    research: researchText
      ? {
          text: researchText,
          sources: Array.isArray(research.sources)
            ? research.sources.filter(isRecord).map((s) => ({ title: text(s.title) ?? '', url: text(s.url) ?? '' }))
            : [],
        }
      : null,
    researchRequestId: text(data.researchRequestId),
    searches,
  };
}

/** True when the searches found anything worth sharing (a total outage is not cached). */
export function worthSharing(data: TavilyContextData): boolean {
  return data.research !== null || Object.values(data.searches).some((s) => s.results.length > 0 || Boolean(s.answer));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Finds the pair's shared research, waits for it, or claims the pair for this
 * call. Never throws.
 */
export async function claimTavilyContext(key: string): Promise<TavilyCacheClaim> {
  const waitUntil = Date.now() + PENDING_WAIT_MS;
  try {
    while (Date.now() < waitUntil) {
      const { data: row, error } = await serviceDb
        .from(TABLE)
        .select('status, data, created_at, updated_at')
        .eq('pair_key', key)
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
        .maybeSingle();
      if (error) {
        console.warn('[TAVILY CACHE] Read failed, searching without the cache:', error.message);
        return { kind: 'unavailable' };
      }

      if (row) {
        const age = Date.now() - new Date(String(row.created_at)).getTime();
        const claimAge = Date.now() - new Date(String(row.updated_at)).getTime();
        if (row.status === 'ready' && age < TAVILY_CONTEXT_TTL_MS) {
          return { kind: 'hit', data: readContextData(row.data) };
        }
        if (row.status === 'pending' && claimAge < PENDING_WAIT_MS) {
          await sleep(PENDING_POLL_MS);
          continue;
        }
        // Expired, or a claim abandoned by a call that died: remove that exact row.
        await serviceDb
          .from(TABLE)
          .delete()
          .eq('pair_key', key)
          .eq('created_at', row.created_at)
          .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      }

      const { error: insertError } = await serviceDb
        .from(TABLE)
        .insert({ pair_key: key, status: 'pending' })
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      if (!insertError) return { kind: 'claimed' };
      if (insertError.code !== UNIQUE_VIOLATION) {
        console.warn('[TAVILY CACHE] Claim failed, searching without the cache:', insertError.message);
        return { kind: 'unavailable' };
      }
      // Another call claimed the pair a moment ago: look again.
    }
    console.warn('[TAVILY CACHE] Waited', PENDING_WAIT_MS, 'ms for another call; searching without the cache');
    return { kind: 'unavailable' };
  } catch (error) {
    console.warn('[TAVILY CACHE] Unavailable, searching without the cache:', error instanceof Error ? error.message : error);
    return { kind: 'unavailable' };
  }
}

/** Stores a claimed pair's research for every later call. Never throws. */
export async function fillTavilyContext(key: string, data: TavilyContextData): Promise<void> {
  try {
    const { error } = await serviceDb
      .from(TABLE)
      .update({ status: 'ready', data, updated_at: new Date().toISOString() })
      .eq('pair_key', key)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) console.warn('[TAVILY CACHE] Could not store the research:', error.message);
  } catch (error) {
    console.warn('[TAVILY CACHE] Could not store the research:', error instanceof Error ? error.message : error);
  }
}

/** Gives up a claim (nothing worth sharing), so waiting calls stop waiting. Never throws. */
export async function releaseTavilyContext(key: string): Promise<void> {
  try {
    await serviceDb
      .from(TABLE)
      .delete()
      .eq('pair_key', key)
      .eq('status', 'pending')
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  } catch (error) {
    console.warn('[TAVILY CACHE] Could not release the claim:', error instanceof Error ? error.message : error);
  }
}

/** Replaces a ready pair's data (a report collected later). Never throws. */
export async function updateTavilyContext(key: string, data: TavilyContextData): Promise<void> {
  try {
    const { error } = await serviceDb
      .from(TABLE)
      .update({ data, updated_at: new Date().toISOString() })
      .eq('pair_key', key)
      .eq('status', 'ready')
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) console.warn('[TAVILY CACHE] Could not add the late report:', error.message);
  } catch (error) {
    console.warn('[TAVILY CACHE] Could not add the late report:', error instanceof Error ? error.message : error);
  }
}
