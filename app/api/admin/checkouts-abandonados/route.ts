import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const estado = req.nextUrl.searchParams.get('estado'); // 'no_recuperados' | 'recuperados' | 'todos'
  const busqueda = req.nextUrl.searchParams.get('q');

  let query = supabase
    .from('checkouts_abandonados')
    .select('*')
    .order('updated_at', { ascending: false });

  if (estado === 'recuperados') query = query.eq('recuperado', true);
  else if (estado !== 'todos') query = query.eq('recuperado', false); // por defecto: no recuperados

  if (busqueda) {
    const q = busqueda.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
    if (q) {
      query = query.or(
        `cliente_nombre.ilike.%${q}%,cliente_telefono.ilike.%${q}%,cliente_email.ilike.%${q}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin/checkouts-abandonados]', error);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkouts: data });
}
