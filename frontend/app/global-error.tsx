'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, padding: 20, background: '#0f172a', color: '#fff', fontFamily: 'system-ui' }}>
        <h1>Error en SilentEye</h1>
        <p>{error.message}</p>
        <a href="/login" style={{ color: '#60a5fa' }}>Ir a Login</a>
      </body>
    </html>
  );
}
