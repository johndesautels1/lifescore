import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);

  // Get parameters from URL
  const city1 = searchParams.get('city1') || 'City A';
  const city2 = searchParams.get('city2') || 'City B';
  const score1 = searchParams.get('score1') || '0';
  const score2 = searchParams.get('score2') || '0';
  const winner = searchParams.get('winner') || '';
  const delta = searchParams.get('delta') || '0';

  const score1Num = parseInt(score1, 10);
  const score2Num = parseInt(score2, 10);

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
          backgroundColor: '#0a0a1a',
          backgroundImage: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
          fontFamily: 'Montserrat, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <span style={{ fontSize: '48px', marginRight: '12px' }}>🗽</span>
          <span
            style={{
              fontSize: '36px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #D4AF37, #F7931E)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            LIFE SCORE™
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '18px',
            color: '#6ba3ff',
            marginBottom: '40px',
            letterSpacing: '2px',
          }}
        >
          LEGAL INDEPENDENCE & FREEDOM EVALUATION
        </div>

        {/* Main Comparison */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            marginBottom: '30px',
          }}
        >
          {/* City 1 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 40px',
              background: winner === city1
                ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(247, 147, 30, 0.1) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              border: winner === city1 ? '3px solid #D4AF37' : '2px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
              {city1}
            </span>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 800,
                color: winner === city1 ? '#D4AF37' : '#6ba3ff',
              }}
            >
              {score1}
            </span>
            <span style={{ fontSize: '16px', color: '#888', marginTop: '5px' }}>
              Freedom Score
            </span>
          </div>

          {/* VS */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#666' }}>VS</span>
          </div>

          {/* City 2 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 40px',
              background: winner === city2
                ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(247, 147, 30, 0.1) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              border: winner === city2 ? '3px solid #D4AF37' : '2px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
              {city2}
            </span>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 800,
                color: winner === city2 ? '#D4AF37' : '#6ba3ff',
              }}
            >
              {score2}
            </span>
            <span style={{ fontSize: '16px', color: '#888', marginTop: '5px' }}>
              Freedom Score
            </span>
          </div>
        </div>

        {/* Freedom Delta Badge */}
        {parseInt(delta, 10) > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #0047AB 0%, #3d7dd4 100%)',
              borderRadius: '50px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '20px', marginRight: '8px' }}>⚡</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37' }}>+{delta}</span>
            <span style={{ fontSize: '14px', color: '#ffffff', marginLeft: '8px' }}>FREEDOM DELTA</span>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '20px',
            fontSize: '14px',
            color: '#666',
          }}
        >
          <span>100 Metrics • 6 Categories • Real Data</span>
        </div>

        {/* Brand */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            fontSize: '12px',
            color: '#444',
          }}
        >
          CLUES™ by John E. Desautels & Associates
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
