/**
 * LIFE SCORE - Where city clips are served from before LifeScore keeps its own copy.
 *
 * Each video vendor hands back a link on its own servers that expires. A clip
 * still at one of these hosts must be copied into LifeScore's storage
 * (api/shared/persistVideo.ts), and a stored link to one of them may be dead.
 * One list, so a new vendor is added once (Kling 3 through fal joined on
 * 4 Oct 2026; Kling's own servers stay listed for clips made before).
 */

/** Hosts whose clip links expire. */
export const EXPIRING_CLIP_HOSTS = ['replicate.delivery', 'klingai.com', 'fal.media'] as const;

/** True when a clip link is still on a vendor's expiring host. */
export function isExpiringClipUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && EXPIRING_CLIP_HOSTS.some((host) => url.includes(host));
}
