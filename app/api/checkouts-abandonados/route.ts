import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getConfig } from '@/lib/config';
import { calcularDesgloseCarrito } from '@/lib/calculations';
import { aplicarRateLimit } from '@/lib/rateLimit';

/**
 * Captura pública de carritos/checkouts abandonados.
 * El cliente hace upsert (por session_id) mientras llena el formulario del
 * checkout. Los montos NUNCA se confían al cliente: se recalculan en el
 * servidor a partir de los ítems y la config, igual que en POST /api/pedidos.
 */
export async function POST(req: NextRequest) {
  const limite = aplicarRateLimit(req, 'checkout-abandonado', 30, 60_000);
  if (limite) return limite;

  try {
    const body = await req.json();
    const {
      session_id,
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      cliente_estado,
      items,
    } = body;

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id requerido' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 });
    }

    // Sin datos de contacto no tiene valor guardarlo (no se podría recontactar).
    const telefono = (cliente_telefono ?? '').toString().trim();
    const email = (cliente_email ?? '').toString().trim().toLowerCase();
    if (!telefono && !email) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const config = await getConfig();
    const itemsCalc = (items as Array<Record<string, unknown>>).map((i) => ({
      precio_usd: Number(i.precio_usd) || 0,
      cantidad: Math.max(1, Number(i.cantidad) || 1),
      peso_kg: Number(i.peso_kg) || 0,
    }));
    const desglose = calcularDesgloseCarrito(
      itemsCalc as never,
      config.comision_pct,
      config.proteccion_activa,
    );

    const supabase = getSupabaseAdmin();

    // No revivir un checkout que ya se convirtió en pedido.
    const { data: existente } = await supabase
      .from('checkouts_abandonados')
      .select('recuperado')
      .eq('session_id', session_id)
      .maybeSingle();
    if (existente?.recuperado) {
      return NextResponse.json({ ok: true, recuperado: true });
    }

    const { error } = await supabase
      .from('checkouts_abandonados')
      .upsert(
        {
          session_id,
          cliente_nombre: (cliente_nombre ?? '').toString().trim() || null,
          cliente_telefono: telefono || null,
          cliente_email: email || null,
          cliente_estado: (cliente_estado ?? '').toString().trim() || null,
          items,
          subtotal: desglose.producto,
          total: desglose.total,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      );

    if (error) {
      console.error('[checkouts-abandonados]', error);
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
