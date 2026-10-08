import { NextRequest, NextResponse } from 'next/server';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ItemCarrito } from '@/types';

type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Context) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().from('cotizaciones').select('*').eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
  return NextResponse.json({ cotizacion: data });
}
export async function PATCH(req: NextRequest, { params }: Context) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  if (body.item_id !== undefined) {
    if (typeof body.item_id !== 'string' || typeof body.verificado_shein !== 'boolean') return NextResponse.json({ error: 'Producto o verificación inválidos' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: quote, error: readError } = await db.from('cotizaciones').select('items,updated_at').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'No se pudo cargar la cotización' }, { status: 500 });
    if (!quote) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    const items = quote.items as ItemCarrito[];
    if (!items.some((item) => item.id === body.item_id)) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    const { data, error } = await db.from('cotizaciones').update({
      items: items.map((item) => item.id === body.item_id ? { ...item, verificado_shein: body.verificado_shein } : item),
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('updated_at', quote.updated_at).select().maybeSingle();
    if (error) return NextResponse.json({ error: 'No se pudo guardar la verificación' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'La cotización cambió. Recarga la página e intenta de nuevo.' }, { status: 409 });
    return NextResponse.json({ cotizacion: data });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.estado !== undefined) {
    if (!['aprobada', 'pendiente_aprobacion', 'no_procesada'].includes(body.estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    updates.estado = body.estado;
  }
  if (typeof body.archivado === 'boolean') {
    updates.archivado = body.archivado;
    updates.archivado_en = body.archivado ? new Date().toISOString() : null;
  }
  const { data, error } = await getSupabaseAdmin().from('cotizaciones').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la cotización' }, { status: 500 });
  return NextResponse.json({ cotizacion: data });
}
