/**
 * LIFE SCORE - Readers for the video and image vendors' JSON replies.
 *
 * Replicate (Wav2Lip, Minimax, Flux) and InVideo (MCP) each answer with JSON
 * the routes used to read as `any`. (Kling 3 through fal has its own readers
 * in falKling.ts.) Each reader here takes the parsed
 * body as `unknown` and keeps only the fields the routes use, with the vendor's
 * own field names, each checked for its type. A changed, partial or error reply
 * then reads as "field missing" instead of crashing the route.
 *
 * These are readers only: the requests themselves stay in their routes.
 */

import { asRecord as record, finite, text } from './jsonRead.js';

/** A Replicate prediction, as returned by create and get (the fields the routes read). */
export interface ReplicatePrediction {
  id?: string;
  /** starting | processing | succeeded | failed | canceled (kept as sent). */
  status?: string;
  /** A file URL, or a list of them, depending on the model. */
  output?: string | string[];
  error?: string;
  created_at?: string;
  completed_at?: string;
  metrics?: { predict_time?: number };
  urls?: { get?: string };
}

/** Reads a Replicate prediction body; never throws. */
export function readReplicatePrediction(body: unknown): ReplicatePrediction {
  const reply = record(body);
  const metrics = record(reply.metrics);
  const urls = record(reply.urls);
  const output = Array.isArray(reply.output)
    ? reply.output.filter((item): item is string => typeof item === 'string')
    : text(reply.output);
  return {
    id: text(reply.id),
    status: text(reply.status),
    output,
    error: text(reply.error),
    created_at: text(reply.created_at),
    completed_at: text(reply.completed_at),
    metrics: { predict_time: finite(metrics.predict_time) },
    urls: { get: text(urls.get) },
  };
}

/** An id InVideo may send as text or as a number. */
export function idText(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return text(value);
}

/**
 * InVideo's reason when its MCP tools/call reply is a refusal, else undefined:
 * a JSON-RPC `error` ({ code, message }), or a tool result marked
 * `isError: true` (the MCP way to report a tool that ran and failed; its text
 * says why). Cut to 300 characters.
 */
export function readMcpToolRefusal(body: unknown): string | undefined {
  const reply = record(body);
  if (reply.error !== undefined && reply.error !== null) {
    return (text(record(reply.error).message) ?? text(reply.error) ?? 'no reason given').slice(0, 300);
  }
  const result = record(reply.result);
  if (result.isError === true) {
    const content = result.content;
    const firstText = Array.isArray(content) ? text(record(content[0]).text) : undefined;
    return (firstText ?? 'no reason given').slice(0, 300);
  }
  return undefined;
}

/**
 * The payload of an MCP tools/call reply: the first content item's text, else
 * the result itself, else ''.
 */
export function readMcpToolResult(body: unknown): unknown {
  const result = record(body).result;
  const content = record(result).content;
  const firstText = Array.isArray(content) ? text(record(content[0]).text) : undefined;
  return firstText ?? (result || '');
}
