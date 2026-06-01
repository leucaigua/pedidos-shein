import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

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
  const body = await req.json();
  const allowed = ['estado', 'nota_admin'];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pedido: data });
}
