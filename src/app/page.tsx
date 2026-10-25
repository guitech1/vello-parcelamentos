'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.replace('/index.html');
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#F7F9F7',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#66716A', marginBottom: 12 }}>Carregando Vello Parcelamentos…</p>
        <a href="/index.html" style={{ color: '#15803D', fontWeight: 600, textDecoration: 'none' }}>
          Abrir aplicação
        </a>
      </div>
    </main>
  );
}
