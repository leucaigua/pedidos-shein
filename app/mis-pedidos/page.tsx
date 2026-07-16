'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { estadoLabel, estadoEmoji, estadoColor } from '@/lib/utils';
import { formatUSD, calcularAbono, calcularRestante, LONGITUD_CODIGO_PEDIDO } from '@/lib/calculations';
import type { EstadoPedido, EstadoPago } from '@/types';
import { Search, Loader2, Package, AlertCircle, CheckCircle, Truck, ExternalLink } from 'lucide-react';

const PASOS: { estado: EstadoPedido; label: string }[] = [
  { estado: 'pendiente_pago', label: 'Pendiente de pago' },
  { estado: 'pago_confirmado', label: 'Pago confirmado' },
  { estado: 'comprando', label: 'Comprando en SHEIN' },
  { estado: 'en_transito', label: 'En tránsito' },
  { estado: 'entregado', label: 'Entregado' },
];

interface PedidoResumen {
  codigo: string;
  estado: EstadoPedido;
  estado_pago?: EstadoPago | null;
  created_at: string;
  cliente_nombre: string;
  total: number;
  items: { nombre: string }[];
  tracking_numero?: string | null;
  tracking_url?: string | null;
}

function MisPedidosContent() {
  const params = useSearchParams();
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '');
  const [buscando, setBuscando] = useState(false);
  const [pedido, setPedido] = useState<PedidoResumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const c = params.get('codigo');
    if (c) {
      setCodigo(c);
      buscarPedido(c);
    }
    // Solo al cambiar los params de la URL; buscarPedido es estable en la práctica.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function buscarPedido(cod?: string) {
    const c = (cod ?? codigo).trim().toUpperCase();
    if (!c) {
      setError('Ingresa tu número de orden');
      return;
    }
    if (c.length !== LONGITUD_CODIGO_PEDIDO) {
      setError(`El número de orden debe tener ${LONGITUD_CODIGO_PEDIDO} caracteres.`);
      return;
    }
    setError('');
    setBuscando(true);
    try {
      const res = await fetch(`/api/pedidos?codigo=${c}`);
      const data = await res.json();
      if (!data.ok || !data.pedido) {
        setError('Pedido no encontrado. Verifica el número de orden.');
        setPedido(null);
      } else {
        setPedido(data.pedido);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setBuscando(false);
    }
  }

  // El código solo es válido cuando tiene la longitud exacta de un código real.
  const codigoValido = codigo.trim().length === LONGITUD_CODIGO_PEDIDO;

  const pasoActual = pedido
    ? PASOS.findIndex((p) => p.estado === pedido.estado)
    : -1;
  // Cuando el pedido está entregado, es el estado final: el último paso
  // ("Entregado") debe verse completado, no como paso pendiente/actual.
  const entregado = pedido?.estado === 'entregado';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2">
          Seguimiento de pedido
        </h1>
        <p className="text-gray-500 mb-8">
          Ingresa tu número de orden para ver el estado de tu pedido.
        </p>

        {/* Buscador */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <label className="block font-semibold text-[#1A1A1A] mb-2 text-sm">
            Número de orden
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="PS-20240528-A7K2P9Q"
              maxLength={LONGITUD_CODIGO_PEDIDO}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && codigoValido && buscarPedido()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] uppercase"
            />
            <button
              onClick={() => buscarPedido()}
              disabled={buscando || !codigoValido}
              className="bg-[#1A1A1A] text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-[#3D3D3D] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {buscando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}
          {!error && codigo.trim().length > 0 && !codigoValido && (
            <p className="text-gray-400 text-xs mt-2">
              {codigo.trim().length}/{LONGITUD_CODIGO_PEDIDO} caracteres
            </p>
          )}
        </div>

        {/* Resultado */}
        {pedido && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Número de orden</p>
                <p className="text-2xl font-display font-bold text-[#1A1A1A]">{pedido.codigo}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(pedido.created_at).toLocaleDateString('es-VE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${estadoColor(pedido.estado)}`}>
                {estadoEmoji(pedido.estado)} {estadoLabel(pedido.estado)}
              </span>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Estado del pedido</h3>
              <div className="space-y-3">
                {PASOS.map((paso, idx) => {
                  const completado = idx < pasoActual || (entregado && idx === pasoActual);
                  const actual = idx === pasoActual && !entregado;
                  const pendiente = idx > pasoActual;
                  return (
                    <div key={paso.estado} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                          completado
                            ? 'bg-green-500 text-white'
                            : actual
                            ? 'bg-[#1A1A1A] text-white ring-4 ring-[#1A1A1A]/20'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {completado ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          actual
                            ? 'font-semibold text-[#1A1A1A]'
                            : completado
                            ? 'text-green-600 line-through decoration-green-300'
                            : pendiente
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {paso.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seguimiento ZOOM — visible cuando hay guía y el pedido está en tránsito */}
            {pedido.estado === 'en_transito' && (pedido.tracking_numero || pedido.tracking_url) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm font-semibold">Tu pedido va en camino con ZOOM</span>
                </div>
                {pedido.tracking_numero && (
                  <p className="text-sm text-gray-600 mb-2">
                    Número de guía:{' '}
                    <span className="font-mono font-semibold text-[#1A1A1A]">{pedido.tracking_numero}</span>
                  </p>
                )}
                {pedido.tracking_url && (
                  <a
                    href={pedido.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Rastrear mi envío <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Info del pedido */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">{pedido.cliente_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Artículos</span>
                <span className="font-medium">{pedido.items?.length ?? 0} artículo(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total del pedido</span>
                <span className="font-bold text-[#1A1A1A]">{formatUSD(pedido.total)}</span>
              </div>
            </div>

            {/* Estado de pago 60/40 — reflejo del estado que fija el admin */}
            {(() => {
              const estadoPago = pedido.estado_pago ?? 'pendiente';
              const pago60 = estadoPago === 'abono_60' || estadoPago === 'pagado_total';
              const pagoTotal = estadoPago === 'pagado_total';
              return (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Abono 60% */}
                  <div className={`flex justify-between items-center px-4 py-3 ${pago60 ? 'bg-green-50' : 'bg-amber-50'}`}>
                    <div>
                      <p className={`text-sm font-semibold flex items-center gap-1.5 ${pago60 ? 'text-green-700' : 'text-amber-700'}`}>
                        {pago60 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {pago60 ? 'Abonado (60%)' : 'Abono pendiente (60%)'}
                      </p>
                      {!pago60 && <p className="text-xs text-amber-600/80">Abono para procesar tu pedido</p>}
                    </div>
                    <span className={`font-semibold ${pago60 ? 'text-green-700' : 'text-amber-700'}`}>
                      {formatUSD(calcularAbono(pedido.total))}
                    </span>
                  </div>
                  {/* Saldo 40% */}
                  <div className={`flex justify-between items-center px-4 py-3 border-t ${pagoTotal ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div>
                      <p className={`text-sm font-semibold flex items-center gap-1.5 ${pagoTotal ? 'text-green-700' : 'text-amber-700'}`}>
                        {pagoTotal ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {pagoTotal ? 'Saldo pagado (40%)' : 'Pendiente por cancelar (40%)'}
                      </p>
                      {!pagoTotal && <p className="text-xs text-amber-600/80">Se paga al retirar tu pedido</p>}
                    </div>
                    <span className={`font-bold text-lg ${pagoTotal ? 'text-green-700' : 'text-amber-700'}`}>
                      {formatUSD(calcularRestante(pedido.total))}
                    </span>
                  </div>
                  {/* Resumen cuando está todo pagado */}
                  {pagoTotal && (
                    <div className="flex justify-between items-center px-4 py-2.5 bg-green-100/60 border-t border-green-100">
                      <span className="text-sm font-bold text-green-800 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Pagado en su totalidad
                      </span>
                      <span className="font-bold text-green-800">{formatUSD(pedido.total)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {pedido.items && pedido.items.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-3 text-sm">Artículos</h3>
                <ul className="space-y-2">
                  {pedido.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      {item.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function MisPedidosPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </main>
        <Footer />
      </div>
    }>
      <MisPedidosContent />
    </Suspense>
  );
}
