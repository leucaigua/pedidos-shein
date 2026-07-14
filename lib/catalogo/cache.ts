// Caché en memoria con expiración (TTL) para respuestas del proveedor externo.
// Evita llamar a AliExpress en cada render/petición. Los TTL se configuran por env:
//   CATALOGO_SEARCH_CACHE_TTL, CATALOGO_PRODUCT_CACHE_TTL, CATALOGO_AVAILABILITY_CACHE_TTL
//
// Nota: en entornos serverless (Netlify) la memoria no se comparte entre
// invocaciones; la caché ayuda dentro de una instancia caliente. Para caché
// compartida real se puede migrar a la tabla `catalogo` (sync) o a un KV externo.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

function ttlFromEnv(name: string, fallbackSeconds: number): number {
  const raw = Number(process.env[name]);
  return (Number.isFinite(raw) && raw > 0 ? raw : fallbackSeconds) * 1000;
}

export const TTL = {
  search: () => ttlFromEnv('CATALOGO_SEARCH_CACHE_TTL', 1800),
  product: () => ttlFromEnv('CATALOGO_PRODUCT_CACHE_TTL', 3600),
  availability: () => ttlFromEnv('CATALOGO_AVAILABILITY_CACHE_TTL', 300),
};

/** Devuelve el valor cacheado y vigente, o `undefined` si expiró/no existe. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Envuelve una función async con caché por clave + TTL. */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}
