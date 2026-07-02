import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Camera, Calculator, CheckCircle, Truck, ShieldCheck, MessageCircle, Star, Sparkles } from 'lucide-react';

const COMO_FUNCIONA = [
  { icon: Camera, paso: '1', titulo: 'Sube tus capturas', desc: 'Toma una captura de cada producto en SHEIN con el precio visible y súbelas — una o varias a la vez. Cada captura es un artículo de tu pedido.' },
  { icon: Calculator, paso: '2', titulo: 'Calculamos tu precio', desc: 'Extraemos el precio y el peso de cada captura automáticamente y sumamos el envío. Especifica la talla (o modelo), y el color.' },
  { icon: CheckCircle, paso: '3', titulo: 'Confirmamos y compramos', desc: 'Agregas todo al carrito, realizas el pago y nosotros compramos los productos por ti. Los recibes en Venezuela.' },
];

const METODOS_PAGO = [
  { nombre: 'Binance Pay', emoji: '🪙' },
  { nombre: 'Zelle', emoji: '💸' },
  { nombre: 'Pago Móvil', emoji: '📱' },
  { nombre: 'Efectivo USD', emoji: '💵' },
];

const TESTIMONIOS = [
  { nombre: 'Valentina M.', ciudad: 'Caracas', texto: 'Me llegaron mis zapatos en solo 2 semanas y exactamente como los vi en SHEIN. Servicio excelente.', estrellas: 5 },
  { nombre: 'Carlos R.', ciudad: 'Maracaibo', texto: 'Ya llevo 3 pedidos y todos perfectos. El precio final es muy justo considerando el envío aéreo.', estrellas: 5 },
  { nombre: 'Daniela L.', ciudad: 'Valencia', texto: 'Me sorprendió lo rápido que llegó. El operador estuvo al pendiente por WhatsApp en todo momento.', estrellas: 5 },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#1A1A1A] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/10 text-white/80 text-xs font-medium px-3 py-1 rounded-full mb-5 uppercase tracking-widest">
            Envío aéreo con ZOOM Casilleros
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-5 leading-tight">
            Trae lo que quieras de SHEIN directo a tus manos en Venezuela
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Compra cualquier producto de SHEIN USA sin tarjeta internacional.
            Nosotros lo compramos por ti y te lo enviamos en días.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pedir" className="bg-white text-[#1A1A1A] font-bold px-8 py-4 rounded-xl text-base hover:bg-gray-100 transition-colors">
              Hacer mi pedido
            </Link>
            <Link href="/catalogo" className="bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors border border-white/20">
              Ver catálogo
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            ✓ Sin tarjeta internacional · ✓ Pago en Bs, Zelle y Binance · ✓ Atención por WhatsApp
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 px-4 bg-white" id="como-funciona">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center text-[#1A1A1A] mb-3">¿Cómo funciona?</h2>
          <p className="text-center text-[#737373] mb-12">Tres pasos y tu pedido está en camino.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMO_FUNCIONA.map(({ icon: Icon, paso, titulo, desc }) => (
              <div key={paso} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-[#F0F0F0] rounded-2xl flex items-center justify-center">
                    <Icon className="w-8 h-8 text-[#1A1A1A]" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-[#1A1A1A] text-white text-sm font-bold rounded-full flex items-center justify-center">
                    {paso}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-lg text-[#1A1A1A] mb-2">{titulo}</h3>
                <p className="text-[#737373] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pedir" className="inline-block bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold px-8 py-3 rounded-xl transition-colors">
              Empezar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Promo 60/40 */}
      <section className="py-14 px-4 bg-[#1A1A1A]">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] p-8 md:p-10 text-center">
            <span className="inline-flex items-center gap-1.5 bg-[#FFD700]/15 text-[#FFD700] text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Reserva fácil
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
              Aparta tu pedido con solo el <span className="text-[#FFD700]">60%</span>
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto mb-8 leading-relaxed">
              No pagues todo de una vez. Abona el <strong className="text-white">60% hoy</strong> para
              procesar tu pedido y cancela el <strong className="text-white">40% restante</strong> cuando
              lo retires. ¡Trae lo que quieres de SHEIN pagando menos hoy!
            </p>
            <div className="flex justify-center gap-4 sm:gap-6">
              <div className="flex-1 max-w-[160px] bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-3xl font-display font-bold text-[#FFD700]">60%</p>
                <p className="text-xs text-gray-400 mt-1">Hoy, para procesar tu pedido</p>
              </div>
              <div className="flex-1 max-w-[160px] bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-3xl font-display font-bold text-white">40%</p>
                <p className="text-xs text-gray-400 mt-1">Al retirar tu pedido</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 px-4 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center text-[#1A1A1A] mb-12">¿Por qué elegirnos?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: Truck, titulo: 'Envío aéreo rápido', desc: 'Tu pedido llega en 10–15 días hábiles por vía aérea desde Miami.' },
              { icon: ShieldCheck, titulo: 'Compra protegida', desc: 'Seguro de carga ZOOM incluido en cada pedido.' },
              { icon: Calculator, titulo: 'Precio transparente', desc: 'Ves el precio final antes de confirmar. Sin costos ocultos.' },
              { icon: MessageCircle, titulo: 'Soporte WhatsApp', desc: 'Te acompañamos durante todo el proceso por WhatsApp.' },
              { icon: CheckCircle, titulo: 'Cualquier producto SHEIN', desc: 'Si está en SHEIN USA, lo podemos traer. Ropa, accesorios, hogar y más.' },
              { icon: Star, titulo: 'Clientes satisfechos', desc: 'Cientos de pedidos exitosos entregados en todo el país.' },
            ].map(({ icon: Icon, titulo, desc }) => (
              <div key={titulo} className="bg-white rounded-2xl p-6 border border-[#E5E5E5]">
                <Icon className="w-7 h-7 text-[#1A1A1A] mb-3" />
                <h3 className="font-display font-semibold text-[#1A1A1A] mb-1 text-sm">{titulo}</h3>
                <p className="text-sm text-[#737373] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Métodos de pago */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-3">Métodos de pago aceptados</h2>
          <p className="text-[#737373] mb-8 text-sm">Paga en el método que más te convenga.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {METODOS_PAGO.map(({ nombre, emoji }) => (
              <div key={nombre} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] font-medium text-sm text-[#1A1A1A]">
                <span className="text-xl">{emoji}</span>
                {nombre}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-16 px-4 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center text-[#1A1A1A] mb-12">Lo que dicen nuestros clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIOS.map(({ nombre, ciudad, texto, estrellas }) => (
              <div key={nombre} className="bg-white rounded-2xl p-6 border border-[#E5E5E5]">
                <div className="flex mb-3">
                  {Array.from({ length: estrellas }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#1A1A1A] text-[#1A1A1A]" />
                  ))}
                </div>
                <p className="text-[#737373] text-sm leading-relaxed mb-4">"{texto}"</p>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{nombre}</p>
                  <p className="text-xs text-[#737373]">{ciudad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">¿Listo para hacer tu pedido?</h2>
          <p className="text-lg text-gray-400 mb-8">Sube tus capturas y calcula el precio final de tu pedido en segundos.</p>
          <Link href="/pedir" className="inline-block bg-white text-[#1A1A1A] font-bold px-10 py-4 rounded-xl text-base hover:bg-gray-100 transition-colors">
            Hacer mi pedido ahora
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
