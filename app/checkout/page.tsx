'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { useAuth } from '@/components/AuthContext';
import { calcularDesgloseCarrito, formatUSD } from '@/lib/calculations';
import type { ConfigApp } from '@/types';
import { whatsappUrl } from '@/lib/utils';
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageCircle,
  Copy,
  Check,
  Tag,
  XCircle,
} from 'lucide-react';

const CONFIG_DEFAULT: ConfigApp = {
  comision_pct: 10,
  proteccion_activa: true,
  tasa_bsd: 40,
  whatsapp: '',
  mensaje_checkout: 'Gracias por tu pedido. Nos comunicaremos contigo en menos de 24 horas.',
  metodos_pago: [
    { id: 'binance', nombre: 'Binance Pay (USDT)', activo: true, instrucciones: 'Envía el pago a nuestro ID de Binance Pay.', datos_cuenta: '' },
    { id: 'zelle', nombre: 'Zelle', activo: true, instrucciones: 'Envía el pago por Zelle al correo indicado.', datos_cuenta: '' },
    { id: 'pago_movil', nombre: 'Pago Móvil / Transferencia Bs', activo: true, instrucciones: 'Realiza el pago móvil a los datos indicados.', datos_cuenta: '' },
  ],
};

type EtapaCheckout = 'formulario' | 'confirmado';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const { user, perfil } = useAuth();
  const [config, setConfig] = useState<ConfigApp>(CONFIG_DEFAULT);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [etapa, setEtapa] = useState<EtapaCheckout>('formulario');
  const [codigoPedido, setCodigoPedido] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    estado_vzla: '',
    direccion: '',
    nota: '',
  });

  // Pre-llenar nombre y teléfono desde el perfil si el usuario está logueado
  useEffect(() => {
    if (perfil && !prefilled) {
      setForm((f) => ({
        ...f,
        nombre: f.nombre || perfil.nombre || '',
        telefono: f.telefono || perfil.telefono || '',
      }));
      setPrefilled(true);
    }
  }, [perfil, prefilled]);

  // Cupón de descuento
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; pct: number } | null>(null);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [cuponError, setCuponError] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) setConfig(d.config);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0 && etapa === 'formulario') {
      router.push('/carrito');
    }
  }, [items, etapa, router]);

  const desglose = calcularDesgloseCarrito(
    items,
    config.comision_pct,
    config.proteccion_activa
  );

  // Descuento por cupón (10% sobre el total)
  const descuento = cuponAplicado ? desglose.total * (cuponAplicado.pct / 100) : 0;
  const totalFinal = desglose.total - descuento;

  const metodosActivos = config.metodos_pago.filter((m) => m.activo);
  const metodoPagoObj = metodosActivos.find((m) => m.id === metodoPago);

  async function validarCupon() {
    const codigo = cuponInput.trim().toUpperCase();
    if (!codigo) return;
    setValidandoCupon(true);
    setCuponError('');
    try {
      const res = await fetch('/api/cupones/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCuponError(data.error ?? 'Cupón no válido');
        setCuponAplicado(null);
        return;
      }
      setCuponAplicado({ codigo: data.codigo, pct: data.descuento_pct });
      setCuponError('');
    } catch {
      setCuponError('Error al validar. Intenta de nuevo.');
    } finally {
      setValidandoCupon(false);
    }
  }

  function quitarCupon() {
    setCuponAplicado(null);
    setCuponInput('');
    setCuponError('');
  }

  async function confirmarPedido() {
    const { nombre, telefono, estado_vzla, direccion } = form;
    if (!nombre || !telefono || !estado_vzla || !direccion) {
      setError('Por favor completa todos los campos obligatorios (*)');
      return;
    }
    if (!metodoPago) {
      setError('Selecciona un método de pago');
      return;
    }

    setError('');
    setEnviando(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: form.nombre,
          cliente_cedula: form.cedula,
          cliente_telefono: form.telefono,
          cliente_estado: form.estado_vzla,
          cliente_direccion: form.direccion,
          nota_cliente: form.nota,
          metodo_pago: metodoPago,
          subtotal: desglose.producto,
          costo_envio: desglose.envio,
          costo_proteccion: desglose.proteccion,
          comision: desglose.comision,
          total: totalFinal,
          codigo_cupon: cuponAplicado?.codigo ?? null,
          descuento,
          items,
          user_id: user?.id ?? null,
          cliente_email: (perfil?.email ?? user?.email ?? '').toLowerCase() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Error al procesar el pedido');
        return;
      }
      setCodigoPedido(data.codigo);
      clearCart();
      setEtapa('confirmado');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(codigoPedido);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const mensajeWhatsApp = `Hola! Acabo de confirmar mi pedido *${codigoPedido}* por ${formatUSD(totalFinal)}. Método de pago: ${metodoPagoObj?.nombre ?? metodoPago}. Voy a enviar mi comprobante de pago.`;

  if (etapa === 'confirmado') {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-[#1A1A1A] mb-2">
              ¡Pedido confirmado!
            </h1>
            <p className="text-gray-500 mb-1 text-sm">{config.mensaje_checkout}</p>

            <div className="bg-gray-50 rounded-xl p-4 my-6">
              <p className="text-xs text-gray-400 mb-1">Número de orden</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold font-display text-[#1A1A1A]">
                  {codigoPedido}
                </span>
                <button
                  onClick={copiarCodigo}
                  className="text-gray-400 hover:text-[#1A1A1A] transition-colors"
                >
                  {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Guarda este número para rastrear tu pedido
              </p>
            </div>

            {metodoPagoObj && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
                <p className="font-semibold text-[#1A1A1A] text-sm mb-1">
                  Instrucciones de pago — {metodoPagoObj.nombre}
                </p>
                <p className="text-sm text-gray-600 mb-1">{metodoPagoObj.instrucciones}</p>
                {metodoPagoObj.datos_cuenta && (
                  <p className="text-sm font-mono bg-white rounded-lg px-3 py-2 mt-2 border border-blue-100">
                    {metodoPagoObj.datos_cuenta}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2 font-bold">
                  Total a pagar: {formatUSD(totalFinal)}
                </p>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-6">
              Una vez confirmado tu pago, nos comunicaremos contigo por WhatsApp en menos de 24 horas.
            </p>

            {config.whatsapp && (
              <a
                href={whatsappUrl(config.whatsapp, mensajeWhatsApp)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar confirmación por WhatsApp
              </a>
            )}

            <a
              href={`/mis-pedidos?codigo=${codigoPedido}`}
              className="w-full border border-[#1A1A1A] text-[#1A1A1A] font-semibold py-3 rounded-xl transition-colors flex items-center justify-center hover:bg-[#1A1A1A] hover:text-white"
            >
              Rastrear mi pedido
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ESTADOS_VZL = [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
    'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
    'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
    'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia',
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2">Checkout</h1>
        <p className="text-gray-500 mb-8">Completa tus datos para finalizar el pedido.</p>

        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-[#1A1A1A]/5 rounded-2xl p-4 border border-[#1A1A1A]/10">
            <p className="text-sm font-medium text-[#1A1A1A] mb-1">
              {items.length} artículo{items.length !== 1 ? 's' : ''} en tu pedido
            </p>
            {descuento > 0 ? (
              <p className="text-2xl font-display font-bold text-[#1A1A1A]">
                Total: {formatUSD(totalFinal)}
                <span className="text-base text-gray-400 line-through ml-2 font-normal">
                  {formatUSD(desglose.total)}
                </span>
              </p>
            ) : (
              <p className="text-2xl font-display font-bold text-[#1A1A1A]">
                Total: {formatUSD(desglose.total)}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
              <span>Productos: {formatUSD(desglose.producto)}</span>
              <span>Flete: {formatUSD(desglose.envio)}</span>
              <span>Seguro: {formatUSD(desglose.proteccion)}</span>
              <span>Comisión: {formatUSD(desglose.comision)}</span>
              {descuento > 0 && (
                <span className="text-green-600 font-medium">
                  Descuento ({cuponAplicado!.pct}%): −{formatUSD(descuento)}
                </span>
              )}
            </div>
          </div>

          {/* Cupón de descuento */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4" /> ¿Tienes un código de descuento?
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Ingresa tu cupón de bienvenida para obtener tu descuento.
            </p>

            {cuponAplicado ? (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-mono font-bold text-green-700">{cuponAplicado.codigo}</span>
                  <span className="text-green-600">−{cuponAplicado.pct}% aplicado</span>
                </span>
                <button onClick={quitarCupon} className="text-gray-400 hover:text-red-500 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cuponInput}
                    onChange={(e) => setCuponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), validarCupon())}
                    placeholder="BIENVENIDO-XXXXX"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                  <button
                    onClick={validarCupon}
                    disabled={validandoCupon || !cuponInput.trim()}
                    className="bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3D3D3D] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {validandoCupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                  </button>
                </div>
                {cuponError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {cuponError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Datos del cliente */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Datos de entrega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Tu nombre completo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cédula</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                  placeholder="V-12345678"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="+58 414 1234567"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado *</label>
                <select
                  value={form.estado_vzla}
                  onChange={(e) => setForm((f) => ({ ...f, estado_vzla: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] bg-white"
                >
                  <option value="">Selecciona...</option>
                  {ESTADOS_VZL.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Dirección de entrega *
                </label>
                <textarea
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  rows={2}
                  placeholder="Urb., calle, casa/apto, referencia..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Nota adicional (tallas, instrucciones especiales)
                </label>
                <textarea
                  value={form.nota}
                  onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                  rows={2}
                  placeholder="Ej: Para las blusas tomar talla M. El paquete déjalo con el portero..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Método de pago</h2>
            <div className="space-y-3">
              {metodosActivos.map((metodo) => (
                <label
                  key={metodo.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    metodoPago === metodo.id
                      ? 'border-[#1A1A1A] bg-[#1A1A1A]/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo_pago"
                    value={metodo.id}
                    checked={metodoPago === metodo.id}
                    onChange={() => setMetodoPago(metodo.id)}
                    className="mt-1 accent-[#1A1A1A]"
                  />
                  <div>
                    <p className="font-medium text-sm text-[#212121]">{metodo.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{metodo.instrucciones}</p>
                    {metodoPago === metodo.id && metodo.datos_cuenta && (
                      <p className="text-xs font-mono bg-white border border-gray-100 rounded-lg px-2 py-1 mt-2">
                        {metodo.datos_cuenta}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={confirmarPedido}
            disabled={enviando}
            className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirmar pedido · {formatUSD(totalFinal)}
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Al confirmar, aceptas nuestros términos de servicio. El pago se realiza por transferencia directa.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
