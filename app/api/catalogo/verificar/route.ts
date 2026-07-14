import { NextRequest, NextResponse } from 'next/server';
import { aplicarRateLimit } from '@/lib/rateLimit';
import { getCatalogProvider } from '@/lib/catalogo/provider';
import { aplicarMarkup, getMarkupPct, round2 } from '@/lib/catalogo/pricing';
import type { CatalogoSource, Disponibilidad } from '@/types';

// Umbral de cambio de precio que se considera "importante" (requiere avisar).
const UMBRAL_CAMBIO = 0.01; // 1 centavo

interface ItemVerificar {
  catalogo_id?: string;
  external_id?: string;
  source?: CatalogoSource;
  variante_id?: string;
  precio_snapshot: number;
}

interface ResultadoItem {
  external_id?: string;
  catalogo_id?: string;
  disponibilidad: Disponibilidad;
  precio_snapshot: number;
  precio_actual: number | null;
  cambio_precio: boolean;
  delta: number | null;
  pendiente_verificacion: boolean;
  mensaje?: string;
}

// POST checkout (público, con rate limit): re-verifica precio y disponibilidad
// contra el proveedor antes de crear el pedido. No reemplaza precios: informa.
export async function POST(req: NextRequest) {
  const limite = aplicarRateLimit(req, 'catalogo-verificar', 20, 60_000);
  if (limite) return limite;

  const body = await req.json().catch(() => ({}));
  const items: ItemVerificar[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: 'Sin artículos.' }, { status: 400 });

  const provider = getCatalogProvider();
  const markup = await getMarkupPct();
  const resultados: ResultadoItem[] = [];

  for (const item of items) {
    const snapshot = round2(Number(item.precio_snapshot) || 0);
    const base: ResultadoItem = {
      external_id: item.external_id,
      catalogo_id: item.catalogo_id,
      disponibilidad: 'desconocido',
      precio_snapshot: snapshot,
      precio_actual: null,
      cambio_precio: false,
      delta: null,
      pendiente_verificacion: true,
    };

    // Sin fuente externa o proveedor no disponible → pendiente de verificación manual.
    if (!provider.disponible || item.source !== provider.id || !item.external_id) {
      resultados.push({
        ...base,
        mensaje: 'Se verificará manualmente antes de procesar tu pedido.',
      });
      continue;
    }

    try {
      const dispo = await provider.checkAvailability(item.external_id, item.variante_id);
      const precioActual =
        dispo.precioBaseUsd != null ? aplicarMarkup(dispo.precioBaseUsd, markup) : null;
      const delta = precioActual != null ? round2(precioActual - snapshot) : null;
      resultados.push({
        ...base,
        disponibilidad: dispo.disponibilidad,
        precio_actual: precioActual,
        delta,
        cambio_precio: delta != null && Math.abs(delta) >= UMBRAL_CAMBIO,
        pendiente_verificacion: false,
      });
    } catch (e) {
      console.error('[catalogo/verificar]', (e as Error).message);
      resultados.push({
        ...base,
        mensaje: 'No pudimos verificar ahora; lo revisaremos antes de procesar tu pedido.',
      });
    }
  }

  const hayCambios = resultados.some((r) => r.cambio_precio);
  const hayAgotados = resultados.some((r) => r.disponibilidad === 'agotado');
  const hayPendientes = resultados.some((r) => r.pendiente_verificacion);

  return NextResponse.json({
    ok: true,
    resultados,
    hayCambios,
    hayAgotados,
    hayPendientes,
  });
}
