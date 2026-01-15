/**
 * Dynamic OG Meta Tag Management
 * Updates meta tags for social sharing with comparison results
 */

interface OGMetaParams {
  city1: string;
  city2: string;
  score1: number;
  score2: number;
  winner: string;
  delta: number;
}

const BASE_URL = 'https://lifescore.cluesnomad.com';

export function buildOGImageURL(params: OGMetaParams): string {
  const searchParams = new URLSearchParams({
    city1: params.city1,
    city2: params.city2,
    score1: params.score1.toString(),
    score2: params.score2.toString(),
    winner: params.winner,
    delta: params.delta.toString(),
  });

  return `${BASE_URL}/api/og?${searchParams.toString()}`;
}

export function updateOGMetaTags(params: OGMetaParams): void {
  const ogImageURL = buildOGImageURL(params);
  const title = `${params.city1} vs ${params.city2} | LIFE SCORE Freedom Comparison`;
  const description = `${params.winner} wins with a +${params.delta} Freedom Delta! Compare legal freedom across 100 metrics.`;
  const pageURL = `${BASE_URL}/?cityA=${encodeURIComponent(params.city1)}&cityB=${encodeURIComponent(params.city2)}`;

  // Update existing meta tags or create new ones
  const metaUpdates: { property?: string; name?: string; content: string }[] = [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: ogImageURL },
    { property: 'og:url', content: pageURL },
    { property: 'twitter:title', content: title },
    { property: 'twitter:description', content: description },
    { property: 'twitter:image', content: ogImageURL },
    { property: 'twitter:url', content: pageURL },
    { name: 'title', content: title },
    { name: 'description', content: description },
  ];

  metaUpdates.forEach(({ property, name, content }) => {
    let meta: HTMLMetaElement | null = null;

    if (property) {
      meta = document.querySelector(`meta[property="${property}"]`);
    } else if (name) {
      meta = document.querySelector(`meta[name="${name}"]`);
    }

    if (meta) {
      meta.setAttribute('content', content);
    } else {
      // Create meta tag if it doesn't exist
      meta = document.createElement('meta');
      if (property) {
        meta.setAttribute('property', property);
      } else if (name) {
        meta.setAttribute('name', name);
      }
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  });

  // Update page title
  document.title = title;
}

export function resetOGMetaTags(): void {
  const defaultTitle = 'LIFE SCORE | Legal Freedom Comparison | CLUES by John E. Desautels';
  const defaultDescription = 'Compare legal freedom between any two cities worldwide across 100 comprehensive metrics. Part of the CLUES platform by John E. Desautels & Associates.';
  const defaultImage = `${BASE_URL}/og-image.png`;

  const metaResets: { property?: string; name?: string; content: string }[] = [
    { property: 'og:title', content: 'LIFE SCORE | Compare Legal Freedom Across Cities' },
    { property: 'og:description', content: '100 metrics. 6 categories. Real data. Compare legal freedom between any two cities worldwide.' },
    { property: 'og:image', content: defaultImage },
    { property: 'og:url', content: BASE_URL },
    { property: 'twitter:title', content: 'LIFE SCORE | Compare Legal Freedom Across Cities' },
    { property: 'twitter:description', content: '100 metrics. 6 categories. Real data. Compare legal freedom between any two cities worldwide.' },
    { property: 'twitter:image', content: defaultImage },
    { property: 'twitter:url', content: BASE_URL },
    { name: 'title', content: defaultTitle },
    { name: 'description', content: defaultDescription },
  ];

  metaResets.forEach(({ property, name, content }) => {
    let meta: HTMLMetaElement | null = null;

    if (property) {
      meta = document.querySelector(`meta[property="${property}"]`);
    } else if (name) {
      meta = document.querySelector(`meta[name="${name}"]`);
    }

    if (meta) {
      meta.setAttribute('content', content);
    }
  });

  document.title = defaultTitle;
}
