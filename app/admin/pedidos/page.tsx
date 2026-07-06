'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  estadoLabel,
  estadoColor,
  estadoEmoji,
  motivoArchivoLabel,
  motivoArchivoEmoji,
  motivoArchivoColor,
} from '@/lib/utils';
import { formatUSD } from '@/lib/calculations';
import type { Pedido, EstadoPedido, MotivoArchivo } from '@/types';
import {
  Search,
  Loader2,
  Package,
  RefreshCw,
  Eye,
  Filter,
  FileUp,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  CheckCircle,
  Ban,
} from 'lucide-react';

const ESTADOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
  { value: 'pago_confirmado', label: 'Pago confirmado' },
  { value: 'comprando', label: 'Comprando' },
  { value: 'en_transito', label: 'En tránsito' },
  { value: 'entregado', label: 'Entregado' },
];

const MOTIVOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'completado', label: 'Completados' },
  { value: 'no_pago', label: 'No pagó' },
];

type Vista = 'activos' | 'archivados';

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [vista, setVista] = useState<Vista>('activos');
  const [motivoFiltro, setMotivoFiltro] = useState('todos');
  const [accionId, setAccionId] = useState<string | null>(null);

  // Modales
  const [archivar, setArchivar] = useState<Pedido | null>(null);
  const [eliminar, setEliminar] = useState<Pedido | null>(null);

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (vista === 'archivados') {
      params.set('archivado', 'true');
      if (motivoFiltro !== 'todos') params.set('motivo', motivoFiltro);
    } else if (estadoFiltro !== 'todos') {
      params.set('estado', estadoFiltro);
    }
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
  }, [vista, estadoFiltro, motivoFiltro, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargarPedidos, 300);
    return () => clearTimeout(t);
  }, [cargarPedidos]);

  async function patchPedido(id: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    setAccionId(id);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return !!data.ok;
    } catch {
      return false;
    } finally {
      setAccionId(null);
    }
  }

  async function confirmarArchivar(motivo: MotivoArchivo) {
    if (!archivar) return;
    const ok = await patchPedido(archivar.id, { archivado: true, archivado_motivo: motivo });
    setArchivar(null);
    if (ok) cargarPedidos();
  }

  async function restaurar(pedido: Pedido) {
    const ok = await patchPedido(pedido.id, { archivado: false });
    if (ok) cargarPedidos();
  }

  async function confirmarEliminar() {
    if (!eliminar) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setAccionId(eliminar.id);
    try {
      const res = await fetch(`/api/admin/pedidos/${eliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setEliminar(null);
      if (data.ok) cargarPedidos();
      else alert(data.error ?? 'No se pudo eliminar el pedido.');
    } finally {
      setAccionId(null);
    }
  }

  function cambiarVista(v: Vista) {
    setVista(v);
    setBusqueda('');
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
            {vista === 'archivados' ? ' archivado' + (pedidos.length !== 1 ? 's' : '') : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargarPedidos}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <Link
            href="/admin/pedidos/cotizacion"
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileUp className="w-4 h-4" />
            Subir cotización
          </Link>
        </div>
      </div>

      {/* Pestañas Activos / Archivados */}
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => cambiarVista('activos')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'activos' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#1A1A1A]'
          }`}
        >
          <Package className="w-4 h-4" />
          Activos
        </button>
        <button
          onClick={() => cambiarVista('archivados')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            vista === 'archivados' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-[#1A1A1A]'
          }`}
        >
          <Archive className="w-4 h-4" />
          Archivados
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
          {vista === 'activos' ? (
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
          ) : (
            <select
              value={motivoFiltro}
              onChange={(e) => setMotivoFiltro(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          {vista === 'archivados' ? <Archive className="w-12 h-12 mb-3" /> : <Package className="w-12 h-12 mb-3" />}
          <p className="font-medium">
            {vista === 'archivados' ? 'No hay pedidos archivados' : 'No hay pedidos'}
          </p>
          <p className="text-sm mt-1">
            {busqueda || estadoFiltro !== 'todos' || motivoFiltro !== 'todos'
              ? 'Intenta con otros filtros'
              : vista === 'archivados'
              ? 'Los pedidos que archives aparecerán aquí'
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
                    {vista === 'archivados' ? 'Motivo' : 'Estado'}
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
                      {vista === 'archivados' && pedido.archivado_motivo ? (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${motivoArchivoColor(
                            pedido.archivado_motivo
                          )}`}
                        >
                          {motivoArchivoEmoji(pedido.archivado_motivo)}{' '}
                          {motivoArchivoLabel(pedido.archivado_motivo)}
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor(
                            pedido.estado as EstadoPedido
                          )}`}
                        >
                          {estadoEmoji(pedido.estado as EstadoPedido)}{' '}
                          {estadoLabel(pedido.estado as EstadoPedido)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/pedidos/${pedido.id}`}
                          className="flex items-center gap-1 text-[#1A1A1A] hover:underline text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                        {vista === 'activos' ? (
                          <button
                            onClick={() => setArchivar(pedido)}
                            disabled={accionId === pedido.id}
                            className="flex items-center gap-1 text-gray-400 hover:text-[#1A1A1A] text-xs font-medium transition-colors disabled:opacity-50"
                            title="Archivar pedido"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archivar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => restaurar(pedido)}
                              disabled={accionId === pedido.id}
                              className="flex items-center gap-1 text-gray-400 hover:text-[#1A1A1A] text-xs font-medium transition-colors disabled:opacity-50"
                              title="Restaurar a activos"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restaurar
                            </button>
                            <button
                              onClick={() => setEliminar(pedido)}
                              disabled={accionId === pedido.id}
                              className="flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="p-4">
                <Link href={`/admin/pedidos/${pedido.id}`} className="block hover:opacity-80 transition-opacity">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-[#1A1A1A] font-bold text-sm">
                      {pedido.codigo}
                    </span>
                    {vista === 'archivados' && pedido.archivado_motivo ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${motivoArchivoColor(
                          pedido.archivado_motivo
                        )}`}
                      >
                        {motivoArchivoEmoji(pedido.archivado_motivo)}{' '}
                        {motivoArchivoLabel(pedido.archivado_motivo)}
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor(
                          pedido.estado as EstadoPedido
                        )}`}
                      >
                        {estadoEmoji(pedido.estado as EstadoPedido)}{' '}
                        {estadoLabel(pedido.estado as EstadoPedido)}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-[#212121]">{pedido.cliente_nombre}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-400">{pedido.cliente_telefono}</p>
                    <p className="font-bold text-[#1A1A1A] text-sm">{formatUSD(pedido.total)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  {vista === 'activos' ? (
                    <button
                      onClick={() => setArchivar(pedido)}
                      disabled={accionId === pedido.id}
                      className="flex-1 flex items-center justify-center gap-1.5 text-gray-600 border border-gray-200 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archivar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => restaurar(pedido)}
                        disabled={accionId === pedido.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-gray-600 border border-gray-200 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => setEliminar(pedido)}
                        disabled={accionId === pedido.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-red-500 border border-red-200 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: archivar pedido */}
      {archivar && (
        <div
          onClick={() => setArchivar(null)}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-display font-bold text-lg text-[#1A1A1A]">Archivar pedido</h3>
              <button onClick={() => setArchivar(null)} className="text-gray-400 hover:text-[#1A1A1A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Pedido <span className="font-mono font-semibold text-[#1A1A1A]">{archivar.codigo}</span>. ¿Por qué
              motivo lo archivas?
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => confirmarArchivar('completado')}
                disabled={accionId === archivar.id}
                className="w-full flex items-center gap-3 border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-3.5 text-left transition-colors disabled:opacity-60"
              >
                <span className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </span>
                <span>
                  <span className="block font-semibold text-sm text-[#1A1A1A]">Completado</span>
                  <span className="block text-xs text-gray-500">Pedido finalizado (entregado)</span>
                </span>
              </button>
              <button
                onClick={() => confirmarArchivar('no_pago')}
                disabled={accionId === archivar.id}
                className="w-full flex items-center gap-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl p-3.5 text-left transition-colors disabled:opacity-60"
              >
                <span className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                  <Ban className="w-5 h-5" />
                </span>
                <span>
                  <span className="block font-semibold text-sm text-[#1A1A1A]">No pagó</span>
                  <span className="block text-xs text-gray-500">No se procesó porque el cliente no pagó</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: eliminar pedido */}
      {eliminar && (
        <div
          onClick={() => setEliminar(null)}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="font-display font-bold text-lg text-[#1A1A1A]">Eliminar pedido</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Seguro que deseas eliminar definitivamente el pedido{' '}
              <span className="font-mono font-semibold text-[#1A1A1A]">{eliminar.codigo}</span> de{' '}
              {eliminar.cliente_nombre}? Esta acción no se puede deshacer.
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
                {accionId === eliminar.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
