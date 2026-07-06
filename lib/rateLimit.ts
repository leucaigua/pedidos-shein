import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiting ligero en memoria (ventana fija por IP + bucket).
 *
 * ⚠️ Nota: en Netlify/serverless las instancias son efímeras y el estado NO se
 * comparte entre ellas, así que esto es "best-effort": frena abuso básico y
 * ráfagas, pero no es un límite global exacto. Para un límite robusto en
 * producción conviene un store compartido (p. ej. Upstash Redis).
 */

type Registro = { count: number; reset: number };

const store = new Map<string, Registro>();

// Purga oportunista para que el Map no crezca sin límite.
function purgar(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) {
    if (now > v.reset) store.delete(k);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  purgar(now);

  const reg = store.get(key);
  if (!reg || now > reg.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  reg.count += 1;
  if (reg.count > limit) {
    return { ok: false, retryAfter: Math.ceil((reg.reset - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** IP del cliente a partir de las cabeceras del proxy (Netlify/Vercel). */
export function ipDeRequest(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconocida';
}

/**
 * Aplica rate limit y devuelve una respuesta 429 si se excede, o null si se
 * permite. Uso:
 *   const limite = aplicarRateLimit(req, 'verify-price', 20, 60_000);
 *   if (limite) return limite;
 */
export function aplicarRateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${bucket}:${ipDeRequest(req)}`, limit, windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
