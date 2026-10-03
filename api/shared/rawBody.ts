/**
 * LIFE SCORE - The exact request bytes, for routes that check a sender's
 * signature (Stripe, Replicate). Such a route turns Vercel's body parsing off
 * (`export const config = { api: { bodyParser: false } }`) and reads the body
 * here, because a signature covers the bytes as sent, not a re-serialised copy.
 */

import type { VercelRequest } from '@vercel/node';

/**
 * Reads the whole request body as bytes. Chunks are joined as bytes; joining
 * them as text could split a multi-byte character and break the signature.
 */
export async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}
