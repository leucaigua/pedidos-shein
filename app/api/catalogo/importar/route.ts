import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getCatalogProvider } from '@/lib/catalogo/provider';
import { getMarkupPct, toProductoPublico } from '@/lib/catalogo/pricing';
import { providerToRow } from '@/lib/catalogo/mapper';
import type { CatalogoRow } from '@/types';

// POST admin: importa un producto del proveedor a la tabla `catalogo`.
// Body: { externalId, categoria?, subcategoria?, destacado?, activo? }
export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const provider = getCatalogProvider();
  if (!provider.disponible) {
    return NextResponse.json(
      { error: `El proveedor "${provider.id}" no permite importar en línea. Usa el alta manual.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const externalId = String(body.externalId ?? '').trim();
  if (!externalId) return NextResponse.json({ error: 'Falta externalId' }, { status: 400 });

  let producto;
  try {
    producto = await provider.getProduct(externalId);
  } catch (e) {
    console.error('[catalogo/importar]', (e as Error).message);
    return NextResponse.json({ error: 'No se pudo obtener el producto del proveedor.' }, { status: 502 });
  }
  if (!producto) return NextResponse.json({ error: 'Producto no encontrado en el proveedor.' }, { status: 404 });

  const markup = await getMarkupPct();
  const row = providerToRow(producto, markup, {
    categoria: body.categoria,
    subcategoria: body.subcategoria,
    destacado: body.destacado,
    activo: body.activo,
  });

  const supabase = getSupabaseAdmin();
  // Evita duplicar: si ya existe (misma fuente + external_id), actualiza.
  const { data: existente } = await supabase
    .from('catalogo')
    .select('id')
    .eq('source', producto.source)
    .eq('external_id', externalId)
    .maybeSingle();

  const { data, error } = existente
    ? await supabase.from('catalogo').update(row).eq('id', existente.id).select().single()
    : await supabase.from('catalogo').insert(row).select().single();

  if (error) {
    console.error('[catalogo/importar]', error);
    return NextResponse.json({ error: 'No se pudo guardar el producto.' }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    creado: !existente,
    producto: toProductoPublico(data as CatalogoRow),
  });
}
