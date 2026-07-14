import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { aplicarMarkup, getMarkupPct, toProductoPublico } from '@/lib/catalogo/pricing';
import { getCatalogProvider } from '@/lib/catalogo/provider';
import type { CatalogoRow } from '@/types';

// GET público: un producto por slug (o id como respaldo). Sin precio base interno.
// Enriquecimiento perezoso: si el producto vino de una importación masiva ligera
// (sin variantes), la primera vez que se abre se traen variantes/peso/precio
// frescos de AliExpress y se guardan, para no gastar 1 llamada por producto al importar.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  let { data, error } = await supabase
    .from('catalogo')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle();

  if (!data && !error) {
    ({ data, error } = await supabase
      .from('catalogo')
      .select('*')
      .eq('id', slug)
      .eq('activo', true)
      .maybeSingle());
  }

  if (error) {
    console.error('[catalogo/slug]', error);
    return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  let row = data as CatalogoRow;

  // Enriquecer si falta detalle (variantes vacías) y viene de AliExpress.
  const sinVariantes = !row.variantes || row.variantes.length === 0;
  if (sinVariantes && row.source === 'aliexpress' && row.external_id) {
    try {
      const provider = getCatalogProvider();
      if (provider.disponible) {
        const p = await provider.getProduct(row.external_id);
        if (p) {
          const markup = await getMarkupPct();
          const updates = {
            precio_base_usd: p.precioBaseUsd,
            precio_usd: aplicarMarkup(p.precioBaseUsd, markup),
            precio_anterior_usd: p.precioAnteriorUsd ? aplicarMarkup(p.precioAnteriorUsd, markup) : row.precio_anterior_usd ?? null,
            descripcion: p.descripcion ?? row.descripcion,
            imagenes: p.imagenes.length ? p.imagenes : row.imagenes,
            imagen_url: p.imagenes[0] ?? row.imagen_url,
            peso_estimado_kg: p.pesoKg ?? row.peso_estimado_kg,
            disponibilidad: p.disponibilidad,
            variantes: p.variantes,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const { data: actualizado } = await supabase
            .from('catalogo')
            .update(updates)
            .eq('id', row.id)
            .select()
            .single();
          if (actualizado) row = actualizado as CatalogoRow;
        }
      }
    } catch (e) {
      console.error('[catalogo/slug] enriquecer', (e as Error).message);
      // No bloquea: se muestra el producto con los datos ligeros.
    }
  }

  return NextResponse.json({ ok: true, producto: toProductoPublico(row) });
}
