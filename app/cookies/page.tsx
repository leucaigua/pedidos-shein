import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Cookies — Pedidos SHEIN Venezuela',
  description:
    'Qué cookies usa Pedidos SHEIN Venezuela y cómo puedes gestionarlas.',
};

export default function CookiesPage() {
  return (
    <LegalLayout
      titulo="Política de Cookies"
      actualizado="13 de julio de 2026"
      intro="Este sitio utiliza cookies y tecnologías similares para funcionar correctamente y para entender cómo se usa. Aquí te explicamos cuáles usamos y cómo puedes controlarlas."
    >
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que un sitio web guarda en tu dispositivo
        cuando lo visitas. Sirven para recordar información (como tu sesión o tu carrito) y para
        medir el uso del sitio.
      </p>

      <h2>2. Tipos de cookies que usamos</h2>

      <h3>Cookies esenciales</h3>
      <p>
        Necesarias para que el sitio funcione. Permiten mantener tu sesión iniciada, recordar los
        productos de tu carrito y garantizar la seguridad. Sin ellas el sitio no funciona
        correctamente, por lo que no requieren consentimiento.
      </p>

      <h3>Cookies de analítica</h3>
      <p>
        Usamos <strong>Google Analytics</strong> y <strong>Google Tag Manager</strong> para
        entender de forma anónima y agregada cómo navegan los visitantes (páginas más vistas,
        origen del tráfico, etc.) y así mejorar el servicio. Estas cookies solo se activan si das
        tu consentimiento.
      </p>

      <h2>3. Cookies de terceros</h2>
      <p>
        Algunas cookies son gestionadas por terceros cuyos servicios integramos:
      </p>
      <table>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Finalidad</th>
            <th>Más información</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Analytics / Tag Manager</td>
            <td>Analítica y medición de uso del sitio</td>
            <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></td>
          </tr>
          <tr>
            <td>Supabase</td>
            <td>Autenticación y sesión de usuario</td>
            <td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></td>
          </tr>
        </tbody>
      </table>

      <h2>4. Cómo gestionar tu consentimiento</h2>
      <p>
        Al entrar por primera vez te mostramos un aviso donde puedes aceptar o rechazar las
        cookies de analítica. Puedes cambiar tu decisión en cualquier momento borrando las
        cookies de este sitio en tu navegador, lo que hará que el aviso vuelva a aparecer.
      </p>

      <h2>5. Cómo controlar las cookies desde tu navegador</h2>
      <p>
        Además, la mayoría de los navegadores te permiten bloquear o eliminar cookies desde su
        configuración. Ten en cuenta que si bloqueas las cookies esenciales, algunas funciones
        del sitio (como iniciar sesión o mantener el carrito) podrían dejar de funcionar.
      </p>
      <ul>
        <li>Chrome: Configuración → Privacidad y seguridad → Cookies</li>
        <li>Safari: Preferencias → Privacidad</li>
        <li>Firefox: Ajustes → Privacidad y seguridad</li>
        <li>Edge: Configuración → Cookies y permisos del sitio</li>
      </ul>

      <h2>6. Más información</h2>
      <p>
        Para saber cómo tratamos tus datos personales, consulta nuestra{' '}
        <a href="/privacidad">Política de Privacidad</a>. Si tienes dudas, escríbenos a{' '}
        <a href="mailto:info@pedidosshein.com">info@pedidosshein.com</a>.
      </p>
    </LegalLayout>
  );
}
