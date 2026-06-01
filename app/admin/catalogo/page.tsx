'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import type { ProductoCatalogo } from '@/types';
import {
  Plus,
  Loader2,
  Package,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
} from 'lucide-react';

const CATEGORIAS = ['Ropa', 'Zapatos', 'Accesorios', 'Hogar', 'Belleza', 'Otro'];

const PRODUCTO_VACIO = {
  nombre: '',
  imagen_url: '',
  precio_usd: '',
  categoria: 'Ropa',
  peso_estimado_kg: '0.3',
  url_shein: '',
};

export default function AdminCatalogoPage() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(PRODUCTO_VACIO);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Cargar todos incluyendo inactivos para admin
    const res = await fetch('/api/catalogo', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setProductos(data.productos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function agregarProducto() {
    if (!form.nombre || !form.precio_usd) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setGuardando(true);
    try {
      const res = await fetch('/api/catalogo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre,
          imagen_url: form.imagen_url,
          precio_usd: parseFloat(form.precio_usd),
          categoria: form.categoria,
          peso_estimado_kg: parseFloat(form.peso_estimado_kg),
          url_shein: form.url_shein,
          activo: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProductos((prev) => [data.producto, ...prev]);
        setModalAbierto(false);
        setForm(PRODUCTO_VACIO);
      }
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(producto: ProductoCatalogo) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('/api/catalogo', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: producto.id, activo: !producto.activo }),
    });
    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, activo: !p.activo } : p))
    );
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch('/api/catalogo', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Catálogo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {productos.length} producto{productos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar producto
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Package className="w-12 h-12 mb-3" />
          <p className="font-medium">Catálogo vacío</p>
          <p className="text-sm mt-1">Agrega productos para que aparezcan en el catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${
                producto.activo ? 'border-gray-100' : 'border-gray-100 opacity-50'
              }`}
            >
              <div className="relative h-40 bg-gray-50">
                {producto.imagen_url ? (
                  <Image
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                {!producto.activo && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border">
                      Inactivo
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-[#212121] line-clamp-2 mb-1">
                  {producto.nombre}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[#1A1A1A] font-bold">{formatUSD(producto.precio_usd)}</p>
                  {producto.categoria && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {producto.categoria}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActivo(producto)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${
                      producto.activo
                        ? 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-[#1A1A1A]'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {producto.activo ? (
                      <><EyeOff className="w-3 h-3" /> Ocultar</>
                    ) : (
                      <><Eye className="w-3 h-3" /> Activar</>
                    )}
                  </button>
                  <button
                    onClick={() => eliminar(producto.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar producto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-display font-bold text-[#1A1A1A]">Agregar producto</h2>
              <button onClick={() => setModalAbierto(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Vestido floral manga larga"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">URL de imagen</label>
                <input
                  type="url"
                  value={form.imagen_url}
                  onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Precio USD *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_usd}
                    onChange={(e) => setForm((f) => ({ ...f, precio_usd: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.peso_estimado_kg}
                    onChange={(e) => setForm((f) => ({ ...f, peso_estimado_kg: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                >
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Link de SHEIN</label>
                <input
                  type="url"
                  value={form.url_shein}
                  onChange={(e) => setForm((f) => ({ ...f, url_shein: e.target.value }))}
                  placeholder="https://es.shein.com/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={agregarProducto}
                disabled={guardando || !form.nombre || !form.precio_usd}
                className="flex-1 bg-[#1A1A1A] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
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
