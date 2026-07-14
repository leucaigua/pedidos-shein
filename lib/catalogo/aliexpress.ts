// Cliente de la API oficial de AliExpress (Open Platform / Dropshipping API).
// SOLO SERVIDOR: usa APP_KEY/APP_SECRET/access_token, nunca se expone al frontend.
//
// Transporte + firma (HMAC-SHA256) del gateway "IOP" (api-sg.aliexpress.com/sync).
// Firma y mapeo VALIDADOS contra respuestas reales de la cuenta:
//   • aliexpress.ds.text.search   → búsqueda por palabra clave
//   • aliexpress.ds.product.get   → detalle + variantes (SKU) + peso + imágenes
//   • aliexpress.ds.product.get   → disponibilidad (se reutiliza el detalle)
import crypto from 'crypto';
import type { Disponibilidad, VarianteCatalogo } from '@/types';
import { getAccessToken } from './aliexpress-auth';
import { cached, TTL } from './cache';
import type { CatalogProvider } from './provider';
import type {
  AvailabilityResult,
  ProductSearchParams,
  ProductSearchResult,
  ProviderProduct,
} from './types';

const GATEWAY = process.env.ALIEXPRESS_API_BASE_URL || 'https://api-sg.aliexpress.com/sync';
const APP_KEY = process.env.ALIEXPRESS_APP_KEY || '';
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET || '';
const SIGN_METHOD = (process.env.ALIEXPRESS_SIGN_METHOD || 'sha256').toLowerCase(); // sha256 | md5
const SHIP_TO = process.env.ALIEXPRESS_SHIP_TO || 'US'; // ruta actual: Miami
const CURRENCY = 'USD';
const LANGUAGE = process.env.ALIEXPRESS_LANGUAGE || 'es';
const SEARCH_LOCALE = process.env.ALIEXPRESS_SEARCH_LOCALE || 'en_US';

const METHOD_SEARCH = process.env.ALIEXPRESS_METHOD_SEARCH || 'aliexpress.ds.text.search';
const METHOD_PRODUCT = process.env.ALIEXPRESS_METHOD_PRODUCT || 'aliexpress.ds.product.get';

type Params = Record<string, string | number | undefined>;

/** Firma IOP: ordena params por clave, concatena k+v y firma con el secret. */
function firmar(params: Params): string {
  const base = Object.keys(params)
    .filter((k) => params[k] !== undefined && k !== 'sign')
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join('');
  if (SIGN_METHOD === 'md5') {
    return crypto
      .createHash('md5')
      .update(APP_SECRET + base + APP_SECRET, 'utf8')
      .digest('hex')
      .toUpperCase();
  }
  return crypto.createHmac('sha256', APP_SECRET).update(base, 'utf8').digest('hex').toUpperCase();
}

