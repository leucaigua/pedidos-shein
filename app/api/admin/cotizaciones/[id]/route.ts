import { NextRequest, NextResponse } from 'next/server';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

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
