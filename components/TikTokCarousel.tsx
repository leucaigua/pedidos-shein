'use client';

import { useEffect } from 'react';

/* Cuenta oficial de TikTok */
const TIKTOK_USER = 'shein.maturin';
const TIKTOK_PROFILE = `https://www.tiktok.com/@${TIKTOK_USER}`;

export default function TikTokCarousel() {
  // Carga el script oficial de TikTok, que convierte el <blockquote> en un
  // carrusel real con las miniaturas de los últimos videos de la cuenta.
  useEffect(() => {
    const existing = document.getElementById('tiktok-embed-script');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'tiktok-embed-script';
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <section className="py-16 px-4 bg-white" id="tiktok">
      <div className="max-w-6xl mx-auto">
        {/* Embed oficial de TikTok — muestra los últimos videos reales de la cuenta */}
        <div className="flex justify-center">
          <blockquote
            className="tiktok-embed"
            cite={TIKTOK_PROFILE}
            data-unique-id={TIKTOK_USER}
            data-embed-type="creator"
            style={{ maxWidth: 1100, minWidth: 288, width: '100%' }}
          >
            <section>
              <a target="_blank" rel="noopener noreferrer" href={`${TIKTOK_PROFILE}?refer=creator_embed`}>
                @{TIKTOK_USER}
              </a>
            </section>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
