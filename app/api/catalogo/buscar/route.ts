import { NextRequest, NextResponse } from 'next/server';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getCatalogProvider } from '@/lib/catalogo/provider';
import { aplicarMarkup, getMarkupPct } from '@/lib/catalogo/pricing';
import type { OrdenCatalogo } from '@/lib/catalogo/types';

// POST admin: busca productos en el proveedor externo (AliExpress) para importar.
// Solo admin: la respuesta incluye el precio base (interno) + el de reventa.
export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const provider = getCatalogProvider();
  if (!provider.disponible) {
    return NextResponse.json(
      { error: `El proveedor "${provider.id}" no está configurado para búsqueda en línea.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const markup = await getMarkupPct();

  try {
    const result = await provider.searchProducts({
      query: body.query,
      categoria: body.categoria,
      precioMin: body.precioMin != null ? Number(body.precioMin) : undefined,
      precioMax: body.precioMax != null ? Number(body.precioMax) : undefined,
      orden: body.orden as OrdenCatalogo | undefined,
      pagina: body.pagina != null ? Number(body.pagina) : 1,
      porPagina: body.porPagina != null ? Number(body.porPagina) : 20,
    });

    const productos = result.productos.map((p) => ({
      ...p,
      precioVentaUsd: aplicarMarkup(p.precioBaseUsd, markup),
    }));

    return NextResponse.json({ ok: true, ...result, productos, markupPct: markup });
  } catch (e) {
    console.error('[catalogo/buscar]', (e as Error).message);
    return NextResponse.json({ error: 'No se pudo buscar en el proveedor.' }, { status: 502 });
  }
}
