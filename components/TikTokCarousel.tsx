'use client';

import { useEffect } from 'react';

/* ID del widget de Elfsight (TikTok Feed) */
const ELFSIGHT_APP_ID = 'elfsight-app-a69feeeb-fffd-4f58-a82a-606d3f8b1176';

declare global {
  interface Window {
    eapps?: { Platform?: { initWidgetsFromBuffer?: () => void } };
  }
}

export default function TikTokCarousel() {
  // Carga la plataforma de Elfsight, que renderiza el carrusel dentro del <div>.
  useEffect(() => {
    const existing = document.getElementById('elfsight-platform-script');
    if (existing) {
      // Si ya está cargada, pídele que re-escanee el DOM por nuevos widgets.
      window.eapps?.Platform?.initWidgetsFromBuffer?.();
      return;
    }

    const script = document.createElement('script');
    script.id = 'elfsight-platform-script';
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <section className="py-16 px-4 bg-white" id="tiktok">
      <div className="max-w-6xl mx-auto">
        <div className={ELFSIGHT_APP_ID} data-elfsight-app-lazy />
      </div>
    </section>
  );
}
