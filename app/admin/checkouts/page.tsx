'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import { whatsappUrl } from '@/lib/utils';
import type { CheckoutAbandonado } from '@/types';
import {
  Search,
  Loader2,
  ShoppingCart,
  RefreshCw,
  Trash2,
  X,
  MessageCircle,
  Mail,
  CheckCircle,
  Clock,
} from 'lucide-react';

type Vista = 'no_recuperados' | 'recuperados';

/** Tiempo relativo en español ("hace 3 h", "hace 2 d"). */
function hace(fecha: string): string {
  const s = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/** Mensaje de recordatorio prellenado para enviar por WhatsApp al cliente. */
function mensajeRecordatorio(c: CheckoutAbandonado): string {
  const nombre = c.cliente_nombre?.split(' ')[0] ?? '';
  const saludo = nombre ? `¡Hola ${nombre}! 👋` : '¡Hola! 👋';
  const total = c.total ? ` de ${formatUSD(c.total)}` : '';
  return (
    `${saludo} Vimos que dejaste tu carrito${total} casi listo en Pedidos SHEIN. ` +
    `Tu carrito está por expirar ⏳ — ¿te ayudo a completarlo? ` +
    `Escríbeme y lo procesamos hoy mismo. 🛍️`
  );
}

export default function AdminCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<CheckoutAbandonado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>('no_recuperados');
  const [eliminar, setEliminar] = useState<CheckoutAbandonado | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    params.set('estado', vista);
    if (busqueda) params.set('q', busqueda);

    try {
      const res = await fetch(`/api/admin/checkouts-abandonados?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setCheckouts(data.checkouts ?? []);
    } catch {
      setCheckouts([]);
    } finally {
      setCargando(false);
    }
  }, [vista, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  async function confirmarEliminar() {
    if (!eliminar) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setAccionId(eliminar.id);
    try {
      const res = await fetch(`/api/admin/checkouts-abandonados/${eliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setEliminar(null);
      if (data.ok) cargar();
      else alert(data.error ?? 'No se pudo eliminar.');
    } finally {
      setAccionId(null);
    }
  }

  function copiarEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopiado(email);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Carritos abandonados</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {checkouts.length} carrito{checkouts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Pestañas */}
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => { setVista('no_recuperados'); setBusqueda(''); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'no_recuperados' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#1A1A1A]'
          }`}
        >
          <Clock className="w-4 h-4" />
          No recuperados
        </button>
        <button
          onClick={() => { setVista('recuperados'); setBusqueda(''); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'recuperados' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#1A1A1A]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Recuperados
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] bg-white"
        />
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      ) : checkouts.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <ShoppingCart className="w-12 h-12 mb-3" />
          <p className="font-medium">
            {vista === 'recuperados' ? 'Aún no hay carritos recuperados' : 'No hay carritos abandonados'}
          </p>
          <p className="text-sm mt-1">
            {busqueda
              ? 'Intenta con otra búsqueda'
              : vista === 'recuperados'
              ? 'Los carritos que terminen en pedido aparecerán aquí'
              : 'Los clientes que dejen el checkout sin confirmar aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Contacto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Carrito</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Actualizado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkouts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#212121]">{c.cliente_nombre || '—'}</p>
                      {c.cliente_estado && <p className="text-gray-400 text-xs">{c.cliente_estado}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.cliente_telefono && <p className="text-gray-600 text-xs">{c.cliente_telefono}</p>}
                      {c.cliente_email && (
                        <button
                          onClick={() => copiarEmail(c.cliente_email!)}
                          className="text-gray-400 text-xs hover:text-[#1A1A1A] transition-colors"
                          title="Copiar email"
                        >
                          {copiado === c.cliente_email ? '¡Copiado!' : c.cliente_email}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.items?.length ?? 0} artículo{(c.items?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1A1A1A]">{formatUSD(c.total)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {vista === 'recuperados' && c.pedido_codigo ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> {c.pedido_codigo}
                        </span>
                      ) : (
                        hace(c.updated_at)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {vista === 'no_recuperados' && c.cliente_telefono && (
                          <a
                            href={whatsappUrl(c.cliente_telefono, mensajeRecordatorio(c))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-medium"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Recordar
                          </a>
                        )}
                        <button
                          onClick={() => setEliminar(c)}
                          disabled={accionId === c.id}
                          className="flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs font-medium transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {checkouts.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm text-[#212121]">{c.cliente_nombre || '—'}</p>
                  <p className="font-bold text-[#1A1A1A] text-sm">{formatUSD(c.total)}</p>
                </div>
                {c.cliente_telefono && <p className="text-xs text-gray-500">{c.cliente_telefono}</p>}
                {c.cliente_email && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {c.cliente_email}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {c.items?.length ?? 0} artículo{(c.items?.length ?? 0) !== 1 ? 's' : ''} ·{' '}
                  {vista === 'recuperados' && c.pedido_codigo ? c.pedido_codigo : hace(c.updated_at)}
                </p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  {vista === 'no_recuperados' && c.cliente_telefono && (
                    <a
                      href={whatsappUrl(c.cliente_telefono, mensajeRecordatorio(c))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-white bg-green-500 rounded-lg py-2 text-xs font-medium"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Recordar
                    </a>
                  )}
                  <button
                    onClick={() => setEliminar(c)}
                    disabled={accionId === c.id}
                    className="flex-1 flex items-center justify-center gap-1.5 text-red-500 border border-red-200 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {eliminar && (
        <div
          onClick={() => setEliminar(null)}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </span>
                <h3 className="font-display font-bold text-lg text-[#1A1A1A]">Eliminar carrito</h3>
              </div>
              <button onClick={() => setEliminar(null)} className="text-gray-400 hover:text-[#1A1A1A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar el carrito abandonado de{' '}
              <span className="font-semibold text-[#1A1A1A]">{eliminar.cliente_nombre || 'este cliente'}</span>? Esta
              acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEliminar(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={accionId === eliminar.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {accionId === eliminar.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
