import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../instagram-feed-worker.js', import.meta.url), 'utf8');
const { default: worker, mediaIsFresh } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const originalFetch = globalThis.fetch;
const post = (expired = false) => ({ id: '123', type: 'IMAGE', img: `https://scontent.cdninstagram.com/photo.jpg?oe=${Math.floor((Date.now() + (expired ? -3600_000 : 24 * 3600_000)) / 1000).toString(16)}`, link: 'https://www.instagram.com/p/example/' });
function env(values = {}) {
  const store = new Map(Object.entries(values));
  return { ADMIN_KEY: 'test-only-key', IG: {
    get: async (key, type) => { const value = store.get(key); return value && type === 'json' ? JSON.parse(value) : value || null; },
    put: async (key, value) => { store.set(key, value); }, delete: async (key) => { store.delete(key); },
  } };
}

test('rechaza enlaces vencidos y hosts ajenos a Instagram', () => {
  assert.equal(mediaIsFresh(post(true)), false);
  assert.equal(mediaIsFresh(post()), true);
  assert.equal(mediaIsFresh({ img: 'https://cdninstagram.com.attacker.example/image.jpg' }), false);
  assert.equal(mediaIsFresh({ img: 'http://127.0.0.1/image.jpg' }), false);
});

test('un token inválido no devuelve las imágenes caducadas como un feed correcto', async () => {
  const e = env({ token: 'test-token', 'token-refreshed-at': String(Date.now()), feed: JSON.stringify({ fetchedAt: Date.now() - 24 * 3600_000, posts: [post(true)] }) });
  globalThis.fetch = async () => Response.json({ error: { code: 190 } }, { status: 400 });
  try {
    const res = await worker.fetch(new Request('https://feed.example/feed'), e);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'instagram_reconnect_required');
  } finally { globalThis.fetch = originalFetch; }
});

test('los enlaces públicos son estables y la miniatura se entrega desde /media/:id', async () => {
  const p = post();
  const e = env({ token: 'test-token', 'token-refreshed-at': String(Date.now()), feed: JSON.stringify({ fetchedAt: Date.now(), posts: [p] }) });
  const feed = await (await worker.fetch(new Request('https://feed.example/feed'), e)).json();
  assert.equal(feed[0].img, 'https://feed.example/media/123');
  globalThis.fetch = async (url) => {
    assert.equal(String(url), p.img);
    return new Response('image-bytes', { headers: { 'Content-Type': 'image/jpeg' } });
  };
  try {
    const res = await worker.fetch(new Request('https://feed.example/media/123'), e);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/jpeg');
    assert.equal(await res.text(), 'image-bytes');
  } finally { globalThis.fetch = originalFetch; }
});

test('un cron renueva el token y actualiza el feed sin revelar credenciales', async () => {
  const e = env({ token: 'test-token' });
  const calls = [];
  globalThis.fetch = async (raw) => {
    const url = new URL(raw); calls.push(url.pathname);
    return url.pathname === '/refresh_access_token' ? Response.json({ access_token: 'renewed-test-token' }) : Response.json({ data: [{ id: '123', media_type: 'IMAGE', media_url: post().img, permalink: post().link }] });
  };
  try {
    await worker.scheduled({}, e);
    assert.equal(await e.IG.get('token'), 'renewed-test-token');
    assert.equal((await e.IG.get('feed', 'json')).posts.length, 1);
    assert.ok(calls.includes('/refresh_access_token'));
  } finally { globalThis.fetch = originalFetch; }
});
