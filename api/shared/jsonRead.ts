/**
 * LIFE SCORE - Small readers for vendor JSON.
 *
 * `response.json()` gives `unknown`. A route reads only the fields it needs,
 * each checked for its type, so a changed or partial reply comes out as
 * "field missing" instead of a crash or a wrong value. Every reply reader in
 * api/ builds on these four.
 */

/** A JSON object (not null, not an array). */
export type JsonRecord = Record<string, unknown>;

/** True for a JSON object (not null, not an array). */
export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value as an object, or {} when it is anything else. */
export function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

/** A non-empty string, else undefined. */
export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** A finite number, else undefined. */
export function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** One WebRTC ICE server (the RTCIceServer fields; the server has no DOM types). */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * An ICE server list as a face vendor (Simli, HeyGen, D-ID) sends it.
 * Entries without a URL are dropped; anything that is not a list gives [].
 */
export function readIceServers(value: unknown): IceServer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): IceServer[] => {
    const e = asRecord(entry);
    const urls = typeof e.urls === 'string'
      ? e.urls
      : Array.isArray(e.urls) ? e.urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
    if (urls.length === 0) return [];
    const server: IceServer = { urls };
    const username = text(e.username);
    const credential = text(e.credential);
    if (username) server.username = username;
    if (credential) server.credential = credential;
    return [server];
  });
}
