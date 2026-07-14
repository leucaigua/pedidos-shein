import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Envíos y Devoluciones — Pedidos SHEIN Venezuela',
  description:
    'Plazos de entrega, condiciones de envío y política de cambios y devoluciones de Pedidos SHEIN Venezuela.',
};

export default function EnviosDevolucionesPage() {
  return (
    <LegalLayout
      titulo="Política de Envíos y Devoluciones"
      actualizado="13 de julio de 2026"
      intro="Aquí encuentras cómo funcionan los envíos y qué opciones tienes si algo no sale como esperabas. Al tratarse de un servicio de compra por encargo, algunas condiciones difieren de una tienda tradicional."
    >
      <h2>1. Envíos</h2>
      <ul>
        <li><strong>Modalidad:</strong> envío aéreo internacional mediante casillero (ZOOM Casilleros u operador equivalente).</li>
        <li><strong>Plazo estimado:</strong> de 10 a 15 días hábiles una vez comprado el producto. Es un estimado y puede variar por causas ajenas a nosotros.</li>
        <li><strong>Cobertura:</strong> entregamos en toda Venezuela a través de la red del courier.</li>
        <li><strong>Seguimiento:</strong> te mantenemos informado del estado de tu pedido, principalmente por WhatsApp.</li>
      </ul>

      <h2>2. Costo de envío</h2>
      <p>
        El costo de envío se calcula según el peso y volumen del pedido y se incluye en el precio
        final estimado antes de que confirmes. Si el peso real declarado por el courier difiere
        significativamente del estimado, te informaremos cualquier ajuste antes de la entrega.
      </p>

      <h2>3. Recepción del pedido</h2>
      <ul>
        <li>Al recibir tu pedido, revísalo en presencia del transportista cuando sea posible.</li>
        <li>El saldo del 40% restante se cancela al momento del retiro o entrega.</li>
        <li>Si detectas un daño evidente de transporte, tómale fotos y repórtalo de inmediato (ver punto 5).</li>
      </ul>

      <h2>4. Cambios</h2>
      <p>
        Como compramos cada producto por encargo según la talla y el color que nos indicas, no
        realizamos cambios por gusto, arrepentimiento o error en la elección de talla del cliente.
        Te recomendamos revisar bien la guía de tallas de SHEIN antes de confirmar. Si necesitas
        ayuda para elegir, escríbenos antes de pagar.
      </p>

      <h2>5. Devoluciones y reclamos</h2>
      <p>Aceptamos reclamos en los siguientes casos:</p>
      <ul>
        <li><strong>Producto equivocado:</strong> si recibiste un artículo distinto al que encargaste por un error nuestro.</li>
        <li><strong>Producto defectuoso o dañado:</strong> defecto de fábrica o daño ocurrido en el transporte cubierto por el seguro de carga.</li>
        <li><strong>Producto no entregado:</strong> si el pedido se pierde durante el proceso de importación.</li>
      </ul>
      <p>
        Para gestionar un reclamo, contáctanos dentro de las <strong>48 horas</strong> siguientes
        a la recepción, adjuntando fotos del producto y del empaque, y el número de tu pedido.
        Evaluaremos cada caso y, según corresponda, ofreceremos la reposición del artículo, un
        saldo a favor o el reembolso del monto correspondiente.
      </p>

      <h2>6. Casos no cubiertos</h2>
      <ul>
        <li>Diferencias de color, textura o talla propias del producto de SHEIN respecto a las fotos de la tienda.</li>
        <li>Elección equivocada de talla, modelo o color por parte del cliente.</li>
        <li>Datos de entrega incorrectos que impidan o retrasen la entrega.</li>
        <li>Retrasos causados por SHEIN, el courier, aduanas o situaciones de fuerza mayor.</li>
      </ul>

      <h2>7. Reembolsos</h2>
      <p>
        Cuando proceda un reembolso, se realizará por el mismo método de pago utilizado o por
        acuerdo con el cliente, en un plazo razonable una vez validado el reclamo. Los reembolsos
        en bolívares se calculan a la tasa vigente al momento de procesarse.
      </p>

      <h2>8. Contacto</h2>
      <p>
        Para cualquier gestión de envío o devolución, escríbenos por{' '}
        <a href="https://wa.me/584121183253">WhatsApp</a> o a{' '}
        <a href="mailto:info@pedidosshein.com">info@pedidosshein.com</a> con tu número de pedido a
        la mano.
      </p>
    </LegalLayout>
  );
}
