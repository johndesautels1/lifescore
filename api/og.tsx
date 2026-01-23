/**
 * LIFE SCORE - Dynamic OG Image Generator
 * Generates social media preview images for comparison results
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import { ImageResponse } from '@vercel/og';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: VercelRequest) {
  try {
    // Parse URL and get search params
    const url = new URL(req.url || '', 'https://lifescore.cluesnomad.com');
    const searchParams = url.searchParams;

    // Extract parameters
    const city1 = searchParams.get('city1') || 'City A';
    const city2 = searchParams.get('city2') || 'City B';
    const score1 = parseInt(searchParams.get('score1') || '50', 10);
    const score2 = parseInt(searchParams.get('score2') || '50', 10);
    const winner = searchParams.get('winner') || city1;
    const delta = parseInt(searchParams.get('delta') || '0', 10);

    // Determine colors based on scores
    const getScoreColor = (score: number) => {
      if (score >= 70) return '#22c55e'; // Green
      if (score >= 50) return '#eab308'; // Yellow
      return '#ef4444'; // Red
    };

    const score1Color = getScoreColor(score1);
    const score2Color = getScoreColor(score2);

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#60a5fa',
                letterSpacing: '0.1em',
              }}
            >
              LIFE SCORE
            </span>
            <span
              style={{
                fontSize: 14,
                color: '#94a3b8',
                marginLeft: 12,
                marginTop: 4,
              }}
            >
              Legal Freedom Comparison
            </span>
          </div>

          {/* Main comparison */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 60,
            }}
          >
            {/* City 1 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: score1Color,
                }}
              >
                {score1}
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#f1f5f9',
                  marginTop: 8,
                  maxWidth: 280,
                  textAlign: 'center',
                }}
              >
                {city1}
              </span>
              {winner === city1 && (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    padding: '6px 16px',
                    borderRadius: 20,
                    marginTop: 12,
                  }}
                >
                  WINNER
                </span>
              )}
            </div>

            {/* VS Divider */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                VS
              </span>
              {delta > 0 && (
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#22c55e',
                    marginTop: 8,
                  }}
                >
                  +{delta} Delta
                </span>
              )}
            </div>

            {/* City 2 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: score2Color,
                }}
              >
                {score2}
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#f1f5f9',
                  marginTop: 8,
                  maxWidth: 280,
                  textAlign: 'center',
                }}
              >
                {city2}
              </span>
              {winner === city2 && (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    padding: '6px 16px',
                    borderRadius: 20,
                    marginTop: 12,
                  }}
                >
                  WINNER
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 40,
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                color: '#64748b',
              }}
            >
              100 Metrics
            </span>
            <span style={{ color: '#475569' }}>•</span>
            <span
              style={{
                fontSize: 16,
                color: '#64748b',
              }}
            >
              6 Categories
            </span>
            <span style={{ color: '#475569' }}>•</span>
            <span
              style={{
                fontSize: 16,
                color: '#64748b',
              }}
            >
              lifescore.cluesnomad.com
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG Image generation error:', error);

    // Return a fallback error image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#60a5fa',
            }}
          >
            LIFE SCORE
          </span>
          <span
            style={{
              fontSize: 24,
              color: '#94a3b8',
              marginTop: 16,
            }}
          >
            Compare Legal Freedom Across Cities
          </span>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
