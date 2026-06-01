import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { codigo } = await req.json();
    if (!codigo || typeof codigo !== 'string') {
      return NextResponse.json({ ok: false, error: 'Código requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cupones')
      .select('codigo, descuento_pct, usado')
      .eq('codigo', codigo.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Cupón no válido' });
    }
    if (data.usado) {
      return NextResponse.json({ ok: false, error: 'Este cupón ya fue utilizado' });
    }

    return NextResponse.json({
      ok: true,
      codigo: data.codigo,
      descuento_pct: data.descuento_pct,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
