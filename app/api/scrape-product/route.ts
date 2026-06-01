import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import type { ProductoScraped } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 20;

// ─────────────────────────────────────────────
// Helpers (portados de scraper/shein_scraper.py)
// ─────────────────────────────────────────────

const JUNK_NAMES = new Set([
  '', 'shein', 'www.shein.com', 'us.shein.com',
  "women's & men's clothing, shop online fashion",
  'fashion online', 'shein official website',
]);

function isJunkName(name: string): boolean {
  const n = name.toLowerCase().trim();
  if (JUNK_NAMES.has(n) || n.length < 6) return true;
  if (n.startsWith('shein') && (n.includes('fashion') || n.includes('clothing') || n.includes('design'))) {
    return true;
  }
  if (n.length > 180) return true;
  return false;
}

function extraerNombreDeUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    // Acepta sufijos opcionales como -cat-1764 antes de .html
    const match = pathname.match(/\/([^/?]+?)-p-\d+(?:-[^/?]*)?\.html/);
    if (!match) return '';
    const slug = match[1];

    // Slug con guiones (escritorio): Women-s-Dress → Women's Dress
    if (slug.includes('-')) {
      return slug.replace(/-s-/g, "'s ").replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Slug camelCase sin guiones (móvil m.shein.com)
    let name = slug.replace(/([a-z0-9])([A-Z])/g, '$1 $2');       // 2New → 2 New
    name = name.replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');     // PUMaterial → PU Material
    name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');         // KUnderarm → K Underarm
    name = name.replace(/,/g, ', ');
    return name.trim();
  } catch {
    return '';
  }
}

function isMobileShareLink(url: string): boolean {
  return url.includes('api-shein.shein.com') || url.includes('sharejump');
}

function isMobileProductLink(url: string): boolean {
  return url.includes('m.shein.com') && url.includes('-p-');
}

const HEADERS_REQ = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 ' +
    'Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
};

interface ShareMeta {
  nombre: string;
  imagen: string;
  precio: number;
  product_url: string;
}

// ─────────────────────────────────────────────
// Extraer nombre/imagen/precio del HTML (sin browser)
// ─────────────────────────────────────────────

async function fetchMetaFromShare(url: string): Promise<ShareMeta> {
  const empty: ShareMeta = { nombre: '', imagen: '', precio: 0, product_url: '' };
  try {
    const r = await axios.get<string>(url, {
      headers: HEADERS_REQ,
      timeout: 12000,
      maxRedirects: 5,
      responseType: 'text',
      // SHEIN a veces responde 4xx con el HTML útil igualmente
      validateStatus: () => true,
    });
    const html = typeof r.data === 'string' ? r.data : String(r.data);

    // ── og:title ───────────────────────────────────────────────
    let nombre = '';
    const titlePatterns = [
      /property=["']og:title["'][^>]*content=["'](.*?)["']/i,
      /content=["'](.*?)["'][^>]*property=["']og:title["']/i,
    ];
    for (const pat of titlePatterns) {
      const m = html.match(pat);
      if (m && !isJunkName(m[1])) {
        nombre = m[1].trim();
        break;
      }
    }
    if (!nombre) {
      const m = html.match(/<title>([\s\S]*?)<\/title>/i);
      if (m && !isJunkName(m[1])) nombre = m[1].trim();
    }

    // ── og:image ───────────────────────────────────────────────
    let imagen = '';
    const imgPatterns = [
      /property=["']og:image["'][^>]*content=["'](https:\/\/[^"']+)["']/i,
      /content=["'](https:\/\/img[^"']+)["'][^>]*property=["']og:image["']/i,
      /name=["']twitter:image["'][^>]*content=["'](https:\/\/[^"']+)["']/i,
    ];
    for (const pat of imgPatterns) {
      const m = html.match(pat);
      if (m) {
        imagen = m[1].trim();
        break;
      }
    }

    // ── precio (best-effort desde el HTML embebido) ────────────
    // SHEIN suele incrustar el precio en JSON: "salePrice":{"amount":"12.99"}
    // o "amountWithSymbol":"$12.99". Tomamos el menor valor plausible.
    let precio = 0;
    const priceCandidates: number[] = [];
    const jsonPriceRe = /"(?:salePrice|retailPrice|amount|usdAmount)"\s*:\s*"?(\d+\.\d{1,2})"?/gi;
    let pm: RegExpExecArray | null;
    while ((pm = jsonPriceRe.exec(html)) !== null) {
      const v = parseFloat(pm[1]);
      if (v > 0.5 && v < 2000) priceCandidates.push(v);
    }
    if (priceCandidates.length === 0) {
      const symbolRe = /[$€£]\s*(\d+\.\d{2})/g;
      while ((pm = symbolRe.exec(html)) !== null) {
        const v = parseFloat(pm[1]);
        if (v > 0.5 && v < 2000) priceCandidates.push(v);
      }
    }
    if (priceCandidates.length > 0) precio = Math.min(...priceCandidates);

    // ── URL real del producto (si está incrustada) ─────────────
    let product_url = '';
    const m = html.match(
      /(https:\/\/(?:us|www|m)\.shein\.com\/[^\s"'<>]*-p-\d+\.html[^\s"'<>]*)/i,
    );
    if (m) product_url = m[1];

    return { nombre, imagen, precio, product_url };
  } catch {
    return empty;
  }
}

// ─────────────────────────────────────────────
// Orquestador (equivalente a scrape() en Python)
// ─────────────────────────────────────────────

async function scrape(url: string): Promise<ProductoScraped> {
  let nombre = '';
  let imagen = '';
  let precio = 0;

  if (isMobileShareLink(url)) {
    // Share link: el HTML trae og:title, og:image y a veces el precio
    const meta = await fetchMetaFromShare(url);
    nombre = meta.nombre;
    imagen = meta.imagen;
    precio = meta.precio;
    if (!nombre) nombre = extraerNombreDeUrl(meta.product_url || url);
  } else if (isMobileProductLink(url)) {
    // Link directo m.shein.com: nombre del slug + imagen via meta tags
    nombre = extraerNombreDeUrl(url);
    const meta = await fetchMetaFromShare(url);
    if (meta.imagen) imagen = meta.imagen;
    if (meta.precio) precio = meta.precio;
    if (!nombre && meta.nombre && !isJunkName(meta.nombre)) nombre = meta.nombre;
  } else {
    // Link escritorio: Cloudflare bloquea todo, usamos solo el slug del URL
    nombre = extraerNombreDeUrl(url);
  }

  return {
    ok: !!nombre,
    nombre,
    precio,
    imagen,
    url,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }
    if (!url.includes('shein.com')) {
      return NextResponse.json({ error: 'Solo se aceptan links de SHEIN' }, { status: 400 });
    }

    const producto = await scrape(url);

    if (!producto.ok) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        url,
        mensaje: 'No se pudo extraer el producto. Por favor llena los datos manualmente.',
      });
    }

    return NextResponse.json({ ok: true, producto });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
