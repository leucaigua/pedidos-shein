// Precio de REVENTA del catálogo. Se calcula SOLO en el servidor.
//   precio_usd = round2(precio_base_usd × (1 + markup/100))
// El cliente nunca envía ni fija precios; ver también recálculo en el checkout.
import { getConfig } from '@/lib/config';
import type { CatalogoRow, ProductoCatalogo, VarianteCatalogo } from '@/types';

/** Redondeo monetario a 2 decimales (mismo criterio que lib/calculations). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Aplica el markup de reventa a un precio base. */
export function aplicarMarkup(precioBaseUsd: number, markupPct: number): number {
  return round2(precioBaseUsd * (1 + markupPct / 100));
}

/** Lee el markup vigente desde la config (tabla `config`). */
export async function getMarkupPct(): Promise<number> {
  const { catalogo_markup_pct } = await getConfig();
  return Number.isFinite(catalogo_markup_pct) ? catalogo_markup_pct : 20;
}

/**
 * Convierte una fila cruda de `catalogo` (con precio_base_usd interno) en el
 * objeto público que se envía al frontend, ELIMINANDO el precio base y el de
 * las variantes. Nunca devuelvas la fila cruda a un cliente.
 */
export function toProductoPublico(row: CatalogoRow): ProductoCatalogo {
  const { precio_base_usd: _omit, variantes, ...resto } = row;
  const variantesPublicas: VarianteCatalogo[] | undefined = variantes?.map((v) => {
    const { precio_base_usd: _v, ...vResto } = v;
    return vResto;
  });
  return { ...resto, variantes: variantesPublicas };
}
