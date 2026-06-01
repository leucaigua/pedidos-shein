import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from './supabase';

export function tokenDeRequest(req: NextRequest): string | null {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

export async function usuarioDeToken(token: string | null) {
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

/** Verifica que el token pertenezca a un usuario con rol 'admin'. */
export async function esAdmin(token: string | null): Promise<boolean> {
  const user = await usuarioDeToken(token);
  if (!user) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  return data?.rol === 'admin';
}
