import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generarCodigoPedido } from '@/lib/calculations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cliente_nombre,
      cliente_cedula,
      cliente_telefono,
      cliente_estado,
      cliente_direccion,
      nota_cliente,
      metodo_pago,
      subtotal,
      costo_envio,
      costo_proteccion,
      comision,
      items,
      codigo_cupon,
      user_id,
      cliente_email,
    } = body;

    if (!cliente_nombre || !cliente_telefono || !items?.length) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Base del pedido (recalculada en el servidor, no se confía en el cliente)
    const base =
      Number(subtotal || 0) +
      Number(costo_envio || 0) +
      Number(costo_proteccion || 0) +
      Number(comision || 0);

    // ── Validar y aplicar cupón (server-side) ───────────────────────────
    let descuento = 0;
    let cuponValido: { codigo: string; descuento_pct: number } | null = null;

    if (codigo_cupon) {
      const { data: cupon } = await supabase
        .from('cupones')
        .select('codigo, descuento_pct, usado')
        .eq('codigo', String(codigo_cupon).trim().toUpperCase())
        .maybeSingle();

      if (!cupon || cupon.usado) {
        return NextResponse.json(
          { error: 'El cupón no es válido o ya fue utilizado.' },
          { status: 400 }
        );
      }
      cuponValido = { codigo: cupon.codigo, descuento_pct: cupon.descuento_pct };
      descuento = base * (cupon.descuento_pct / 100);
    }

    const total = base - descuento;
    const codigo = generarCodigoPedido();

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        codigo,
        estado: 'pendiente_pago',
        cliente_nombre,
        cliente_cedula,
        cliente_telefono,
        cliente_estado,
        cliente_direccion,
        nota_cliente,
        metodo_pago,
        subtotal,
        costo_envio,
        costo_proteccion,
        comision,
        descuento,
        codigo_cupon: cuponValido?.codigo ?? null,
        total,
        items,
        user_id: user_id ?? null,
        cliente_email: cliente_email ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear pedido:', error);
      return NextResponse.json({ error: 'Error al guardar el pedido' }, { status: 500 });
    }

    // Marcar cupón como usado (uso único)
    if (cuponValido) {
      await supabase
        .from('cupones')
        .update({ usado: true, usado_en: new Date().toISOString(), pedido_codigo: codigo })
        .eq('codigo', cuponValido.codigo)
        .eq('usado', false);
    }

    return NextResponse.json({ ok: true, codigo, id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get('codigo');
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pedidos')
    .select('codigo, estado, created_at, cliente_nombre, total, items, tracking_numero, tracking_url')
    .eq('codigo', codigo.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, pedido: data });
}
