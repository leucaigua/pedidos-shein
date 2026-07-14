import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { aplicarMarkup, getMarkupPct, toProductoPublico } from '@/lib/catalogo/pricing';
import { slugify } from '@/lib/catalogo/mapper';
import { orDeBusqueda } from '@/lib/catalogo/search';
import type { CatalogoRow } from '@/types';

const POR_PAGINA_DEFAULT = 24;

// GET: lee de la DB (no del proveedor).
//  • Público: solo productos activos, SIN el precio base interno.
//  • Admin (?todos=true + token admin): incluye inactivos y el precio base (para editar).
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const sp = req.nextUrl.searchParams;

  const modoAdmin = sp.get('todos') === 'true' && (await esAdmin(tokenDeRequest(req)));

  const categoria = sp.get('categoria');
  const q = sp.get('q')?.trim();
  const precioMin = sp.get('precioMin');
  const precioMax = sp.get('precioMax');
  const orden = sp.get('orden'); // relevancia | precio_asc | precio_desc
  const destacados = sp.get('destacados') === 'true';
  const ofertas = sp.get('ofertas') === 'true';
  const pagina = Math.max(1, Number(sp.get('pagina') ?? 1));
  const porPagina = Math.min(50, Number(sp.get('porPagina') ?? POR_PAGINA_DEFAULT));

  let query = supabase.from('catalogo').select('*', { count: 'exact' });
  if (!modoAdmin) query = query.eq('activo', true);

  if (categoria && categoria !== 'Todas') query = query.eq('categoria', categoria);
  if (q) {
    // Búsqueda español→inglés (los nombres vienen en inglés de AliExpress).
    const orStr = orDeBusqueda(q);
    if (orStr) query = query.or(orStr);
    else query = query.ilike('nombre', `%${q}%`);
  }
  if (precioMin) query = query.gte('precio_usd', Number(precioMin));
  if (precioMax) query = query.lte('precio_usd', Number(precioMax));
  if (destacados) query = query.eq('destacado', true);
  if (ofertas) query = query.not('precio_anterior_usd', 'is', null);

  if (orden === 'precio_asc') query = query.order('precio_usd', { ascending: true });
  else if (orden === 'precio_desc') query = query.order('precio_usd', { ascending: false });
  else query = query.order('destacado', { ascending: false }).order('created_at', { ascending: false });

  const desde = (pagina - 1) * porPagina;
  query = query.range(desde, desde + porPagina - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[catalogo]', error);
    return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 });
  }

  // El admin recibe las filas crudas (con precio_base_usd) para poder editar.
  const filas = (data as CatalogoRow[]) ?? [];
  const productos = modoAdmin ? filas : filas.map(toProductoPublico);
  const total = count ?? productos.length;
  return NextResponse.json({
    ok: true,
    productos,
    pagina,
    porPagina,
    total,
    hayMas: desde + productos.length < total,
  });
}

// POST admin: crea un producto (manual). Calcula el precio de reventa en servidor.
export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const markup = await getMarkupPct();

  const row: Record<string, unknown> = { ...body, source: body.source ?? 'manual' };
  if (body.precio_base_usd != null && body.precio_usd == null) {
    row.precio_usd = aplicarMarkup(Number(body.precio_base_usd), markup);
  }
  if (!body.slug && body.nombre) row.slug = slugify(String(body.nombre), body.external_id);
  row.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('catalogo').insert(row).select().single();
  if (error) {
    console.error('[catalogo]', error);
    return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, producto: toProductoPublico(data as CatalogoRow) });
}

// PATCH admin: edita un producto. Si cambia el precio base, recalcula el de reventa.
export async function PATCH(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  // Precio de reventa: si llega precio_base_usd y no un precio_usd explícito,
  // se recalcula con el markup vigente (el cliente nunca fija el precio).
  if (updates.precio_base_usd != null && updates.precio_usd == null) {
    const markup = await getMarkupPct();
    updates.precio_usd = aplicarMarkup(Number(updates.precio_base_usd), markup);
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('catalogo')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[catalogo]', error);
    return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, producto: toProductoPublico(data as CatalogoRow) });
}

export async function DELETE(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();
  const { error } = await supabase.from('catalogo').delete().eq('id', id);
  if (error) {
    console.error('[catalogo]', error);
    return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
