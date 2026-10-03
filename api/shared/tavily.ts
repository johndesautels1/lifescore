/**
 * LIFE SCORE - The one Tavily connection (web search + research reports).
 *
 * Checked against Tavily's API reference on 3 Oct 2026
 * (docs.tavily.com/documentation/api-reference/introduction, /endpoint/search,
 * /endpoint/research, /endpoint/research-get; /documentation/api-credits):
 * - Every request: `Authorization: Bearer <key>`; `X-Project-ID` tags usage
 *   by project in Tavily's dashboard.
 * - POST /search answers with results [{ title, url, content, … }], an
 *   optional `answer`, and (with include_usage) `usage.credits`. An advanced
 *   search costs 2 credits.
 * - POST /research only QUEUES a report: 201, status "pending", request_id.
 *   The report is collected from GET /research/{request_id}: 202 while
 *   "pending" / "in_progress"; 200 with status "completed" (`content`,
 *   `sources` [{ title, url, favicon }], optional `usage`) or "failed".
 *   A mini report costs 4–110 credits.
 *
 * Until 3 Oct 2026 the research report was read from the POST reply, which
 * never carries it, so the evaluators never saw a report although each one
 * was paid for. tavilyResearch now orders the report and collects it, within
 * the caller's deadline.
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { asRecord as record, text } from './jsonRead.js';

const TAVILY_API_URL = 'https://api.tavily.com';
const PROJECT_ID = 'lifescore-freedom-app';

/** One web result, as the evaluator prompts quote it. */
export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

/** A search answer. `credits` is null when Tavily answered without a credit count. */
export interface TavilySearchReply {
  results: TavilyResult[];
  answer?: string;
  credits: number | null;
}

/** A source the research report cites. */
export interface TavilySource {
  title: string;
  url: string;
}

/** A collected research report. */
export interface TavilyResearchReport {
  text: string;
  sources: TavilySource[];
}

/** What one research request came to. */
export interface TavilyResearchOutcome {
  /** The report, or null when it was not ready before the deadline, failed, or was never ordered. */
  report: TavilyResearchReport | null;
  /** True when Tavily accepted the order, so it is charged whether or not it was collected. */
  ordered: boolean;
  /** Credits Tavily reported for it; null when it reported none (not collected, or no usage sent). */
  credits: number | null;
}

/** A research status, as read from GET /research/{request_id}. */
export interface TavilyResearchStatus {
  /** pending | in_progress | completed | failed (kept as sent). */
  status?: string;
  text: string;
  sources: TavilySource[];
  credits: number | null;
}

