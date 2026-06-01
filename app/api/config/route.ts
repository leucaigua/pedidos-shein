import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getSupabaseAdmin } from '@/lib/supabase';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const allowed = ['comision_pct', 'proteccion_activa', 'tasa_bsd', 'whatsapp', 'mensaje_checkout', 'metodos_pago'];

  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([clave, valor]) => ({
      clave,
      valor: typeof valor === 'object' ? JSON.stringify(valor) : String(valor),
    }));

  for (const row of updates) {
    await supabase.from('config').upsert(row, { onConflict: 'clave' });
  }

  return NextResponse.json({ ok: true });
}
