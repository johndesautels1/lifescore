/**
 * ContrastDisplays Component
 *
 * Two side-by-side "mini TV screens" that display AI-generated contrast
 * images showing the lived experience differences between two cities.
 *
 * Design: Premium bezel aesthetic matching Olivia's main viewport
 *
 * States:
 * - Idle: Empty screens with city names
 * - Loading: Skeleton animation while generating
 * - Ready: Images displayed with captions
 * - Error: Graceful error state
 */

import React from 'react';
import type { ContrastImageResult } from '../services/contrastImageService';
import type { ContrastImageStatus } from '../hooks/useContrastImages';
import './ContrastDisplays.css';

interface ContrastDisplaysProps {
  cityA: { name: string; score?: number };
  cityB: { name: string; score?: number };
  status: ContrastImageStatus;
  images: ContrastImageResult | null;
  topic: string | null;
  error: string | null;
  onRetry?: () => void;
}

export const ContrastDisplays: React.FC<ContrastDisplaysProps> = ({
  cityA,
  cityB,
  status,
  images,
  topic,
  error,
  onRetry,
}) => {
  // Don't render anything if idle and no images
  if (status === 'idle' && !images) {
    return null;
  }

  return (
    <section className="contrast-displays">
      {/* Topic Header */}
      {topic && (
        <div className="contrast-header">
          <span className="contrast-icon">◈</span>
          <span className="contrast-title">VISUAL COMPARISON</span>
          <span className="contrast-topic">{topic}</span>
        </div>
      )}

      <div className="contrast-screens">
        {/* City A Screen */}
        <div className="contrast-screen city-a">
          <div className="screen-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            <div className="screen-content">
              {/* Loading State */}
              {status === 'loading' && (
                <div className="screen-loading">
                  <div className="loading-shimmer"></div>
                  <div className="loading-text">GENERATING...</div>
                </div>
              )}

              {/* Image State */}
              {status === 'ready' && images?.cityAImage && (
                <div className="screen-image-container">
                  <img
                    src={images.cityAImage.url}
                    alt={images.cityAImage.caption}
                    className="screen-image"
                    loading="eager"
                  />
                  <div className="image-vignette"></div>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="screen-error">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">Failed to load</span>
                </div>
              )}

              {/* Idle placeholder */}
              {status === 'idle' && (
                <div className="screen-idle">
                  <span className="idle-icon">◇</span>
                </div>
              )}
            </div>
          </div>

          {/* City Label */}
          <div className="screen-label">
            <span className="label-city">{cityA.name}</span>
            {cityA.score !== undefined && (
              <span className={`label-score ${cityA.score >= (cityB.score || 0) ? 'high' : 'low'}`}>
                {cityA.score}
              </span>
            )}
          </div>

          {/* Caption */}
          {status === 'ready' && images?.cityAImage.caption && (
            <div className="screen-caption">{images.cityAImage.caption}</div>
          )}
        </div>

        {/* VS Divider */}
        <div className="contrast-divider">
          <span className="divider-text">VS</span>
        </div>

        {/* City B Screen */}
        <div className="contrast-screen city-b">
          <div className="screen-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            <div className="screen-content">
              {/* Loading State */}
              {status === 'loading' && (
                <div className="screen-loading">
                  <div className="loading-shimmer"></div>
                  <div className="loading-text">GENERATING...</div>
                </div>
              )}

              {/* Image State */}
              {status === 'ready' && images?.cityBImage && (
                <div className="screen-image-container">
                  <img
                    src={images.cityBImage.url}
                    alt={images.cityBImage.caption}
                    className="screen-image"
                    loading="eager"
                  />
                  <div className="image-vignette"></div>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="screen-error">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">Failed to load</span>
                </div>
              )}

              {/* Idle placeholder */}
              {status === 'idle' && (
                <div className="screen-idle">
                  <span className="idle-icon">◇</span>
                </div>
              )}
            </div>
          </div>

          {/* City Label */}
          <div className="screen-label">
            <span className="label-city">{cityB.name}</span>
            {cityB.score !== undefined && (
              <span className={`label-score ${cityB.score >= (cityA.score || 0) ? 'high' : 'low'}`}>
                {cityB.score}
              </span>
            )}
          </div>

          {/* Caption */}
          {status === 'ready' && images?.cityBImage.caption && (
            <div className="screen-caption">{images.cityBImage.caption}</div>
          )}
        </div>
      </div>

      {/* Error Retry */}
      {status === 'error' && onRetry && (
        <div className="contrast-error-actions">
          <span className="error-message">{error || 'Image generation failed'}</span>
          <button className="retry-btn" onClick={onRetry}>
            RETRY
          </button>
        </div>
      )}
    </section>
  );
};

export default ContrastDisplays;
