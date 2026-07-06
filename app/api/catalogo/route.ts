import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('catalogo')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) { console.error('[catalogo]', error); return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 }); }
  return NextResponse.json({ ok: true, productos: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { data, error } = await supabase.from('catalogo').insert(body).select().single();
  if (error) { console.error('[catalogo]', error); return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 }); }
  return NextResponse.json({ ok: true, producto: data });
}

export async function PATCH(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from('catalogo')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('[catalogo]', error); return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 }); }
  return NextResponse.json({ ok: true, producto: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();
  const { error } = await supabase.from('catalogo').delete().eq('id', id);
  if (error) { console.error('[catalogo]', error); return NextResponse.json({ error: 'Error en el catálogo' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
