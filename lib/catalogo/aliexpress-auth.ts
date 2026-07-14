// OAuth de AliExpress (Open Platform). Las APIs de Dropshipping (aliexpress.ds.*)
// requieren un access_token. Se obtiene autorizando la app UNA vez:
//   1) el admin visita la URL de autorización (buildAuthorizeUrl),
//   2) AliExpress redirige a la callback con ?code=...,
//   3) se canjea el code por access_token + refresh_token (exchangeCode),
//   4) se guardan en la tabla `config` y se renuevan solos (refreshToken).
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

const REST = process.env.ALIEXPRESS_REST_BASE_URL || 'https://api-sg.aliexpress.com/rest';
const AUTHORIZE_URL = 'https://api-sg.aliexpress.com/oauth/authorize';
const APP_KEY = process.env.ALIEXPRESS_APP_KEY || '';
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET || '';

const CFG_ACCESS = 'aliexpress_access_token';
const CFG_REFRESH = 'aliexpress_refresh_token';
const CFG_EXPIRES = 'aliexpress_token_expires'; // epoch ms

function signRest(path: string, params: Record<string, string>): string {
  const base =
    path +
    Object.keys(params)
      .filter((k) => k !== 'sign')
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');
  return crypto.createHmac('sha256', APP_SECRET).update(base).digest('hex').toUpperCase();
}

async function callRest(path: string, extra: Record<string, string>): Promise<Record<string, unknown>> {
  const params: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: String(Date.now()),
    sign_method: 'sha256',
    ...extra,
  };
  params.sign = signRest(path, params);
  const res = await fetch(REST + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return (await res.json()) as Record<string, unknown>;
}

/** URL que el admin debe visitar para autorizar la app. */
export function buildAuthorizeUrl(redirectUri: string, state = ''): string {
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('force_auth', 'true');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('client_id', APP_KEY);
  if (state) u.searchParams.set('state', state);
  return u.toString();
}

interface TokenResp {
  access_token?: string;
  refresh_token?: string;
  expire_time?: number;          // ms de validez (a veces epoch)
  refresh_token_valid_time?: number;
  code?: string;
  message?: string;
}

function extractToken(json: Record<string, unknown>): TokenResp {
  // La respuesta puede venir plana o envuelta.
  const inner =
    (json.data as Record<string, unknown>) ??
    (json.aliexpress_system_oauth_token_response as Record<string, unknown>) ??
    json;
  return inner as TokenResp;
}

async function guardarTokens(t: TokenResp): Promise<void> {
  if (!t.access_token) return;
  // expire_time suele ser duración en ms; si es un epoch futuro, respétalo.
  const ahora = Date.now();
  const dur = Number(t.expire_time) || 0;
  const expires = dur > ahora ? dur : ahora + (dur || 24 * 3600 * 1000);
  const supabase = getSupabaseAdmin();
  const rows = [
    { clave: CFG_ACCESS, valor: t.access_token },
    ...(t.refresh_token ? [{ clave: CFG_REFRESH, valor: t.refresh_token }] : []),
    { clave: CFG_EXPIRES, valor: String(expires) },
  ];
  await supabase.from('config').upsert(rows, { onConflict: 'clave' });
  tokenCache = { token: t.access_token, expires };
}

/** Canjea el `code` de la autorización por tokens y los guarda. */
export async function exchangeCode(code: string): Promise<TokenResp> {
  const json = await callRest('/auth/token/create', { code });
  const t = extractToken(json);
  if (!t.access_token) {
    throw new Error(`AliExpress OAuth: ${t.code ?? ''} ${t.message ?? JSON.stringify(json).slice(0, 200)}`);
  }
  await guardarTokens(t);
  return t;
}

/** Renueva el access_token con el refresh_token guardado. */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResp> {
  const json = await callRest('/auth/token/refresh', { refresh_token: refreshToken });
  const t = extractToken(json);
  if (t.access_token) await guardarTokens(t);
  return t;
}

let tokenCache: { token: string; expires: number } | null = null;

/**
 * access_token vigente. Prioriza env (útil para pruebas), luego la config;
 * si está por vencer y hay refresh_token, lo renueva automáticamente.
 */
export async function getAccessToken(): Promise<string | undefined> {
  if (process.env.ALIEXPRESS_ACCESS_TOKEN) return process.env.ALIEXPRESS_ACCESS_TOKEN;

  const ahora = Date.now();
  if (tokenCache && ahora < tokenCache.expires - 60_000) return tokenCache.token;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('config')
    .select('clave, valor')
    .in('clave', [CFG_ACCESS, CFG_REFRESH, CFG_EXPIRES]);
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: { clave: string; valor: string }) => (map[r.clave] = r.valor));

  const access = map[CFG_ACCESS];
  const expires = Number(map[CFG_EXPIRES]) || 0;
  if (access && ahora < expires - 60_000) {
    tokenCache = { token: access, expires };
    return access;
  }
  if (map[CFG_REFRESH]) {
    try {
      const t = await refreshAccessToken(map[CFG_REFRESH]);
      if (t.access_token) return t.access_token;
    } catch (e) {
      console.error('[aliexpress-auth] refresh falló', (e as Error).message);
    }
  }
  return access; // puede estar vencido; el llamador manejará el error
}
