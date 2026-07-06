import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { usuarioDeToken, tokenDeRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await usuarioDeToken(tokenDeRequest(req));
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // ⚠️ SEGURIDAD (IDOR): vinculamos pedidos SOLO por identificadores que el
  // usuario realmente posee:
  //   • user_id de la sesión, y
  //   • el email de la CUENTA (del token, verificado por Supabase).
  // NO usamos el teléfono/email del perfil, porque el usuario puede editarlos
  // (RLS "perfil propio update") y pondría el de una víctima para leer sus
  // pedidos de invitado.
  const email = (user.email ?? '').toLowerCase();

  // OR: por user_id o por email de la cuenta (ambos indexados).
  // El email se descarta si trae caracteres que romperían el filtro PostgREST.
  const condiciones = [`user_id.eq.${user.id}`];
  if (email && !/[,()]/.test(email)) condiciones.push(`cliente_email.eq.${email}`);

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .or(condiciones.join(','))
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[mis-pedidos]', error);
    return NextResponse.json({ error: 'No se pudieron cargar tus pedidos' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pedidos: data ?? [] });
}