/** Ejecuta una llamada firmada al gateway /sync y devuelve el JSON crudo. */
async function llamar<T = Record<string, unknown>>(method: string, business: Params): Promise<T> {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('AliExpress: faltan ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET');
  }
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error(
      'AliExpress: falta access_token. Autoriza la app (OAuth) antes de usar la API de dropshipping.'
    );
  }
  const params: Params = {
    ...business,
    app_key: APP_KEY,
    access_token: accessToken,
    method,
    timestamp: Date.now(),
    sign_method: SIGN_METHOD === 'md5' ? 'md5' : 'sha256',
  };
  params.sign = firmar(params);

  const body = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AliExpress HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    // Errores de parámetro/gateway vienen como error_response.
    if (json.error_response) {
      const e = json.error_response as { msg?: string; code?: string };
      throw new Error(`AliExpress error ${e.code ?? ''}: ${e.msg ?? 'desconocido'}`);
    }
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Helpers -------------------------------------------------------------
function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Normaliza URLs protocol-relative (//host/..) a https. */
function httpsUrl(u: unknown): string {
  const s = String(u ?? '').trim();
  if (!s) return '';
  return s.startsWith('//') ? `https:${s}` : s;
}

function splitImagenes(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(httpsUrl).filter(Boolean);
  if (typeof v === 'string') return v.split(/[;,]/).map((s) => httpsUrl(s)).filter(Boolean);
  return [];
}

function stripHtml(html: unknown): string | undefined {
  const s = String(html ?? '');
  if (!s) return undefined;
  const txt = s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return txt ? txt.slice(0, 2000) : undefined;
}

function stockADisponibilidad(stock: number | undefined): Disponibilidad {
  if (stock === undefined) return 'desconocido';
  if (stock <= 0) return 'agotado';
  if (stock <= 5) return 'pocas';
  return 'disponible';
}

function asObj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

// --- Mapeo: detalle (aliexpress.ds.product.get) --------------------------
// Estructura real:
//   aliexpress_ds_product_get_response.result
//     .ae_item_base_info_dto { subject, detail, category_id, product_status_type }
//     .ae_item_sku_info_dtos.ae_item_sku_info_d_t_o[] { sku_id, offer_sale_price,
//        sku_price, currency_code, sku_available_stock, ae_sku_property_dtos.* }
//     .ae_multimedia_info_dto.image_urls  ("url1;url2;...")
//     .package_info_dto.gross_weight  (KG, p.ej. "0.186")
function mapVariantes(result: Record<string, unknown>): {
  variantes: VarianteCatalogo[];
  precioMin?: number;
  originalMin?: number;
} {
  const skuWrap = asObj(result.ae_item_sku_info_dtos);
  const skus = (skuWrap?.ae_item_sku_info_d_t_o as unknown[]) ?? [];
  const variantes: VarianteCatalogo[] = [];
  const precios: number[] = [];
  const originales: number[] = [];

  for (let i = 0; i < skus.length; i++) {
    const s = asObj(skus[i]) ?? {};
    const propsWrap = asObj(s.ae_sku_property_dtos);
    const props = ((propsWrap?.ae_sku_property_d_t_o as unknown[]) ?? [])
      .map(asObj)
      .filter(Boolean) as Record<string, unknown>[];
    const colorProp = props.find((p) => /col/i.test(String(p.sku_property_name)));
    const sizeProp = props.find((p) => /siz|tall/i.test(String(p.sku_property_name)));
    const stock = num(s.sku_available_stock);
    const precio = num(s.offer_sale_price) ?? num(s.sku_price);
    if (precio !== undefined) precios.push(precio);
    const original = num(s.sku_price);
    if (original !== undefined) originales.push(original);

    variantes.push({
      id: String(s.sku_id ?? s.id ?? i),
      color: colorProp
        ? String(colorProp.property_value_definition_name ?? colorProp.sku_property_value)
        : undefined,
      talla: sizeProp
        ? String(sizeProp.property_value_definition_name ?? sizeProp.sku_property_value)
        : undefined,
      imagen: colorProp?.sku_image ? httpsUrl(colorProp.sku_image) : undefined,
      precio_base_usd: precio,
      disponibilidad: stockADisponibilidad(stock),
    });
  }

  return {
    variantes,
    precioMin: precios.length ? Math.min(...precios) : undefined,
    originalMin: originales.length ? Math.min(...originales) : undefined,
  };
}

function mapDetalle(json: Record<string, unknown>, externalId: string): ProviderProduct | null {
  const resp = asObj(json.aliexpress_ds_product_get_response);
  if (!resp) return null;
  const rsp = num(resp.rsp_code);
  if (rsp !== undefined && rsp !== 200) return null; // p.ej. 605 ITEM_ID_NOT_FOUND
  const result = asObj(resp.result);
  if (!result) return null;

  const base = asObj(result.ae_item_base_info_dto) ?? {};
  const media = asObj(result.ae_multimedia_info_dto) ?? {};
  const pkg = asObj(result.package_info_dto) ?? {};

  const { variantes, precioMin, originalMin } = mapVariantes(result);
  const precioBase = precioMin ?? num(base.sale_price) ?? num(base.min_price);
  if (precioBase === undefined) return null;

  const original = originalMin !== undefined && originalMin > precioBase ? originalMin : undefined;
  const pesoKg = num(pkg.gross_weight); // ya viene en KG
  const activo = String(base.product_status_type ?? 'onSelling') === 'onSelling';

  return {
    externalId,
    source: 'aliexpress',
    sourceUrl: `https://www.aliexpress.com/item/${externalId}.html`,
    titulo: String(base.subject ?? 'Producto'),
    descripcion: stripHtml(base.detail),
    categoria: base.category_id ? String(base.category_id) : undefined,
    precioBaseUsd: precioBase,
    precioAnteriorUsd: original,
    imagenes: splitImagenes(media.image_urls),
    pesoKg: pesoKg && pesoKg > 0 ? pesoKg : undefined,
    disponibilidad: !activo
      ? 'agotado'
      : variantes.length
        ? variantes.every((v) => v.disponibilidad === 'agotado')
          ? 'agotado'
          : 'disponible'
        : 'desconocido',
    variantes,
  };
}

// --- Mapeo: búsqueda (aliexpress.ds.text.search) -------------------------
// Estructura real:
//   aliexpress_ds_text_search_response.data.products.selection_search_product[]
//     { itemId, title, itemMainPic, targetSalePrice, targetOriginalPrice, itemUrl }
function mapItemBusqueda(raw: unknown): ProviderProduct | null {
  const p = asObj(raw);
  if (!p) return null;
  const externalId = String(p.itemId ?? p.product_id ?? '');
  const precioBase = num(p.targetSalePrice) ?? num(p.salePrice);
  if (!externalId || precioBase === undefined) return null;
  const original = num(p.targetOriginalPrice);
  return {
    externalId,
    source: 'aliexpress',
    sourceUrl: httpsUrl(p.itemUrl) || `https://www.aliexpress.com/item/${externalId}.html`,
    titulo: String(p.title ?? 'Producto'),
    precioBaseUsd: precioBase,
    precioAnteriorUsd: original !== undefined && original > precioBase ? original : undefined,
    imagenes: [httpsUrl(p.itemMainPic)].filter(Boolean),
    disponibilidad: 'desconocido',
    variantes: [],
  };
}

export class AliexpressProvider implements CatalogProvider {
  readonly id = 'aliexpress' as const;
  readonly disponible = Boolean(APP_KEY && APP_SECRET);

  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    const pagina = Math.max(1, params.pagina ?? 1);
    const porPagina = Math.min(50, params.porPagina ?? 20);
    const key = `ae:search:${JSON.stringify(params)}`;

    return cached(key, TTL.search(), async () => {
      const json = await llamar(METHOD_SEARCH, {
        keyword: params.query,
        currency: CURRENCY,
        countryCode: SHIP_TO,
        local: SEARCH_LOCALE,
        pageSize: porPagina,
        pageIndex: pagina,
      });

      const resp = asObj(json.aliexpress_ds_text_search_response);
      const data = asObj(resp?.data);
      const productsWrap = asObj(data?.products);
      const lista = (productsWrap?.selection_search_product as unknown[]) ?? [];
      const productos = lista
        .map(mapItemBusqueda)
        .filter((x): x is ProviderProduct => x !== null);

      return {
        productos,
        pagina,
        porPagina,
        total: num(data?.totalCount),
        hayMas: productos.length >= porPagina,
      };
    });
  }

  async getProduct(externalId: string): Promise<ProviderProduct | null> {
    const key = `ae:product:${externalId}`;
    return cached(key, TTL.product(), async () => {
      const json = await llamar(METHOD_PRODUCT, {
        product_id: externalId,
        ship_to_country: SHIP_TO,
        target_currency: CURRENCY,
        target_language: LANGUAGE,
      });
      return mapDetalle(json, externalId);
    });
  }

  async getVariants(externalId: string): Promise<VarianteCatalogo[]> {
    const producto = await this.getProduct(externalId);
    return producto?.variantes ?? [];
  }

  async checkAvailability(externalId: string, variantId?: string): Promise<AvailabilityResult> {
    const key = `ae:avail:${externalId}:${variantId ?? ''}`;
    return cached(key, TTL.availability(), async () => {
      const producto = await this.getProduct(externalId);
      if (!producto) return { disponibilidad: 'agotado' };
      if (variantId) {
        const v = producto.variantes.find((x) => x.id === variantId);
        if (v) return { disponibilidad: v.disponibilidad ?? 'desconocido', precioBaseUsd: v.precio_base_usd };
      }
      return { disponibilidad: producto.disponibilidad, precioBaseUsd: producto.precioBaseUsd };
    });
  }
}
