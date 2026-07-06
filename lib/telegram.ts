/**
 * Envía alertas a Telegram usando el Bot API.
 *
 * Configuración (variables de entorno):
 *   TELEGRAM_BOT_TOKEN  — token del bot (lo da @BotFather al crear el bot)
 *   TELEGRAM_CHAT_ID    — tu chat ID (lo obtienes de @userinfobot o
 *                          https://api.telegram.org/bot<token>/getUpdates)
 *
 * Si falta cualquiera de las dos, la función no hace nada (no rompe el pedido).
 */

type PedidoTelegram = {
  codigo: string;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  total: number;
  metodo_pago?: string | null;
  items?: unknown[];
};

/** Escapa caracteres reservados de HTML para el parse_mode de Telegram. */
function escaparHTML(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function notificarNuevoPedidoTelegram(pedido: PedidoTelegram): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Sin credenciales configuradas: no notificamos (y no fallamos).
  if (!token || !chatId) return;

  const cantidad = Array.isArray(pedido.items) ? pedido.items.length : 0;
  const total = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(pedido.total || 0);

  const lineas = [
    '🛍️ <b>¡Nuevo pedido!</b>',
    '',
    `🧾 Código: <b>${escaparHTML(pedido.codigo)}</b>`,
    `👤 Cliente: ${escaparHTML(pedido.cliente_nombre)}`,
    pedido.cliente_telefono ? `📱 Teléfono: ${escaparHTML(pedido.cliente_telefono)}` : null,
    `📦 Artículos: ${cantidad}`,
    pedido.metodo_pago ? `💳 Pago: ${escaparHTML(pedido.metodo_pago)}` : null,
    `💰 Total: <b>${total}</b>`,
  ].filter(Boolean);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lineas.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('Telegram: respuesta no OK', res.status, await res.text());
    }
  } catch (e) {
    // Nunca dejamos que un fallo de notificación afecte al pedido.
    console.error('Telegram: error al enviar alerta', e);
  }
}
