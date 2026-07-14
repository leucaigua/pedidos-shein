import { NextRequest, NextResponse } from 'next/server';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { buildAuthorizeUrl, exchangeCode } from '@/lib/catalogo/aliexpress-auth';

// GET admin: devuelve la URL de autorización de AliExpress.
//   ?redirect=<callback registrada en la app>   (por defecto: <origin>/admin/catalogo)
export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const redirect =
    req.nextUrl.searchParams.get('redirect') || `${req.nextUrl.origin}/admin/catalogo`;
  return NextResponse.json({ ok: true, url: buildAuthorizeUrl(redirect), redirect });
}

// POST admin: canjea el `code` de la autorización por tokens y los guarda en config.
export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? '').trim();
  if (!code) return NextResponse.json({ error: 'Falta code' }, { status: 400 });

  try {
    const t = await exchangeCode(code);
    return NextResponse.json({ ok: true, tiene_refresh: Boolean(t.refresh_token) });
  } catch (e) {
    console.error('[aliexpress-auth]', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
