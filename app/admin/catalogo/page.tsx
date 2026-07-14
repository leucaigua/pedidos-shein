'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import type { CatalogoRow } from '@/types';
import {
  Plus, Loader2, Package, Trash2, Eye, EyeOff, X, Save, Search, Download,
  RefreshCw, Star, Link2, PlugZap,
} from 'lucide-react';

const CATEGORIAS = ['Ropa', 'Zapatos', 'Accesorios', 'Belleza', 'Hogar', 'Tecnología', 'Otro'];

const PRODUCTO_VACIO = {
  nombre: '', imagen_url: '', precio_usd: '', categoria: 'Ropa', peso_estimado_kg: '0.3', url_shein: '',
};

interface ResultadoBusqueda {
  externalId: string;
  titulo: string;
  precioBaseUsd: number;
  precioVentaUsd: number;
  imagenes: string[];
  sourceUrl: string;
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function AdminCatalogoPage() {
  const [productos, setProductos] = useState<CatalogoRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(PRODUCTO_VACIO);

  // AliExpress
  const [panelAE, setPanelAE] = useState(false);
  const [query, setQuery] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [catImport, setCatImport] = useState('Ropa');
  const [importando, setImportando] = useState<Record<string, boolean>>({});
  const [aeError, setAeError] = useState('');
  const [code, setCode] = useState('');
  const [sincronizando, setSincronizando] = useState<Record<string, boolean>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch('/api/catalogo?todos=true&porPagina=50', { headers });
    const data = await res.json();
    setProductos(data.productos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function agregarProducto() {
    if (!form.nombre || !form.precio_usd) return;
    const headers = await authHeaders();
    if (!headers) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/catalogo', {
        method: 'POST', headers,
        body: JSON.stringify({
          nombre: form.nombre, imagen_url: form.imagen_url, precio_usd: parseFloat(form.precio_usd),
          categoria: form.categoria, peso_estimado_kg: parseFloat(form.peso_estimado_kg),
          url_shein: form.url_shein, source: 'manual', activo: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProductos((prev) => [data.producto, ...prev]);
        setModalAbierto(false);
        setForm(PRODUCTO_VACIO);
      }
    } finally { setGuardando(false); }
  }

  async function buscarAE() {
    if (!query.trim()) return;
    const headers = await authHeaders();
    if (!headers) return;
    setBuscando(true); setAeError(''); setResultados([]);
    try {
      const res = await fetch('/api/catalogo/buscar', {
        method: 'POST', headers, body: JSON.stringify({ query: query.trim(), porPagina: 20 }),
      });
      const data = await res.json();
      if (!res.ok) { setAeError(data.error || 'Error al buscar'); return; }
      setResultados(data.productos ?? []);
    } finally { setBuscando(false); }
  }

  async function importar(r: ResultadoBusqueda) {
    const headers = await authHeaders();
    if (!headers) return;
    setImportando((s) => ({ ...s, [r.externalId]: true }));
    try {
      const res = await fetch('/api/catalogo/importar', {
        method: 'POST', headers, body: JSON.stringify({ externalId: r.externalId, categoria: catImport, activo: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setProductos((prev) => [data.producto, ...prev.filter((p) => p.id !== data.producto.id)]);
      } else {
        setAeError(data.error || 'No se pudo importar');
      }
    } finally {
      setImportando((s) => ({ ...s, [r.externalId]: false }));
    }
  }

  async function conectarAE() {
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch('/api/catalogo/aliexpress-auth', { headers });
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank', 'noopener');
  }

  async function guardarCode() {
    if (!code.trim()) return;
    const headers = await authHeaders();
    if (!headers) return;
    setAeError('');
    const res = await fetch('/api/catalogo/aliexpress-auth', {
      method: 'POST', headers, body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    if (data.ok) { setCode(''); alert('✅ AliExpress conectado.'); }
    else setAeError(data.error || 'No se pudo conectar');
  }

  async function sincronizar(p: CatalogoRow) {
    const headers = await authHeaders();
    if (!headers) return;
    setSincronizando((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await fetch('/api/catalogo/sincronizar', {
        method: 'POST', headers, body: JSON.stringify({ ids: [p.id] }),
      });
      const data = await res.json();
      if (data.ok) await cargar();
    } finally { setSincronizando((s) => ({ ...s, [p.id]: false })); }
  }

  async function patch(id: string, updates: Record<string, unknown>) {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch('/api/catalogo', { method: 'PATCH', headers, body: JSON.stringify({ id, ...updates }) });
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    const headers = await authHeaders();
    if (!headers) return;
    await fetch('/api/catalogo', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Catálogo</h1>
          <p className="text-sm text-gray-500 mt-0.5">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPanelAE((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${panelAE ? 'bg-[#1A1A1A] text-white' : 'border border-[#1A1A1A] text-[#1A1A1A] hover:bg-gray-50'}`}>
            <Search className="w-4 h-4" /> AliExpress
          </button>
          <button onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors">
            <Plus className="w-4 h-4" /> Manual
          </button>
        </div>
      </div>

      {/* Panel AliExpress */}
      {panelAE && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-200">
            <PlugZap className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 mr-auto">¿Error de token? Reconecta AliExpress.</span>
            <button onClick={conectarAE} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-white">1. Autorizar</button>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="2. Pega el code"
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white w-44" />
            <button onClick={guardarCode} className="text-sm bg-[#1A1A1A] text-white rounded-lg px-3 py-1.5 hover:bg-[#3D3D3D]">Conectar</button>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarAE()}
                placeholder="Buscar en AliExpress (ej. vestido, sandalias...)"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30" />
            </div>
            <select value={catImport} onChange={(e) => setCatImport(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button onClick={buscarAE} disabled={buscando}
              className="bg-[#1A1A1A] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#3D3D3D] disabled:opacity-60 flex items-center gap-2">
              {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
            </button>
          </div>
          {aeError && <p className="text-sm text-red-500 mb-3">{aeError}</p>}
          <p className="text-xs text-gray-400 mb-3">Se importa con la categoría seleccionada. El precio de venta se calcula con tu markup automáticamente.</p>

          {resultados.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {resultados.map((r) => (
                <div key={r.externalId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="relative h-32 bg-gray-50">
                    {r.imagenes[0] ? <Image src={r.imagenes[0]} alt={r.titulo} fill className="object-cover" unoptimized />
                      : <div className="flex items-center justify-center h-full"><Package className="w-6 h-6 text-gray-300" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-700 line-clamp-2 mb-1 min-h-[2rem]">{r.titulo}</p>
                    <p className="text-xs text-gray-400">Base {formatUSD(r.precioBaseUsd)}</p>
                    <p className="text-sm font-bold text-[#1A1A1A] mb-2">Venta {formatUSD(r.precioVentaUsd)}</p>
                    <button onClick={() => importar(r)} disabled={importando[r.externalId]}
                      className="w-full flex items-center justify-center gap-1 text-xs bg-[#1A1A1A] text-white py-1.5 rounded-lg hover:bg-[#3D3D3D] disabled:opacity-60">
                      {importando[r.externalId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Importar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" /></div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Package className="w-12 h-12 mb-3" />
          <p className="font-medium">Catálogo vacío</p>
          <p className="text-sm mt-1">Importa de AliExpress o agrega manualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {productos.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${p.activo ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <div className="relative h-40 bg-gray-50">
                {p.imagen_url ? <Image src={p.imagen_url} alt={p.nombre} fill className="object-cover" unoptimized />
                  : <div className="flex items-center justify-center h-full"><Package className="w-8 h-8 text-gray-300" /></div>}
                <div className="absolute top-2 left-2 flex gap-1">
                  {p.source && <span className="text-[10px] bg-white/90 text-gray-600 px-1.5 py-0.5 rounded-full">{p.source}</span>}
                  {p.destacado && <span className="text-[10px] bg-[#FFD700] text-[#1A1A1A] px-1.5 py-0.5 rounded-full font-semibold">★</span>}
                </div>
                {p.disponibilidad === 'agotado' && (
                  <span className="absolute top-2 right-2 text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded-full">Agotado</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-[#212121] line-clamp-2 mb-1">{p.nombre}</p>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#1A1A1A] font-bold">{formatUSD(p.precio_usd)}
                    {p.precio_base_usd != null && <span className="text-[11px] text-gray-400 font-normal"> (base {formatUSD(p.precio_base_usd)})</span>}
                  </p>
                  {p.categoria && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{p.categoria}</span>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => patch(p.id, { activo: !p.activo })}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${p.activo ? 'border-gray-200 text-gray-500 hover:text-[#1A1A1A]' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                    {p.activo ? <><EyeOff className="w-3 h-3" /> Ocultar</> : <><Eye className="w-3 h-3" /> Activar</>}
                  </button>
                  <button onClick={() => patch(p.id, { destacado: !p.destacado })} title="Destacado"
                    className={`p-1.5 rounded-lg border transition-colors ${p.destacado ? 'border-[#FFD700] text-[#FFD700]' : 'border-gray-200 text-gray-300 hover:text-[#1A1A1A]'}`}>
                    <Star className="w-4 h-4" />
                  </button>
                  {p.source === 'aliexpress' && p.external_id && (
                    <button onClick={() => sincronizar(p)} disabled={sincronizando[p.id]} title="Sincronizar precio/stock"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#1A1A1A]">
                      {sincronizando[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => eliminar(p.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {(p.source_url || p.url_shein) && (
                  <a href={p.source_url || p.url_shein} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#1A1A1A] mt-2">
                    <Link2 className="w-3 h-3" /> Ver original
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar manual */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-display font-bold text-[#1A1A1A]">Agregar producto manual</h2>
              <button onClick={() => setModalAbierto(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Campo label="Nombre *"><input type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Vestido floral" className={inputCls} /></Campo>
              <Campo label="URL de imagen"><input type="url" value={form.imagen_url} onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))} placeholder="https://..." className={inputCls} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Precio venta USD *"><input type="number" step="0.01" min="0" value={form.precio_usd} onChange={(e) => setForm((f) => ({ ...f, precio_usd: e.target.value }))} placeholder="0.00" className={inputCls} /></Campo>
                <Campo label="Peso (kg)"><input type="number" step="0.1" min="0.1" value={form.peso_estimado_kg} onChange={(e) => setForm((f) => ({ ...f, peso_estimado_kg: e.target.value }))} className={inputCls} /></Campo>
              </div>
              <Campo label="Categoría">
                <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className={inputCls}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Link del producto"><input type="url" value={form.url_shein} onChange={(e) => setForm((f) => ({ ...f, url_shein: e.target.value }))} placeholder="https://..." className={inputCls} /></Campo>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModalAbierto(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={agregarProducto} disabled={guardando || !form.nombre || !form.precio_usd}
                className="flex-1 bg-[#1A1A1A] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] disabled:opacity-60 flex items-center justify-center gap-2">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {guardando ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
