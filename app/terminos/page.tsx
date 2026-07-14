import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Pedidos SHEIN Venezuela',
  description:
    'Condiciones de uso del servicio de compras por encargo de Pedidos SHEIN Venezuela.',
};

export default function TerminosPage() {
  return (
    <LegalLayout
      titulo="Términos y Condiciones"
      actualizado="13 de julio de 2026"
      intro="Al usar Pedidos SHEIN Venezuela y realizar un pedido, aceptas estos Términos y Condiciones. Léelos con atención antes de contratar nuestro servicio."
    >
      <h2>1. Quiénes somos y qué ofrecemos</h2>
      <p>
        <strong>Pedidos SHEIN Venezuela</strong> es un servicio independiente de{' '}
        <strong>compras por encargo (intermediación)</strong>. Compramos por ti productos de
        SHEIN, los importamos mediante casillero internacional y te los entregamos en Venezuela.
        Actuamos como intermediarios entre tú y la tienda; no somos el fabricante ni el vendedor
        original de los productos.
      </p>

      <h2>2. Sin afiliación con SHEIN</h2>
      <p>
        No estamos afiliados, asociados, autorizados ni respaldados por SHEIN ni por sus
        empresas relacionadas. «SHEIN» es una marca registrada de su titular. Su uso en este
        sitio es meramente descriptivo, para identificar los productos que puedes encargar.
      </p>

      <h2>3. Cómo funciona el pedido</h2>
      <ol>
        <li>Nos envías las capturas o enlaces de los productos que quieres, con talla y color.</li>
        <li>Calculamos el precio final estimado, que incluye el costo del producto, el envío internacional y nuestra comisión.</li>
        <li>Confirmas el pedido y abonas el <strong>60%</strong> para procesarlo.</li>
        <li>Compramos e importamos los productos.</li>
        <li>Al momento de retirar o recibir el pedido, cancelas el <strong>40%</strong> restante.</li>
      </ol>

      <h2>4. Precios y pagos</h2>
      <ul>
        <li>Los precios se expresan en dólares estadounidenses (USD) y pueden pagarse en su equivalente en bolívares según la tasa vigente que indiquemos.</li>
        <li>Aceptamos Binance Pay (USDT), Zelle, Pago Móvil / transferencia en Bs y efectivo en USD, según disponibilidad.</li>
        <li>El precio mostrado antes de confirmar es un <strong>estimado</strong>. Si el precio real del producto o del envío cambia de forma significativa (por variaciones de SHEIN, peso real, aduanas o tasa de cambio), te lo informaremos antes de proceder y podrás aceptar el ajuste o cancelar.</li>
        <li>El abono del 60% es necesario para iniciar la compra. El pedido no se procesa hasta confirmar el pago.</li>
      </ul>

      <h2>5. Disponibilidad de productos</h2>
      <p>
        La disponibilidad, el precio y las características de los productos dependen de SHEIN. Si
        un producto se agota, cambia de precio o resulta imposible de adquirir tras tu abono, te
        lo comunicaremos y podrás elegir un reemplazo, dejar el monto como saldo a favor o
        solicitar la devolución de lo abonado por ese artículo.
      </p>

      <h2>6. Plazos de entrega</h2>
      <p>
        El tiempo estimado de entrega es de <strong>10 a 15 días hábiles</strong> por vía aérea
        una vez comprado el producto. Estos plazos son estimados y pueden variar por causas
        ajenas a nosotros (retrasos de SHEIN, del courier, aduanas o fuerza mayor). Haremos todo
        lo posible por mantenerte informado.
      </p>

      <h2>7. Responsabilidades del cliente</h2>
      <ul>
        <li>Proporcionar datos de entrega correctos y completos (nombre, cédula, teléfono, dirección). No nos hacemos responsables por entregas fallidas debido a datos erróneos.</li>
        <li>Revisar bien la talla, el color y las características del producto antes de confirmar; los encargos se compran según la información que nos indiques.</li>
        <li>Realizar los pagos por los canales oficiales que te indicamos y conservar tus comprobantes.</li>
      </ul>

      <h2>8. Cambios, devoluciones y garantías</h2>
      <p>
        Las condiciones de cambio y devolución se detallan en nuestra{' '}
        <a href="/envios-devoluciones">Política de Envíos y Devoluciones</a>. Por tratarse de un
        servicio de compra por encargo, las devoluciones tienen condiciones específicas que te
        pedimos revisar.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        Actuamos con diligencia como intermediarios, pero no somos responsables por defectos de
        fabricación, diferencias de talla o color propias del producto de SHEIN, ni por daños o
        pérdidas ocurridos durante el transporte más allá de la cobertura del seguro de carga
        aplicable. Nuestra responsabilidad máxima se limita al monto que nos hayas pagado por el
        pedido correspondiente.
      </p>

      <h2>10. Cancelaciones</h2>
      <p>
        Puedes cancelar un pedido siempre que aún no hayamos realizado la compra del producto.
        Una vez comprado, la cancelación queda sujeta a las condiciones de la Política de Envíos
        y Devoluciones, ya que el artículo ya fue adquirido a tu nombre.
      </p>

      <h2>11. Propiedad intelectual</h2>
      <p>
        El contenido de este sitio (logotipo, textos y diseño propios) pertenece a Pedidos SHEIN
        Venezuela. Las marcas, imágenes y descripciones de productos pertenecen a sus respectivos
        titulares.
      </p>

      <h2>12. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos en cualquier momento. La versión vigente será siempre
        la publicada en esta página. El uso continuado del servicio implica la aceptación de los
        cambios.
      </p>

      <h2>13. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier
        controversia se procurará resolver de buena fe y, en su defecto, ante los tribunales
        competentes.
      </p>

      <h2>14. Contacto</h2>
      <p>
        Para cualquier duda sobre estos Términos, escríbenos a{' '}
        <a href="mailto:info@pedidosshein.com">info@pedidosshein.com</a> o por{' '}
        <a href="https://wa.me/584121183253">WhatsApp</a>.
      </p>
    </LegalLayout>
  );
}
