import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('checkouts_abandonados')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[admin/checkouts-abandonados DELETE]', error);
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
