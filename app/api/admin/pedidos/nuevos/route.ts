import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

/**
 * Endpoint ligero para el panel: devuelve los pedidos creados DESPUÉS de la
 * fecha indicada en ?desde=<ISO>. Lo usa la alerta del panel admin para avisar
 * (sonido + notificación) cuando entra un pedido nuevo, sin traer toda la lista.
 */
export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const desde = req.nextUrl.searchParams.get('desde');
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('pedidos')
    .select('codigo, cliente_nombre, total, created_at')
    .eq('archivado', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (desde) query = query.gt('created_at', desde);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    nuevos: data ?? [],
    // Fecha de referencia del pedido más reciente (o null si no hay ninguno).
    ultimo: data && data.length > 0 ? data[0].created_at : null,
  });
}
