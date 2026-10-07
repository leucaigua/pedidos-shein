import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calcularDesgloseCarrito } from '@/lib/calculations';
import { getConfig } from '@/lib/config';
import type { ItemCarrito } from '@/types';

export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  let query = getSupabaseAdmin().from('cotizaciones').select('*')
    .eq('archivado', req.nextUrl.searchParams.get('archivado') === 'true').order('created_at', { ascending: false });
  const estado = req.nextUrl.searchParams.get('estado');
  if (estado && estado !== 'todos') query = query.eq('estado', estado);
  const q = (req.nextUrl.searchParams.get('q') || '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
  if (q) query = query.or(`codigo.ilike.%${q}%,cliente_nombre.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las cotizaciones. Verifica la migración de cotizaciones en Supabase.' }, { status: 500 });
  return NextResponse.json({ cotizaciones: data });
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const nombre = typeof body.cliente_nombre === 'string' ? body.cliente_nombre.trim().slice(0, 150) : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id || '') || !nombre || !Array.isArray(body.items) || !body.items.length || body.items.length > 200) {
      return NextResponse.json({ error: 'Ingresa el nombre del cliente y al menos un artículo.' }, { status: 400 });
    }
    if (body.items.some((i: ItemCarrito) => !i || !Number.isFinite(i.precio_usd) || i.precio_usd <= 0 || !Number.isInteger(i.cantidad) || i.cantidad < 1 || !Number.isFinite(i.peso_kg) || i.peso_kg <= 0)) {
      return NextResponse.json({ error: 'Los precios, cantidades y pesos deben ser válidos.' }, { status: 400 });
    }
    const db = getSupabaseAdmin();
    const { data: existente, error: readError } = await db.from('cotizaciones').select('id, archivado, estado').eq('id', body.id).maybeSingle();
    if (readError) throw readError;
    if (existente?.archivado || existente?.estado === 'no_procesada') return NextResponse.json({ error: 'La cotización está archivada o no procesada y ya no está en curso.' }, { status: 409 });
    const config = await getConfig();
    const d = calcularDesgloseCarrito(body.items, config.comision_pct, config.proteccion_activa);
    const values = { cliente_nombre: nombre, items: body.items, pago_total: body.pago_total === true,
      subtotal: d.producto, costo_envio: d.envio, costo_proteccion: d.proteccion, comision: d.comision, total: d.total, updated_at: new Date().toISOString() };
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
    // El mismo borrador conserva su código incluso ante guardados simultáneos.
    const { error: insertError } = await db.from('cotizaciones').upsert({ id: body.id, codigo: `CS-${fecha}-${randomBytes(4).toString('hex').toUpperCase()}`, ...values }, { onConflict: 'id', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data, error } = await db.from('cotizaciones').update(values).eq('id', body.id).eq('archivado', false).neq('estado', 'no_procesada').select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'La cotización ya no está en curso.' }, { status: 409 });
    return NextResponse.json({ ok: true, cotizacion: data });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la cotización. Verifica la migración de cotizaciones en Supabase.' }, { status: 500 });
  }
}
