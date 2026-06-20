'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import {
  ArrowLeft, Loader2, FileText, Upload, Trash2, AlertCircle, CheckCircle, Package,
} from 'lucide-react';

interface ItemCot {
  id: string;
  nombre: string;
  cantidad: number;
  total: number;
}

export default function CotizacionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ItemCot[]>([]);
  const [analizado, setAnalizado] = useState(false);

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [estadoVzla, setEstadoVzla] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [nota, setNota] = useState('');

  const subtotal = items.reduce((a, i) => a + i.total, 0);

  async function analizarPdf(file: File) {
    setError('');
    setProcesando(true);
    setAnalizado(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch('/api/admin/cotizacion', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo procesar el PDF.');
        return;
      }
      setItems(
        (data.items as { nombre: string; cantidad: number; total: number }[]).map((it) => ({
          id: crypto.randomUUID(),
          nombre: it.nombre,
          cantidad: it.cantidad,
          total: it.total,
        })),
      );
      setAnalizado(true);
    } catch {
      setError('Error de conexión al procesar el PDF.');
    } finally {
      setProcesando(false);
    }
  }

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);
    analizarPdf(file);
    e.target.value = '';
  }

  function actualizarItem(id: string, campo: 'nombre' | 'cantidad' | 'total', valor: string) {
    setItems((prev) => prev.map((i) => i.id === id ? {
      ...i,
      [campo]: campo === 'nombre' ? valor : Number(valor) || 0,
    } : i));
  }

  function eliminarItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function crearPedido() {
    if (!nombre.trim() || !telefono.trim()) {
      setError('El nombre y el teléfono del cliente son obligatorios.');
      return;
    }
    if (items.length === 0) {
      setError('La cotización no tiene artículos.');
      return;
    }
    setError('');
    setCreando(true);
    try {
      const itemsPedido = items.map((i) => ({
        nombre: i.nombre.trim() || 'Producto SHEIN',
        url_shein: '',
        imagen: '',
        precio_usd: i.cantidad > 0 ? i.total / i.cantidad : i.total,
        talla: '',
        color: '',
        cantidad: i.cantidad,
        peso_kg: 0,
      }));

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: nombre.trim(),
          cliente_cedula: cedula.trim(),
          cliente_telefono: telefono.trim(),
          cliente_estado: estadoVzla.trim(),
          cliente_direccion: direccion.trim(),
          nota_cliente: nota.trim(),
          metodo_pago: metodoPago.trim() || 'Cotización PDF',
          // Los totales del PDF ya son finales: no se recalcula envío/comisión
          subtotal,
          costo_envio: 0,
          costo_proteccion: 0,
          comision: 0,
          items: itemsPedido,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo crear el pedido.');
        return;
      }
      router.push(`/admin/pedidos/${data.id}`);
    } catch {
      setError('Error de conexión al crear el pedido.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pedidos" className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Subir cotización (PDF)</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Crea un pedido a partir de una cotización en PDF.
          </p>
        </div>
      </div>

      {/* Subida */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5 transition-colors mb-5"
      >
        {archivo ? (
          <>
            <FileText className="w-8 h-8 text-[#1A1A1A]" />
            <p className="text-sm font-medium text-[#1A1A1A]">{archivo.name}</p>
            <p className="text-xs text-gray-400">Haz clic para cambiar el archivo</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Subir cotización en PDF</p>
            <p className="text-xs text-gray-400">Detectamos los artículos automáticamente</p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivo} />

      {procesando && (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
          <Loader2 className="w-5 h-5 animate-spin" /> Analizando la cotización...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {analizado && (
        <>
          {/* Ítems detectados */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-1">
              Artículos detectados ({items.length})
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Revisa y ajusta los nombres, cantidades o precios si es necesario.
            </p>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => actualizarItem(item.id, 'nombre', e.target.value)}
                    placeholder="Nombre del producto"
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(item.id, 'cantidad', e.target.value)}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                    title="Cantidad"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.total}
                      onChange={(e) => actualizarItem(item.id, 'total', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                      title="Total de la fila"
                    />
                  </div>
                  <button
                    onClick={() => eliminarItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Total del pedido</span>
              <span className="text-xl font-display font-bold text-[#1A1A1A]">{formatUSD(subtotal)}</span>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Datos del cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono *</label>
                <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  placeholder="04XX-XXXXXXX"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cédula</label>
                <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado / ciudad</label>
                <input type="text" value={estadoVzla} onChange={(e) => setEstadoVzla(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Método de pago</label>
                <input type="text" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                  placeholder="Pago móvil, Zelle, Binance..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nota</label>
                <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]" />
              </div>
            </div>
          </div>

          <button
            onClick={crearPedido}
            disabled={creando}
            className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creando ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creando pedido...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Crear pedido ({formatUSD(subtotal)})</>
            )}
          </button>
        </>
      )}

      {!analizado && !procesando && !archivo && (
        <div className="flex flex-col items-center py-10 text-gray-300">
          <Package className="w-12 h-12 mb-2" />
          <p className="text-sm text-gray-400">Sube un PDF para comenzar</p>
        </div>
      )}
    </div>
  );
}
