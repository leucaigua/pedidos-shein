import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { usuarioDeToken, tokenDeRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await usuarioDeToken(tokenDeRequest(req));
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Datos del perfil para vincular pedidos hechos como invitado
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('telefono, email')
    .eq('id', user.id)
    .maybeSingle();

  const email = (perfil?.email ?? user.email ?? '').toLowerCase();
  const telefono = perfil?.telefono ?? '';

  // OR: por user_id, por email, o por teléfono exacto (todos indexados)
  const condiciones = [`user_id.eq.${user.id}`];
  if (email) condiciones.push(`cliente_email.eq.${email}`);
  if (telefono) condiciones.push(`cliente_telefono.eq.${telefono}`);

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .or(condiciones.join(','))
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, pedidos: data ?? [] });
}
