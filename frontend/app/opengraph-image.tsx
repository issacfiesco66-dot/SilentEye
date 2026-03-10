import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SilentEye — Plataforma GPS de Seguridad Vehicular';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#fff',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            SilentEye
          </span>
        </div>

        <h1
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: 0,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          Plataforma GPS de Seguridad Vehicular
        </h1>

        <p
          style={{
            fontSize: '24px',
            color: '#a1a1aa',
            lineHeight: 1.5,
            margin: 0,
            marginBottom: '48px',
            maxWidth: '700px',
          }}
        >
          Rastreo GPS en tiempo real · Alertas automáticas · Botón de pánico · Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack
        </p>

        <div
          style={{
            display: 'flex',
            gap: '24px',
          }}
        >
          {['GPS 24/7', '<3s Alerta', '5 Marcas', 'Sin App'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                padding: '12px 24px',
                color: '#60a5fa',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '80px',
            fontSize: '18px',
            color: '#52525b',
          }}
        >
          silenteye.mx
        </div>
      </div>
    ),
    { ...size }
  );
}
