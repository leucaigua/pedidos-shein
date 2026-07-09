'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  'https://www.tiktok.com/@shein.maturin/video/7462922784885247238',
  'https://www.tiktok.com/@shein.maturin/video/7553720600276077835',
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

  // Auto-scroll + scroll manual (trackpad/swipe) + flechas.
  const viewportRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false); // pausa mientras el mouse está encima
  const resumeAtRef = useRef(0); // pausa temporal tras usar una flecha

  function scrollByDir(dir: 1 | -1) {
    const vp = viewportRef.current;
    if (!vp) return;
    resumeAtRef.current = Date.now() + 1000;
    vp.scrollBy({ left: dir * vp.clientWidth * 0.85, behavior: 'smooth' });
  }

  // Motor de auto-desplazamiento: mueve scrollLeft frame a frame y hace loop
  // sin costuras al pasar el ancho de un set (la lista está duplicada).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || videos.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const track = vp.firstElementChild as HTMLElement | null;
    const SPEED = 0.5; // px por frame (~30px/s)
    let raf = 0;

    function setWidth(): number {
      if (!track || track.children.length < 2) return 0;
      const a = (track.children[0] as HTMLElement).offsetLeft;
      const b = (track.children[1] as HTMLElement).offsetLeft;
      return (b - a) * videos.length; // (ancho tarjeta + gap) * N
    }

    function tick() {
      if (vp && !pausedRef.current && Date.now() >= resumeAtRef.current) {
        vp.scrollLeft += SPEED;
        const w = setWidth();
        if (w > 0 && vp.scrollLeft >= w) vp.scrollLeft -= w;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videos.length]);

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

  // Duplicamos la lista una vez para que el loop de auto-scroll sea continuo.
  const loop = videos.concat(videos);

  return (
    <section className="pstk-section" id="tiktok" ref={sectionRef}>
      <div className="pstk-head">
        <h2>Así llegan tus paquetes 📦</h2>
        <p>
          Pedidos reales de nuestros clientes — síguenos en TikTok{' '}
          <a href={TIKTOK_PROFILE} target="_blank" rel="noopener noreferrer">
            @shein.maturin
          </a>
        </p>
      </div>

      <div className="pstk-carousel">
        <button
          type="button"
          className="pstk-arrow pstk-arrow-left"
          aria-label="Anterior"
          onClick={() => scrollByDir(-1)}
        >
          <ChevronLeft />
        </button>

        <div
          className="pstk-viewport"
          ref={viewportRef}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
        >
          <div className="pstk-track">
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
        </div>

        <button
          type="button"
          className="pstk-arrow pstk-arrow-right"
          aria-label="Siguiente"
          onClick={() => scrollByDir(1)}
        >
          <ChevronRight />
        </button>
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

        /* Carrusel: viewport con scroll nativo + pista de tarjetas duplicada.
           El auto-scroll y las flechas mueven scrollLeft por JS. */
        .pstk-carousel {
          position: relative;
        }
        .pstk-viewport {
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .pstk-viewport::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }
        .pstk-track {
          display: flex;
          width: max-content;
          gap: 20px;
          padding: 4px 24px;
        }

        /* Flechas de navegación */
        .pstk-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 6;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          cursor: pointer;
          background: rgba(20, 20, 20, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(6px);
          transition: background 0.2s ease, opacity 0.2s ease;
        }
        .pstk-arrow:hover {
          background: rgba(40, 40, 40, 0.85);
        }
        .pstk-arrow :global(svg) {
          width: 22px;
          height: 22px;
        }
        .pstk-arrow-left {
          left: 12px;
        }
        .pstk-arrow-right {
          right: 12px;
        }
        @media (max-width: 640px) {
          .pstk-arrow {
            display: none; /* en móvil se navega con swipe */
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
