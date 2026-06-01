'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { estadoLabel, estadoColor, estadoEmoji } from '@/lib/utils';
import { formatUSD } from '@/lib/calculations';
import type { Pedido, EstadoPedido } from '@/types';
import {
  Search,
  Loader2,
  Package,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';

const ESTADOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
  { value: 'pago_confirmado', label: 'Pago confirmado' },
  { value: 'comprando', label: 'Comprando' },
  { value: 'en_transito', label: 'En tránsito' },
  { value: 'entregado', label: 'Entregado' },
];

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (estadoFiltro !== 'todos') params.set('estado', estadoFiltro);
    if (busqueda) params.set('q', busqueda);

    try {
      const res = await fetch(`/api/admin/pedidos?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setPedidos(data.pedidos ?? []);
    } catch {
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargarPedidos, 300);
    return () => clearTimeout(t);
  }, [cargarPedidos]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={cargarPedidos}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código, teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Package className="w-12 h-12 mb-3" />
          <p className="font-medium">No hay pedidos</p>
          <p className="text-sm mt-1">
            {busqueda || estadoFiltro !== 'todos'
              ? 'Intenta con otros filtros'
              : 'Los pedidos de clientes aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Orden
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[#1A1A1A] font-semibold text-xs">
                        {pedido.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(pedido.created_at).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#212121]">{pedido.cliente_nombre}</p>
                      <p className="text-gray-400 text-xs">{pedido.cliente_telefono}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1A1A1A]">
                      {formatUSD(pedido.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor(
                          pedido.estado as EstadoPedido
                        )}`}
                      >
                        {estadoEmoji(pedido.estado as EstadoPedido)}{' '}
                        {estadoLabel(pedido.estado as EstadoPedido)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        className="flex items-center gap-1 text-[#1A1A1A] hover:underline text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {pedidos.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/admin/pedidos/${pedido.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-[#1A1A1A] font-bold text-sm">
                    {pedido.codigo}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor(
                      pedido.estado as EstadoPedido
                    )}`}
                  >
                    {estadoEmoji(pedido.estado as EstadoPedido)}{' '}
                    {estadoLabel(pedido.estado as EstadoPedido)}
                  </span>
                </div>
                <p className="font-medium text-sm text-[#212121]">{pedido.cliente_nombre}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-400">{pedido.cliente_telefono}</p>
                  <p className="font-bold text-[#1A1A1A] text-sm">{formatUSD(pedido.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
