import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import type { ItemCarrito } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, pedido: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  if (body.item_index !== undefined) {
    if (!Number.isInteger(body.item_index) || body.item_index < 0 || typeof body.verificado_shein !== 'boolean') return NextResponse.json({ error: 'Verificación inválida' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: pedido, error: readError } = await db.from('pedidos').select('items').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'No se pudo cargar el pedido' }, { status: 500 });
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    const items = pedido.items as ItemCarrito[];
    if (!items[body.item_index] || items[body.item_index].id !== body.item_id) return NextResponse.json({ error: 'El producto cambió. Actualiza la página.' }, { status: 409 });
    const { data, error } = await db.from('pedidos').update({
      items: items.map((item, index) => index === body.item_index ? { ...item, verificado_shein: body.verificado_shein } : item),
    }).eq('id', id).eq('items', JSON.stringify(items)).select().maybeSingle();
    if (error) return NextResponse.json({ error: 'No se pudo guardar la verificación' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Los productos cambiaron. Actualiza la página e intenta de nuevo.' }, { status: 409 });
    return NextResponse.json({ ok: true, pedido: data });
  }
  const allowed = [
    'estado', 'estado_pago', 'nota_admin', 'tracking_numero', 'tracking_url',
    'items', 'subtotal', 'costo_envio', 'costo_proteccion', 'comision', 'total',
    'archivado', 'archivado_motivo',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Sella/limpia la fecha de archivado según cambie el flag.
  if (body.archivado === true) updates.archivado_en = new Date().toISOString();
  else if (body.archivado === false) {
    updates.archivado_en = null;
    updates.archivado_motivo = null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[admin/pedidos/:id PATCH]', error);
    return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pedido: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Solo se pueden eliminar pedidos previamente archivados (medida de seguridad).
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('archivado')
    .eq('id', id)
    .single();

  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (!pedido.archivado) {
    return NextResponse.json(
      { error: 'Solo se pueden eliminar pedidos archivados' },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) {
    console.error('[admin/pedidos/:id DELETE]', error);
    return NextResponse.json({ error: 'No se pudo eliminar el pedido' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
