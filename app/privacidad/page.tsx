import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Pedidos SHEIN Venezuela',
  description:
    'Cómo Pedidos SHEIN Venezuela recopila, usa y protege tus datos personales.',
};

export default function PrivacidadPage() {
  return (
    <LegalLayout
      titulo="Política de Privacidad"
      actualizado="13 de julio de 2026"
      intro="En Pedidos SHEIN Venezuela valoramos tu privacidad. Esta política explica qué datos personales recopilamos, con qué fines los usamos, con quién los compartimos y qué derechos tienes sobre ellos."
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos es <strong>Pedidos SHEIN Venezuela</strong>{' '}
        («nosotros»), servicio de compras por encargo con base en Maturín, estado Monagas,
        Venezuela. Puedes contactarnos en cualquier momento a través de:
      </p>
      <ul>
        <li>Correo: <a href="mailto:info@pedidosshein.com">info@pedidosshein.com</a></li>
        <li>WhatsApp: <a href="https://wa.me/584121183253">+58 412 118 3253</a></li>
        <li>Instagram: @shein.maturin</li>
      </ul>

      <h2>2. Datos que recopilamos</h2>
      <p>Recopilamos únicamente los datos necesarios para prestarte el servicio:</p>
      <ul>
        <li><strong>Datos de cuenta:</strong> nombre completo, correo electrónico, número de WhatsApp y contraseña (almacenada de forma cifrada).</li>
        <li><strong>Datos de pedido y entrega:</strong> nombre del destinatario, cédula de identidad, teléfono, estado, dirección de entrega y notas del pedido.</li>
        <li><strong>Datos del producto:</strong> capturas de pantalla, enlaces, tallas, colores y demás detalles de los productos de SHEIN que deseas encargar.</li>
        <li><strong>Datos de pago:</strong> el método de pago elegido y el comprobante que nos envíes (referencia, capturas). No almacenamos datos de tarjetas de crédito.</li>
        <li><strong>Datos de navegación:</strong> información técnica y de uso recopilada mediante cookies y herramientas de analítica (ver nuestra <a href="/cookies">Política de Cookies</a>).</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <p>Usamos tus datos para:</p>
      <ul>
        <li>Cotizar, procesar, comprar, importar y entregar los productos que nos encargas.</li>
        <li>Gestionar tu cuenta y tu historial de pedidos.</li>
        <li>Comunicarnos contigo sobre el estado de tu pedido, principalmente por WhatsApp y correo.</li>
        <li>Verificar pagos y gestionar el abono del 60% y el saldo restante del 40%.</li>
        <li>Enviarte comunicaciones comerciales o el boletín, solo si te suscribes voluntariamente (puedes darte de baja cuando quieras).</li>
        <li>Prevenir fraudes, cumplir obligaciones legales y mejorar nuestro servicio.</li>
      </ul>

      <h2>4. Base legal</h2>
      <p>
        Tratamos tus datos con base en la ejecución del servicio que solicitas, en tu
        consentimiento (para el boletín y las cookies no esenciales) y en el cumplimiento de
        obligaciones legales aplicables. En Venezuela, tu privacidad está amparada por el
        artículo 60 de la Constitución.
      </p>

      <h2>5. Con quién compartimos tus datos</h2>
      <p>
        No vendemos tus datos personales. Los compartimos únicamente con proveedores que hacen
        posible el servicio, y solo en la medida necesaria:
      </p>
      <ul>
        <li><strong>Empresas de casillero y courier</strong> (por ejemplo, ZOOM Casilleros) para importar y entregar tu pedido.</li>
        <li><strong>Proveedores tecnológicos</strong> de alojamiento, base de datos y autenticación (Supabase) y de analítica (Google).</li>
        <li><strong>SHEIN y sus vendedores</strong>, en cuanto compramos los productos que nos encargas por los canales oficiales.</li>
        <li><strong>Autoridades competentes</strong> cuando la ley lo exija.</li>
      </ul>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Debido a la naturaleza del servicio (compra e importación desde el exterior), algunos
        datos pueden procesarse en servidores ubicados fuera de Venezuela. Adoptamos medidas
        razonables para que dichos tratamientos cuenten con garantías adecuadas.
      </p>

      <h2>7. Conservación</h2>
      <p>
        Conservamos tus datos mientras mantengas una cuenta activa y durante el tiempo necesario
        para cumplir con obligaciones legales, contables y de atención de reclamos. Cuando ya no
        sean necesarios, los eliminamos o anonimizamos.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, como
        cifrado de contraseñas, control de acceso y conexiones seguras. Ningún sistema es 100%
        infalible, pero trabajamos para mantener tu información resguardada.
      </p>

      <h2>9. Tus derechos</h2>
      <p>
        Puedes solicitar en cualquier momento el acceso, la rectificación, la actualización o la
        eliminación de tus datos, así como oponerte a su tratamiento o retirar tu consentimiento.
        Para ejercer estos derechos, escríbenos a{' '}
        <a href="mailto:info@pedidosshein.com">info@pedidosshein.com</a>. Responderemos en un
        plazo razonable.
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        Nuestro servicio está dirigido a personas mayores de edad. Si eres menor, debes contar
        con la autorización de tu representante legal para usarlo.
      </p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa.
        Publicaremos siempre la versión vigente en esta página con su fecha de actualización.
      </p>
    </LegalLayout>
  );
}
