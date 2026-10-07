/**
 * Feed propio de @shein.maturin para Cloudflare Workers.
 * Binding KV: IG. Secret: ADMIN_KEY (protege /set-token).
 * Cron recomendado: 0 3 * * * (UTC). No guardar tokens en este archivo.
 * /feed renueva URLs y /media/:id sirve miniaturas desde la misma fuente.
 */
const CACHE_SECONDS = 3600;
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const POST_LIMIT = 12;
const API = 'https://graph.instagram.com/v23.0/me/media';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

export function mediaIsFresh(post, now = Date.now()) {
  if (!post?.img) return false;
  try {
    const url = new URL(post.img);
    if (url.protocol !== 'https:' || !isMediaHost(url.hostname)) return false;
    const expiry = url.searchParams.get('oe');
    return !expiry || /^[a-f0-9]+$/i.test(expiry) && parseInt(expiry, 16) * 1000 > now + 60_000;
  } catch { return false; }
}
function isMediaHost(host) {
  return host === 'cdninstagram.com' || host.endsWith('.cdninstagram.com') || host === 'fbcdn.net' || host.endsWith('.fbcdn.net');
}
function response(data, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Cache-Control': cache,
  } });
}
class InstagramError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}
async function graph(url, token) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('access_token', token);
  const res = await fetch(requestUrl, { signal: AbortSignal.timeout(12_000) });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new InstagramError(data.error?.code === 190 ? 'instagram_reconnect_required' : 'instagram_unavailable', 503);
  }
  return data;
}
async function refreshToken(env, force = false) {
  const token = await env.IG.get('token');
  if (!token) throw new InstagramError('instagram_not_configured', 503);
  const refreshedAt = Number(await env.IG.get('token-refreshed-at') || 0);
  if (!force && refreshedAt && Date.now() - refreshedAt < REFRESH_AFTER_MS) return token;
  const data = await graph('https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token', token);
  if (!data.access_token) throw new InstagramError('instagram_reconnect_required', 503);
  await env.IG.put('token', data.access_token);
  await env.IG.put('token-refreshed-at', String(Date.now()));
  return data.access_token;
}
async function getFeed(env, force = false) {
  const cached = await env.IG.get('feed', 'json');
  const fresh = cached?.posts?.filter((post) => mediaIsFresh(post)) || [];
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_SECONDS * 1000 && fresh.length === cached.posts.length && fresh.length) return fresh;
  let token = await env.IG.get('token');
  if (!token) throw new InstagramError('instagram_not_configured', 503);
  try {
    const refreshedAt = Number(await env.IG.get('token-refreshed-at') || 0);
    if (!refreshedAt || Date.now() - refreshedAt >= REFRESH_AFTER_MS) {
      // Un token válido reciente puede no admitir todavía su primer refresco.
      try { token = await refreshToken(env); } catch { /* La consulta /media valida el token. */ }
    }
    const url = new URL(API);
    url.searchParams.set('fields', FIELDS);
    url.searchParams.set('limit', String(POST_LIMIT));
    const data = await graph(url, token);
    const posts = (data.data || []).map((post) => ({
      id: post.id, type: post.media_type,
      img: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
      link: post.permalink, caption: (post.caption || '').slice(0, 120),
    })).filter((post) => /^\d+$/.test(post.id) && mediaIsFresh(post));
    await env.IG.put('feed', JSON.stringify({ fetchedAt: Date.now(), posts }), { expirationTtl: 6 * 3600 });
    return posts;
  } catch (error) {
    // Nunca devuelve las URLs caducadas del antiguo feed como si fueran vigentes.
    if (error.code !== 'instagram_reconnect_required' && cached && Date.now() - cached.fetchedAt < 6 * 3600_000 && fresh.length) return fresh;
    throw error;
  }
}
async function mediaResponse(request, env, id) {
  let posts = await getFeed(env);
  let post = posts.find((post) => post.id === id);
  if (!post) return response({ error: 'media_not_found' }, 404);
  async function image(url) {
    // Solo se descargan URLs de Instagram obtenidas del feed, nunca URLs del visitante.
    if (!mediaIsFresh({ img: url })) return null;
    return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12_000) });
  }
  let upstream = await image(post.img);
  if (!upstream?.ok) {
    posts = await getFeed(env, true);
    post = posts.find((post) => post.id === id);
    upstream = post ? await image(post.img) : null;
  }
  const type = upstream?.headers.get('Content-Type') || '';
  if (!upstream?.ok || !type.startsWith('image/')) return response({ error: 'media_unavailable' }, 502);
  return new Response(request.method === 'HEAD' ? null : upstream.body, { headers: {
    'Content-Type': type, 'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff',
  } });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return response(null, 200);
    try {
      if (url.pathname === '/set-token' && request.method === 'POST') {
        if (!env.ADMIN_KEY || request.headers.get('Authorization') !== `Bearer ${env.ADMIN_KEY}`) return response({ error: 'unauthorized' }, 401);
        const token = (await request.text()).trim();
        if (!token || token.length > 4096) return response({ error: 'invalid_token' }, 400);
        // Valida la cuenta antes de sustituir una credencial guardada.
        const me = await graph('https://graph.instagram.com/v23.0/me?fields=id,username', token);
        if (me.username !== 'shein.maturin') return response({ error: 'wrong_instagram_account' }, 400);
        await env.IG.put('token', token);
        await env.IG.put('token-refreshed-at', String(Date.now()));
        await env.IG.delete('feed');
        return response({ ok: true });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return response({ error: 'method_not_allowed' }, 405);
      if (url.pathname === '/feed') {
        const posts = await getFeed(env);
        return response(posts.map((post) => ({ ...post, img: `${url.origin}/media/${post.id}` })), 200, 'public, max-age=300');
      }
      const match = url.pathname.match(/^\/media\/(\d+)$/);
      if (match) return await mediaResponse(request, env, match[1]);
      return response({ error: 'not_found' }, 404);
    } catch (error) {
      return response({ error: error.code || 'instagram_unavailable' }, error.status || 503);
    }
  },
  async scheduled(_event, env) {
    try { await refreshToken(env); await getFeed(env, true); }
    catch (error) { console.error('Instagram feed refresh failed:', error.code || 'instagram_unavailable'); }
  },
};

export default worker;
