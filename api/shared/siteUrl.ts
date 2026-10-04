/**
 * LIFE SCORE - the public site's address, for links the server writes.
 *
 * Found 4 Oct 2026: email links and the server's fallback address used
 * https://lifescore.vercel.app, which is not this project — it belongs to someone
 * else. The project's addresses (Vercel, 4 Oct 2026) are clueslifescore.com and
 * lifescore-lilac.vercel.app; tests/siteUrl.test.ts keeps the stranger's out.
 */

/** The public site. */
export const PUBLIC_SITE = 'https://clueslifescore.com';

/** The project's own vercel.app address. */
export const PROJECT_VERCEL_SITE = 'https://lifescore-lilac.vercel.app';

/**
 * The address for links a user follows from outside the app (emails): the
 * PRODUCTION_URL setting, else Vercel's production domain, else the public
 * site — never a single deployment's own URL, which changes with every deploy.
 */
export function publicSiteUrl(): string {
  if (process.env.PRODUCTION_URL) return process.env.PRODUCTION_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return PUBLIC_SITE;
}
