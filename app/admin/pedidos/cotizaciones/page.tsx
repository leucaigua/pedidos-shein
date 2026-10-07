'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, Eye, Loader2, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import { NuevaCotizacionButton } from '@/components/AdminCotizacionControls';
import type { Cotizacion, EstadoCotizacion } from '@/types';

const ESTADOS: { value: EstadoCotizacion; label: string }[] = [
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'no_procesada', label: 'No procesada' },
];

export default function CotizacionesPage() {
  const [rows, setRows] = useState<Cotizacion[]>([]);
  const [archivados, setArchivados] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [accion, setAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró.');
      const params = new URLSearchParams({ q: busqueda, estado, archivado: String(archivados) });
      const res = await fetch(`/api/admin/cotizaciones?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.cotizaciones);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
    finally { setCargando(false); }
  }, [busqueda, estado, archivados]);

  useEffect(() => { const timer = setTimeout(cargar, 300); return () => clearTimeout(timer); }, [cargar]);

  useEffect(() => {
    window.addEventListener('admin-cotizacion-guardada', cargar);
    return () => window.removeEventListener('admin-cotizacion-guardada', cargar);
  }, [cargar]);

  async function actualizar(id: string, body: Record<string, unknown>) {
    setAccion(id);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró.');
      const res = await fetch(`/api/admin/cotizaciones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
    finally { setAccion(null); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/admin/pedidos" className="text-sm text-gray-500 hover:underline">← Pedidos</Link>
      <div className="flex flex-wrap justify-between items-center gap-4 my-6">
        <div><h1 className="text-2xl font-display font-bold">Cotizaciones</h1><p className="text-sm text-gray-500">{rows.length} cotizaciones {archivados ? 'archivadas' : 'activas'}</p></div>
        <div className="flex flex-wrap items-center gap-3"><button onClick={cargar} className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" />Actualizar</button><NuevaCotizacionButton /></div>
      </div>
      <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5">
        {[false, true].map((value) => <button key={String(value)} onClick={() => setArchivados(value)} className={`px-4 py-2 text-sm rounded-lg ${archivados === value ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'}`}>{value ? 'Archivadas' : 'Activas'}</button>)}
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <label className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 flex-1"><Search className="w-4 h-4 text-gray-400" /><input aria-label="Buscar por código o cliente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código o cliente" className="w-full py-2.5 text-sm outline-none" /></label>
        <select aria-label="Filtrar estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"><option value="todos">Todos los estados</option>{ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {cargando ? <Loader2 className="mx-auto animate-spin my-10" /> : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500"><tr>{['CS', 'Fecha', 'Cliente', 'Total', 'Estado', 'Acciones'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-gray-100">
              <td className="px-4 py-3 font-semibold whitespace-nowrap">{row.codigo}</td>
              <td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</td>
              <td className="px-4 py-3">{row.cliente_nombre}</td><td className="px-4 py-3 whitespace-nowrap">{formatUSD(row.total)}</td>
              <td className="px-4 py-3"><select aria-label={`Estado de ${row.codigo}`} value={row.estado} disabled={accion === row.id} onChange={(e) => actualizar(row.id, { estado: e.target.value })} className={`rounded-lg px-2 py-1.5 text-xs border ${row.estado === 'aprobada' ? 'bg-green-50 border-green-200 text-green-800' : row.estado === 'no_procesada' ? 'bg-gray-100 border-gray-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>{ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
              <td className="px-4 py-3"><div className="flex gap-3 items-center"><Link href={`/admin/pedidos/cotizaciones/${row.id}`} title="Ver cotización" className="flex items-center gap-1.5"><Eye className="w-4 h-4" />Ver</Link><button disabled={accion === row.id} onClick={() => actualizar(row.id, { archivado: !row.archivado })} className="flex items-center gap-1.5 text-gray-500 disabled:opacity-50">{row.archivado ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}{row.archivado ? 'Restaurar' : 'Archivar'}</button></div></td>
            </tr>)}{rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-500">No hay cotizaciones {archivados ? 'archivadas' : 'para mostrar'}.</td></tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
