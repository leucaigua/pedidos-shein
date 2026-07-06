import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { aplicarRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit: evita fuerza bruta de códigos de cupón.
  const limite = aplicarRateLimit(req, 'cupon-validar', 20, 60_000);
  if (limite) return limite;

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