function credits(usage: unknown): number | null {
  const value = record(usage).credits;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'X-Project-ID': PROJECT_ID,
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads a POST /search body; never throws. */
export function readSearchReply(body: unknown): TavilySearchReply {
  const reply = record(body);
  const results = Array.isArray(reply.results)
    ? reply.results.map((item) => {
        const r = record(item);
        return { title: text(r.title) ?? '', url: text(r.url) ?? '', content: text(r.content) ?? '' };
      }).filter((r) => r.url !== '' || r.content !== '')
    : [];
  return { results, answer: text(reply.answer), credits: credits(reply.usage) };
}

/** Reads the request_id from a POST /research body; undefined when absent. */
export function readResearchOrder(body: unknown): string | undefined {
  return text(record(body).request_id);
}

/** Reads a GET /research/{request_id} body; never throws. */
export function readResearchStatus(body: unknown): TavilyResearchStatus {
  const reply = record(body);
  // `content` is text unless the request set an output_schema (this app never does).
  const content = typeof reply.content === 'string'
    ? reply.content
    : reply.content !== undefined && reply.content !== null ? JSON.stringify(reply.content) : '';
  const sources = Array.isArray(reply.sources)
    ? reply.sources.map((item) => {
        const s = record(item);
        return { title: text(s.title) ?? '', url: text(s.url) ?? '' };
      }).filter((s) => s.url !== '')
    : [];
  return { status: text(reply.status), text: content, sources, credits: credits(reply.usage) };
}

const NOT_ORDERED: TavilyResearchOutcome = { report: null, ordered: false, credits: null };

/**
 * Orders a mini research report and collects it, all within `deadlineMs` of
 * the call. A report not ready by then is left uncollected (it is still
 * charged: `ordered` is true and `credits` null). Never throws.
 */
export async function tavilyResearch(
  input: string,
  options: { deadlineMs: number; pollIntervalMs?: number; label: string },
): Promise<TavilyResearchOutcome> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return NOT_ORDERED;

  const startedAt = Date.now();
  const remaining = (): number => options.deadlineMs - (Date.now() - startedAt);
  const pollIntervalMs = options.pollIntervalMs ?? 3000;
  const tag = `[TAVILY RESEARCH ${options.label}]`;

  // Order: one retry, after 2 s, for a server error or a dropped connection.
  let requestId: string | undefined;
  let ordered = false;
  for (let attempt = 1; attempt <= 2 && !ordered; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${TAVILY_API_URL}/research`,
        {
          method: 'POST',
          headers: headers(apiKey),
          body: JSON.stringify({ input, model: 'mini', citation_format: 'numbered' }),
        },
        Math.max(1, remaining()),
      );
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error(`${tag} Order attempt ${attempt} error ${response.status}: ${errorText.slice(0, 500)}`);
        if (response.status < 500 || attempt === 2 || remaining() < 4000) return NOT_ORDERED;
        await sleep(2000);
        continue;
      }
      ordered = true;
      requestId = readResearchOrder(await response.json().catch(() => null));
    } catch (error) {
      console.error(`${tag} Order attempt ${attempt} exception:`, error instanceof Error ? error.message : error);
      if (attempt === 2 || remaining() < 4000) return NOT_ORDERED;
      await sleep(2000);
    }
  }
  if (!requestId) {
    console.error(`${tag} Tavily accepted the order but sent no request_id; the report cannot be collected`);
    return { report: null, ordered, credits: null };
  }

  // Collect: ask every pollIntervalMs until completed, failed, or out of time.
  while (remaining() > 0) {
    await sleep(Math.min(pollIntervalMs, remaining()));
    if (remaining() <= 0) break;
    try {
      const response = await fetchWithTimeout(
        `${TAVILY_API_URL}/research/${encodeURIComponent(requestId)}`,
        { headers: headers(apiKey) },
        Math.max(1, remaining()),
      );
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error(`${tag} Status error ${response.status}: ${errorText.slice(0, 300)}`);
        if (response.status < 500) return { report: null, ordered: true, credits: null };
        continue;
      }
      const status = readResearchStatus(await response.json().catch(() => null));
      if (status.status === 'completed') {
        console.log(`${tag} Collected after ${Date.now() - startedAt} ms - report length: ${status.text.length}, sources: ${status.sources.length}, credits: ${status.credits ?? 'not reported'}`);
        return {
          report: status.text ? { text: status.text, sources: status.sources } : null,
          ordered: true,
          credits: status.credits,
        };
      }
      if (status.status === 'failed') {
        console.error(`${tag} Tavily reports the research failed`);
        return { report: null, ordered: true, credits: status.credits };
      }
    } catch (error) {
      console.error(`${tag} Status check exception:`, error instanceof Error ? error.message : error);
    }
  }
  console.warn(`${tag} Not ready within ${options.deadlineMs} ms; the evaluation goes ahead without it`);
  return { report: null, ordered: true, credits: null };
}

/**
 * One advanced web search (the settings the evaluators have used since
 * 2026-01-18). Never throws. Counting: an error reply is counted as
 * uncharged (credits 0); a request that timed out or dropped may still have
 * been served, so its cost is unknown (credits null).
 */
export async function tavilySearch(query: string, maxResults: number, timeoutMs: number): Promise<TavilySearchReply> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], credits: 0 };

  try {
    const response = await fetchWithTimeout(
      `${TAVILY_API_URL}/search`,
      {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: 'advanced',     // Advanced LLM-generated answer for better synthesis
          include_raw_content: false,     // Keep false, use chunks instead
          chunks_per_source: 3,           // Pre-chunked relevant snippets (1–3)
          topic: 'general',
          start_date: '2024-01-01',       // Fixed start for historical context
          end_date: new Date().toISOString().split('T')[0],  // Dynamic: always current date
          exclude_domains: [              // Block low-quality/opinion-based sources
            'pinterest.com',
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'tiktok.com',
            'reddit.com',
            'quora.com',
            'yelp.com',
            'tripadvisor.com',
          ],
          // country omitted - it caused 400 errors for international cities
          include_usage: true,            // Credit count in usage.credits
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error(`[TAVILY SEARCH] Error ${response.status} for query "${query.slice(0, 50)}...": ${errorText.slice(0, 500)}`);
      return { results: [], credits: 0 };
    }
    const reply = readSearchReply(await response.json().catch(() => null));
    console.log(`[TAVILY SEARCH] Success - results: ${reply.results.length}, credits: ${reply.credits ?? 'not reported'}`);
    return reply;
  } catch (error) {
    console.error(`[TAVILY SEARCH] Exception for query "${query.slice(0, 50)}...":`, error instanceof Error ? error.message : error);
    return { results: [], credits: null };
  }
}
