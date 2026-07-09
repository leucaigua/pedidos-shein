import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generarCodigoPedido, calcularDesgloseCarrito } from '@/lib/calculations';
import { getConfig } from '@/lib/config';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import { notificarNuevoPedidoTelegram } from '@/lib/telegram';

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
      checkout_session_id,
    } = body;

    if (!cliente_nombre || !cliente_telefono || !items?.length) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ── Montos: NUNCA se confía en los que envía un cliente ──────────────
    // • Admin autenticado (flujo "Cotización PDF"): los totales del PDF son
    //   finales, se respetan tal cual los envía el panel.
    // • Cliente/invitado (checkout): se RECALCULAN en el servidor a partir de
    //   los ítems y la config (comisión, seguro). Los montos del body se ignoran.
    const admin = await esAdmin(tokenDeRequest(req));

    let subtotalCalc: number;
    let envioCalc: number;
    let proteccionCalc: number;
    let comisionCalc: number;

    if (admin) {
      subtotalCalc = Number(subtotal || 0);
      envioCalc = Number(costo_envio || 0);
      proteccionCalc = Number(costo_proteccion || 0);
      comisionCalc = Number(comision || 0);
    } else {
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
      subtotalCalc = desglose.producto;
      envioCalc = desglose.envio;
      proteccionCalc = desglose.proteccion;
      comisionCalc = desglose.comision;
    }

    const base = subtotalCalc + envioCalc + proteccionCalc + comisionCalc;

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
        subtotal: subtotalCalc,
        costo_envio: envioCalc,
        costo_proteccion: proteccionCalc,
        comision: comisionCalc,
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

    // Marcar el checkout abandonado como recuperado (terminó en un pedido).
    if (checkout_session_id) {
      await supabase
        .from('checkouts_abandonados')
        .update({
          recuperado: true,
          recuperado_en: new Date().toISOString(),
          pedido_codigo: codigo,
        })
        .eq('session_id', checkout_session_id);
    }

    // Alerta de nuevo pedido por Telegram (no bloquea ni afecta la respuesta)
    await notificarNuevoPedidoTelegram({
      codigo,
      cliente_nombre,
      cliente_telefono,
      total,
      metodo_pago,
      items,
    });

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
    .select('codigo, estado, estado_pago, created_at, cliente_nombre, total, items, tracking_numero, tracking_url')
    .eq('codigo', codigo.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, pedido: data });
}
