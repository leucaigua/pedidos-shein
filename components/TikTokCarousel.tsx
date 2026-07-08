'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------
   TUS VIDEOS — es lo único que mantienes.
   Pega la URL de cada TikTok que quieras en el carrusel
   (Compartir → Copiar enlace, o cópiala de la barra de direcciones).
   El orden aquí = el orden mostrado. 6–12 videos es lo ideal.
   ------------------------------------------------------------ */
const VIDEOS = [
  'https://www.tiktok.com/@shein.maturin/video/7610613909539622151',
  'https://www.tiktok.com/@shein.maturin/video/7603188441773313298',
  'https://www.tiktok.com/@shein.maturin/video/7597168282075991308',
  'https://www.tiktok.com/@shein.maturin/video/7593336123951172920',
  'https://www.tiktok.com/@shein.maturin/video/7555879547858701579',
  'https://www.tiktok.com/@shein.maturin/video/7555877547045555468',
];

/* Opcional: si despliegas un proxy (Cloudflare Worker) para cachear y
   garantizar CORS, ponlo aquí. Vacío = llama directo al oEmbed de TikTok. */
const PROXY = ''; // ej: "https://tiktok-oembed.tuworker.workers.dev/?url="

const TIKTOK_PROFILE = 'https://www.tiktok.com/@shein.maturin';

type Video = { id: string; url: string; thumb: string; handle: string; title: string };

function videoId(url: string): string | null {
  const m = url.match(/video\/(\d+)/);
  return m ? m[1] : null;
}

function oembedUrl(url: string): string {
  const api = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(url);
  return PROXY ? PROXY + encodeURIComponent(url) : api;
}

export default function TikTokCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  // Previsualización al pasar el mouse: reproduce el video (mudo) ~6 s y se detiene.
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const previewTimer = useRef<number | null>(null);

  function startPreview(i: number) {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    setPreviewIdx(i);
    previewTimer.current = window.setTimeout(() => setPreviewIdx(null), 6000);
  }
  function stopPreview() {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    setPreviewIdx(null);
  }
  useEffect(() => () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
  }, []);

  // Carga lazy: solo pide las miniaturas cuando la sección se acerca al viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let started = false;
    async function load() {
      if (started) return;
      started = true;

      const results = await Promise.all(
        VIDEOS.map(async (url) => {
          const id = videoId(url);
          if (!id) return null;
          try {
            const r = await fetch(oembedUrl(url));
            if (!r.ok) return null;
            const data = await r.json();
            if (!data || !data.thumbnail_url) return null;
            return {
              id,
              url,
              thumb: data.thumbnail_url as string,
              handle: '@' + (data.author_unique_id || data.author_name || 'tiktok'),
              title: (data.title as string) || '',
            } as Video;
          } catch {
            return null;
          }
        })
      );

      const ok = results.filter((v): v is Video => v !== null);
      if (ok.length) {
        setVideos(ok);
      } else {
        // Fallback: oEmbed inalcanzable → tarjetas sin miniatura (el enlace a TikTok funciona igual)
        setVideos(
          VIDEOS.map((url) => ({ id: videoId(url), url, thumb: '', handle: '@shein.maturin', title: '' }))
            .filter((v): v is Video => v.id !== null)
        );
      }
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            io.disconnect();
            load();
          }
        },
        { rootMargin: '600px' }
      );
      io.observe(el);
      return () => io.disconnect();
    } else {
      load();
    }
  }, []);

  // Duplicamos la lista una vez para que el marquee (-50%) haga un loop continuo.
  const loop = videos.concat(videos);
  const speed = `${Math.max(30, videos.length * 8)}s`;

  return (
    <section className="pstk-section" id="tiktok" ref={sectionRef}>
      <div className="pstk-head">
        <h2>Así llegan los paquetitos 📦</h2>
        <p>
          Pedidos reales de nuestras clientas — síguenos en{' '}
          <a href={TIKTOK_PROFILE} target="_blank" rel="noopener noreferrer">
            @shein.maturin
          </a>
        </p>
      </div>

      <div className="pstk-marquee" style={{ ['--pstk-speed' as string]: speed }}>
        {loop.map((v, i) => (
          <a
            key={i}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pstk-card"
            aria-label="Ver video en TikTok"
            onMouseEnter={() => startPreview(i)}
            onMouseLeave={stopPreview}
          >
            {v.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" loading="lazy" src={v.thumb} />
            ) : null}
            {previewIdx === i ? (
              <span className="pstk-preview">
                <iframe
                  title={v.title || 'Previsualización de TikTok'}
                  src={`https://www.tiktok.com/player/v1/${v.id}?autoplay=1&loop=1&controls=0&progress_bar=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0&volume_control=0&fullscreen_button=0&play_button=0&timestamp=0`}
                  allow="autoplay; encrypted-media"
                />
              </span>
            ) : null}
            <span className="pstk-shade" />
            <span className="pstk-play">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            {v.title ? (
              <span className="pstk-desc">
                <span className="pstk-desc-text">{v.title}</span>
              </span>
            ) : null}
            <span className="pstk-handle">{v.handle}</span>
          </a>
        ))}
      </div>

      <style jsx>{`
        .pstk-section {
          background: #0a0a0a;
          color: #fff;
          padding: 72px 0 64px;
          overflow: hidden;
        }
        .pstk-head {
          text-align: center;
          margin: 0 auto 40px;
          padding: 0 24px;
          max-width: 720px;
        }
        .pstk-head h2 {
          font-size: clamp(26px, 4vw, 40px);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
        }
        .pstk-head p {
          color: #b5b5b5;
          font-size: 16px;
          margin: 0;
        }
        .pstk-head a {
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Marquee: la pista contiene la lista dos veces; el CSS la desliza
           -50% y hace loop, lo que se lee como una cinta infinita. */
        .pstk-marquee {
          display: flex;
          width: max-content;
          gap: 20px;
          padding: 4px 0;
          animation: pstk-scroll var(--pstk-speed, 45s) linear infinite;
          will-change: transform;
        }
        .pstk-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes pstk-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-50% - 10px));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pstk-marquee {
            animation: none;
            overflow-x: auto;
            width: auto;
          }
        }

        .pstk-card {
          position: relative;
          flex: 0 0 auto;
          width: 240px;
          aspect-ratio: 9 / 16;
          border-radius: 14px;
          overflow: hidden;
          background: #1a1a1a;
          cursor: pointer;
          border: none;
          padding: 0;
          transition: transform 0.25s ease;
        }
        .pstk-card:hover {
          transform: translateY(-4px);
        }
        .pstk-card:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
        }
        .pstk-card :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pstk-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 35%),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 22%);
          pointer-events: none;
        }
        /* Previsualización en video (reproductor de TikTok) al hacer hover */
        .pstk-preview {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: #000;
          pointer-events: none;
        }
        .pstk-preview :global(iframe) {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }
        .pstk-play {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.92);
          display: grid;
          place-items: center;
        }
        .pstk-play :global(svg) {
          width: 13px;
          height: 13px;
          fill: #0a0a0a;
          margin-auto: 0;
        }
        .pstk-handle {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
          transition: opacity 0.25s ease;
        }

        /* Descripción del video: aparece al pasar el mouse, sobre el video */
        .pstk-desc {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: 40px 14px 12px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }
        .pstk-card:hover .pstk-desc {
          opacity: 1;
        }
        .pstk-card:hover .pstk-handle {
          opacity: 0;
        }
        .pstk-desc-text {
          color: #fff;
          font-size: 13px;
          line-height: 1.4;
          text-align: left;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
}
