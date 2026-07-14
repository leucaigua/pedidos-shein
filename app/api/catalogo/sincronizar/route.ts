import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getCatalogProvider } from '@/lib/catalogo/provider';
import { aplicarMarkup, getMarkupPct } from '@/lib/catalogo/pricing';
import type { CatalogoRow } from '@/types';

// POST admin: re-sincroniza precio/stock/variantes de uno o varios productos.
// Body: { ids: string[] }  (ids de la tabla `catalogo`)
export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const provider = getCatalogProvider();
  if (!provider.disponible) {
    return NextResponse.json(
      { error: `El proveedor "${provider.id}" no permite sincronizar en línea.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : body.id ? [String(body.id)] : [];
  if (ids.length === 0) return NextResponse.json({ error: 'Falta ids' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const markup = await getMarkupPct();

  const { data: filas, error } = await supabase
    .from('catalogo')
    .select('id, external_id, source')
    .in('id', ids);
  if (error) {
    console.error('[catalogo/sincronizar]', error);
    return NextResponse.json({ error: 'Error leyendo el catálogo.' }, { status: 500 });
  }

  const resultados: { id: string; status: 'success' | 'failed'; error?: string }[] = [];

  for (const fila of (filas as CatalogoRow[]) ?? []) {
    if (!fila.external_id || fila.source !== provider.id) {
      resultados.push({ id: fila.id, status: 'failed', error: 'Sin external_id o fuente distinta.' });
      continue;
    }
    try {
      const p = await provider.getProduct(fila.external_id);
      if (!p) {
        await supabase
          .from('catalogo')
          .update({ disponibilidad: 'agotado', last_synced_at: new Date().toISOString() })
          .eq('id', fila.id);
        resultados.push({ id: fila.id, status: 'success' });
        continue;
      }
      await supabase
        .from('catalogo')
        .update({
          precio_base_usd: p.precioBaseUsd,
          precio_usd: aplicarMarkup(p.precioBaseUsd, markup),
          precio_anterior_usd: p.precioAnteriorUsd ? aplicarMarkup(p.precioAnteriorUsd, markup) : null,
          disponibilidad: p.disponibilidad,
          variantes: p.variantes,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fila.id);
      resultados.push({ id: fila.id, status: 'success' });
    } catch (e) {
      console.error('[catalogo/sincronizar]', fila.id, (e as Error).message);
      resultados.push({ id: fila.id, status: 'failed', error: 'Error del proveedor.' });
    }
  }

  const ok = resultados.filter((r) => r.status === 'success').length;
  return NextResponse.json({ ok: true, sincronizados: ok, total: resultados.length, resultados });
}
