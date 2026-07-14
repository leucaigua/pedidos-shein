// Mapea un producto del PROVEEDOR (precios base) a una fila de la tabla
// `catalogo`, aplicando el markup de reventa en el servidor.
import type { CatalogoRow, VarianteCatalogo } from '@/types';
import { aplicarMarkup } from './pricing';
import type { ProviderProduct } from './types';

/** slug URL-safe a partir del título + externalId (para unicidad). */
export function slugify(titulo: string, externalId?: string): string {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const sufijo = externalId ? `-${String(externalId).slice(-8)}` : '';
  return (base || 'producto') + sufijo;
}

export interface RowExtra {
  categoria?: string;
  subcategoria?: string;
  activo?: boolean;
  destacado?: boolean;
}

/**
 * Construye la fila a insertar/actualizar en `catalogo`. El precio_usd (reventa)
 * se calcula aquí, en el servidor; las variantes conservan su precio_base_usd
 * INTERNO (se elimina al enviar al frontend, ver toProductoPublico).
 */
export function providerToRow(
  p: ProviderProduct,
  markupPct: number,
  extra: RowExtra = {}
): Partial<CatalogoRow> & { precio_base_usd: number; precio_usd: number } {
  const precioBase = p.precioBaseUsd;
  const variantes: VarianteCatalogo[] = p.variantes.map((v) => ({ ...v }));

  return {
    external_id: p.externalId,
    source: p.source,
    source_url: p.sourceUrl,
    url_shein: p.sourceUrl,            // compat con la columna legada
    slug: slugify(p.titulo, p.externalId),
    nombre: p.titulo,
    descripcion: p.descripcion,
    categoria: extra.categoria ?? p.categoria ?? '',
    subcategoria: extra.subcategoria,
    precio_base_usd: precioBase,
    precio_usd: aplicarMarkup(precioBase, markupPct),
    precio_anterior_usd: p.precioAnteriorUsd
      ? aplicarMarkup(p.precioAnteriorUsd, markupPct)
      : undefined,
    imagen_url: p.imagenes[0] ?? '',
    imagenes: p.imagenes,
    peso_estimado_kg: p.pesoKg ?? 0.3,
    disponibilidad: p.disponibilidad,
    variantes,
    activo: extra.activo ?? true,
    destacado: extra.destacado ?? false,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
