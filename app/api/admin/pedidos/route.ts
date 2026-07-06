import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const estado = req.nextUrl.searchParams.get('estado');
  const busqueda = req.nextUrl.searchParams.get('q');
  const archivado = req.nextUrl.searchParams.get('archivado') === 'true';
  const motivo = req.nextUrl.searchParams.get('motivo');

  let query = supabase
    .from('pedidos')
    .select('*')
    .order(archivado ? 'archivado_en' : 'created_at', { ascending: false });

  // Por defecto solo pedidos activos; con ?archivado=true se ven los archivados.
  query = query.eq('archivado', archivado);
  if (archivado && motivo && motivo !== 'todos') query = query.eq('archivado_motivo', motivo);

  if (estado && estado !== 'todos') query = query.eq('estado', estado);
  if (busqueda) {
    // Sanitiza el término: quita caracteres que romperían/inyectarían el
    // filtro PostgREST (comas, paréntesis, comodines) y acota la longitud.
    const q = busqueda.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
    if (q) {
      query = query.or(
        `cliente_nombre.ilike.%${q}%,codigo.ilike.%${q}%,cliente_telefono.ilike.%${q}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin/pedidos]', error);
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pedidos: data });
}
