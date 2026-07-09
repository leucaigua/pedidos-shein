'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------
   MODO A (recomendado): feed automático desde tu Worker.
   Deploya instagram-feed-worker.js y pon aquí su URL /feed.
   ------------------------------------------------------------ */
const FEED_URL = 'https://instagramfeed.leurisecaigua.workers.dev/feed';

const IG_PROFILE = 'https://www.instagram.com/shein.maturin';
const MAX_POSTS = 12; // 6 columnas × 2 filas en desktop

type Post = { img: string; link: string; type?: string };

/* ------------------------------------------------------------
   MODO B (fallback / lanzamiento inmediato): lista manual.
   Sube las imágenes a tu propio hosting (carpeta /public, tu CDN,
   etc.) y enlaza cada una al post real. Se usa automáticamente
   si FEED_URL está vacío o si el Worker no responde.
   ------------------------------------------------------------ */
const MANUAL_POSTS: Post[] = [
  // ⬇️ Reemplaza con tus imágenes y enlaces reales ⬇️
  // { img: '/ig/post1.jpg', link: 'https://www.instagram.com/p/CODIGO1/', type: 'IMAGE' },
];

export default function InstagramFeed() {
  const sectionRef = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!FEED_URL) {
        if (!cancelled) setPosts(MANUAL_POSTS);
        return;
      }
      try {
        const r = await fetch(FEED_URL);
        if (!r.ok) throw new Error('feed');
        const data = await r.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length) setPosts(data);
        else setPosts(MANUAL_POSTS);
      } catch {
        if (!cancelled) setPosts(MANUAL_POSTS);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sin publicaciones que mostrar todavía: no renderizamos la sección.
  if (posts.length === 0) {
    return <section ref={sectionRef} aria-hidden style={{ display: 'none' }} />;
  }

  return (
    <section className="psig-section" id="instagram" ref={sectionRef}>
      <div className="psig-head">
        <h2>Síguenos en Instagram 🩷</h2>
        <a href={IG_PROFILE} target="_blank" rel="noopener noreferrer">
          @shein.maturin
        </a>
      </div>

      <div className="psig-grid" aria-label="Publicaciones recientes de Instagram">
        {posts.slice(0, MAX_POSTS).map((p, i) => (
          <a
            key={i}
            className="psig-cell"
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver publicación en Instagram"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" loading="lazy" src={p.img} />

            {p.type === 'VIDEO' && (
              <svg className="psig-badge" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {p.type === 'CAROUSEL_ALBUM' && (
              <svg className="psig-badge" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm-3 9H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H5a1 1 0 0 0-1 1v11z" />
              </svg>
            )}

            <span className="psig-over">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </a>
        ))}
      </div>

      <style jsx>{`
        .psig-section {
          --psig-cols: 6;
          --psig-gap: 8px;
          background: #ffffff;
          color: #0a0a0a;
          padding: 64px 0 16px;
        }
        .psig-head {
          text-align: center;
          margin: 0 auto 32px;
          padding: 0 24px;
        }
        .psig-head h2 {
          font-size: clamp(24px, 3.5vw, 36px);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }
        .psig-head a {
          color: inherit;
          font-size: 15px;
          text-decoration: underline;
          text-underline-offset: 3px;
          opacity: 0.75;
        }
        .psig-head a:hover {
          opacity: 1;
        }

        .psig-grid {
          display: grid;
          grid-template-columns: repeat(var(--psig-cols), 1fr);
          gap: var(--psig-gap);
        }
        @media (max-width: 1024px) {
          .psig-section {
            --psig-cols: 4;
          }
        }
        @media (max-width: 640px) {
          .psig-section {
            --psig-cols: 3;
          }
        }

        .psig-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #ececec;
          display: block;
        }
        .psig-cell :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }
        .psig-cell:hover :global(img) {
          transform: scale(1.05);
        }
        .psig-cell:focus-visible {
          outline: 3px solid #0a0a0a;
          outline-offset: -3px;
        }

        .psig-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 26px;
          height: 26px;
          color: #fff;
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
          pointer-events: none;
        }

        .psig-over {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }
        .psig-cell:hover .psig-over,
        .psig-cell:focus-visible .psig-over {
          opacity: 1;
        }
        .psig-over :global(svg) {
          width: 34px;
          height: 34px;
          color: #fff;
        }

        @media (prefers-reduced-motion: reduce) {
          .psig-cell :global(img),
          .psig-over {
            transition: none;
          }
          .psig-cell:hover :global(img) {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
