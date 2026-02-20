/**
 * LIFE SCORE™ Shared Gamma Iframe Component
 * Encapsulates Gamma embed URL construction, error handling, and sandboxing.
 *
 * Fixes:
 * - Embed URL construction was duplicated 3× (.replace('/docs/', '/embed/'))
 * - Iframe error handler copy-pasted 3×
 * - No sandbox attribute on third-party iframes
 *
 * Clues Intelligence LTD © 2025-2026
 */

import React, { useState, useEffect } from 'react';

interface GammaIframeProps {
  gammaUrl: string;
  title?: string;
  className?: string;
  onLoadError?: () => void;
}

/** Convert a Gamma doc URL to its embeddable form */
export function getGammaEmbedUrl(gammaUrl: string): string {
  if (gammaUrl.includes('/embed/')) return gammaUrl;
  return gammaUrl.replace('/docs/', '/embed/');
}

const GammaIframe: React.FC<GammaIframeProps> = ({
  gammaUrl,
  title = 'LIFE SCORE Visual Report',
  className = 'gamma-embed-frame',
  onLoadError,
}) => {
  const [loadError, setLoadError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setLoadError(false);
  }, [gammaUrl]);

  if (loadError) {
    return (
      <div className="gamma-embed-error">
        <p>This report may no longer be available on Gamma's servers.</p>
        <p>Try regenerating the report, or check your saved PDF/PPTX exports.</p>
        {onLoadError && (
          <button className="btn btn-primary" onClick={onLoadError}>
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <iframe
      src={getGammaEmbedUrl(gammaUrl)}
      className={className}
      title={title}
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      onError={() => setLoadError(true)}
      onLoad={(e) => {
        try {
          const iframe = e.target as HTMLIFrameElement;
          if (!iframe.contentWindow) {
            setLoadError(true);
          }
        } catch {
          // Cross-origin — iframe loaded something, expected
        }
      }}
    />
  );
};

export default GammaIframe;
