import { NextRequest, NextResponse } from 'next/server';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { aggregateDashboard, dashboardRange, type DashboardOrder, type DashboardQuote, type DashboardCheckout } from '@/lib/dashboard';
import type { DashboardRange, DashboardTraffic } from '@/lib/dashboard';

async function getDashboardTraffic(_range: DashboardRange): Promise<DashboardTraffic> {
  return { status: 'not_configured', sessions: null, users: null, pageViews: null, daily: [] };
}

export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get('days') || 30);
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  const range = dashboardRange(days);
  const db = getSupabaseAdmin();
  // Pagina para evitar que el límite por defecto de Supabase recorte las métricas.
  async function read<T>(table: string, columns: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from(table).select(columns).gte('created_at', range.fromISO).lt('created_at', range.toISO).order('id').range(offset, offset + 999);
      if (error) throw new Error(table);
      rows.push(...(data as T[]));
      if (data.length < 1000) return rows;
    }
  }
  const results = await Promise.allSettled([
    read<DashboardOrder>('pedidos', 'id,codigo,created_at,cliente_nombre,cliente_estado,total,estado,estado_pago,archivado,archivado_motivo'),
    read<DashboardQuote>('cotizaciones', 'created_at,estado,archivado'),
    read<DashboardCheckout>('checkouts_abandonados', 'created_at,recuperado,total'),
    read<{ created_at: string }>('suscriptores', 'created_at'),
    getDashboardTraffic(range),
  ]);
  const [orders, quotes, checkouts, subscribers, traffic] = results;
  if (orders.status === 'rejected') return NextResponse.json({ error: 'No se pudieron cargar los datos de pedidos. Intenta actualizar.' }, { status: 500 });
  const unavailable = [quotes.status === 'rejected' ? 'cotizaciones' : '', checkouts.status === 'rejected' ? 'carritos' : '', subscribers.status === 'rejected' ? 'suscriptores' : ''].filter(Boolean);
  return NextResponse.json({ range, generatedAt: new Date().toISOString(), ...aggregateDashboard(range, orders.value, quotes.status === 'fulfilled' ? quotes.value : [], checkouts.status === 'fulfilled' ? checkouts.value : [], subscribers.status === 'fulfilled' ? subscribers.value : []), traffic: traffic.status === 'fulfilled' ? traffic.value : { status: 'error', sessions: null, users: null, pageViews: null, daily: [] }, unavailable }, { headers: { 'Cache-Control': 'private, no-store' } });
}
