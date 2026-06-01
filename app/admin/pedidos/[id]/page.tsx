'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { estadoLabel, estadoColor, estadoEmoji, whatsappUrl } from '@/lib/utils';
import { formatUSD } from '@/lib/calculations';
import type { Pedido, EstadoPedido } from '@/types';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  ExternalLink,
  Package,
  Save,
  CheckCircle,
} from 'lucide-react';

const ESTADOS_OPCIONES: EstadoPedido[] = [
  'pendiente_pago',
  'pago_confirmado',
  'comprando',
  'en_transito',
  'entregado',
];

export default function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [estadoSel, setEstadoSel] = useState<EstadoPedido>('pendiente_pago');
  const [notaAdmin, setNotaAdmin] = useState('');

  const cargar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const res = await fetch(`/api/admin/pedidos/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (data.pedido) {
      setPedido(data.pedido);
      setEstadoSel(data.pedido.estado);
      setNotaAdmin(data.pedido.nota_admin ?? '');
    }
    setCargando(false);
  }, [id, router]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarCambios() {
    if (!pedido) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ estado: estadoSel, nota_admin: notaAdmin }),
      });
      const data = await res.json();
      if (data.ok) {
        setPedido(data.pedido);
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-6 text-center text-gray-500">
        Pedido no encontrado.{' '}
        <Link href="/admin/pedidos" className="text-[#1A1A1A] underline">
          Volver
        </Link>
      </div>
    );
  }

  const msgWA = `Hola ${pedido.cliente_nombre}! Tu pedido *${pedido.codigo}* está en estado: *${estadoLabel(pedido.estado)}*. Cualquier consulta, estamos a la orden.`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/pedidos"
          className="text-gray-400 hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">
            Pedido {pedido.codigo}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(pedido.created_at).toLocaleDateString('es-VE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium ${estadoColor(pedido.estado)}`}>
          {estadoEmoji(pedido.estado)} {estadoLabel(pedido.estado)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-5">
          {/* Artículos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Artículos del pedido</h2>
            <div className="space-y-4">
              {pedido.items?.map((item, i) => (
                <div key={i} className="flex gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  {item.imagen && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                      <Image
                        src={item.imagen}
                        alt={item.nombre}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#212121] line-clamp-2">{item.nombre}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                      {item.talla && <span>Talla: {item.talla}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                      <span>Cant: {item.cantidad}</span>
                      <span>Peso: {item.peso_kg} kg/u</span>
                    </div>
                    {item.url_shein && (
                      <a
                        href={item.url_shein}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#1A1A1A] hover:underline mt-1"
                      >
                        Ver en SHEIN <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#1A1A1A] text-sm">
                      {formatUSD(item.precio_usd * item.cantidad)}
                    </p>
                    <p className="text-xs text-gray-400">{formatUSD(item.precio_usd)}/u</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desglose */}
            <div className="border-t border-gray-100 pt-4 mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal productos</span>
                <span>{formatUSD(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Envío aéreo ZOOM</span>
                <span>{formatUSD(pedido.costo_envio)}</span>
              </div>
              {pedido.costo_proteccion > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Protección ZOOM</span>
                  <span>{formatUSD(pedido.costo_proteccion)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Comisión del servicio</span>
                <span>{formatUSD(pedido.comision)}</span>
              </div>
              {pedido.descuento > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento {pedido.codigo_cupon ? `(${pedido.codigo_cupon})` : ''}</span>
                  <span>−{formatUSD(pedido.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
                <span className="text-[#1A1A1A]">Total</span>
                <span className="text-[#1A1A1A]">{formatUSD(pedido.total)}</span>
              </div>
              <p className="text-xs text-gray-400">Método de pago: {pedido.metodo_pago}</p>
            </div>
          </div>

          {/* Nota del cliente */}
          {pedido.nota_cliente && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">Nota del cliente</p>
              <p className="text-sm text-gray-700">{pedido.nota_cliente}</p>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-5">
          {/* Datos del cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-3">Cliente</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Nombre</dt>
                <dd className="font-medium">{pedido.cliente_nombre}</dd>
              </div>
              {pedido.cliente_cedula && (
                <div>
                  <dt className="text-xs text-gray-400">Cédula</dt>
                  <dd>{pedido.cliente_cedula}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400">WhatsApp</dt>
                <dd className="font-medium text-[#1A1A1A]">{pedido.cliente_telefono}</dd>
              </div>
              {pedido.cliente_estado && (
                <div>
                  <dt className="text-xs text-gray-400">Estado / ciudad</dt>
                  <dd>{pedido.cliente_estado}</dd>
                </div>
              )}
              {pedido.cliente_direccion && (
                <div>
                  <dt className="text-xs text-gray-400">Dirección</dt>
                  <dd className="text-gray-600 leading-relaxed">{pedido.cliente_direccion}</dd>
                </div>
              )}
            </dl>
            <a
              href={whatsappUrl(pedido.cliente_telefono, msgWA)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir WhatsApp
            </a>
          </div>

          {/* Cambiar estado */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-3">Gestionar pedido</h2>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select
                value={estadoSel}
                onChange={(e) => setEstadoSel(e.target.value as EstadoPedido)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              >
                {ESTADOS_OPCIONES.map((e) => (
                  <option key={e} value={e}>
                    {estadoEmoji(e)} {estadoLabel(e)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nota interna (solo visible para admin)
              </label>
              <textarea
                value={notaAdmin}
                onChange={(e) => setNotaAdmin(e.target.value)}
                rows={3}
                placeholder="Notas de seguimiento, tracking number, observaciones..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] resize-none"
              />
            </div>
            <button
              onClick={guardarCambios}
              disabled={guardando}
              className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {guardando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : guardado ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {guardando ? 'Guardando...' : guardado ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
