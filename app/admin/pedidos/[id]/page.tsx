'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { estadoLabel, estadoColor, estadoEmoji, estadoPagoLabel, estadoPagoEmoji, motivoArchivoLabel, motivoArchivoEmoji, whatsappUrl } from '@/lib/utils';
import { formatUSD, calcularDesgloseCarrito, calcularAbono, calcularRestante } from '@/lib/calculations';
import type { Pedido, EstadoPedido, EstadoPago, MotivoArchivo, ItemCarrito } from '@/types';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  ExternalLink,
  Save,
  CheckCircle,
  Truck,
  ZoomIn,
  X,
  Pencil,
  Plus,
  Trash2,
  ImagePlus,
  ArchiveRestore,
  Ban,
} from 'lucide-react';

const ESTADOS_OPCIONES: EstadoPedido[] = [
  'pendiente_pago',
  'pago_confirmado',
  'comprando',
  'en_transito',
  'entregado',
];

const ESTADOS_PAGO_OPCIONES: EstadoPago[] = ['pendiente', 'abono_60', 'pagado_total'];

/** Redimensiona una imagen a base64 (igual que en el formulario del cliente). */
function resizeToBase64(file: File, maxWidth = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = blobUrl;
  });
}

export default function DetallePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [estadoSel, setEstadoSel] = useState<EstadoPedido>('pendiente_pago');
  const [estadoPagoSel, setEstadoPagoSel] = useState<EstadoPago>('pendiente');
  const [notaAdmin, setNotaAdmin] = useState('');
  const [trackingNumero, setTrackingNumero] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const [editandoItems, setEditandoItems] = useState(false);
  const [itemsEdit, setItemsEdit] = useState<ItemCarrito[]>([]);
  const [guardandoItems, setGuardandoItems] = useState(false);

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
      setEstadoPagoSel(data.pedido.estado_pago ?? 'pendiente');
      setNotaAdmin(data.pedido.nota_admin ?? '');
      setTrackingNumero(data.pedido.tracking_numero ?? '');
      setTrackingUrl(data.pedido.tracking_url ?? '');
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
        body: JSON.stringify({
          estado: estadoSel,
          estado_pago: estadoPagoSel,
          nota_admin: notaAdmin,
          tracking_numero: trackingNumero.trim(),
          tracking_url: trackingUrl.trim(),
        }),
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

  // ── Edición de artículos ────────────────────────────────────────────────
  function iniciarEdicionItems() {
    setItemsEdit((pedido?.items ?? []).map((it) => ({ ...it })));
    setEditandoItems(true);
  }

  function cancelarEdicionItems() {
    setEditandoItems(false);
    setItemsEdit([]);
  }

  function actualizarItemEdit(id: string, campo: keyof ItemCarrito, valor: string) {
    setItemsEdit((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const numerico = campo === 'precio_usd' || campo === 'cantidad' || campo === 'peso_kg';
      return { ...it, [campo]: numerico ? Number(valor) || 0 : valor };
    }));
  }

  function agregarItemEdit() {
    setItemsEdit((prev) => [...prev, {
      id: crypto.randomUUID(),
      nombre: '',
      url_shein: '',
      imagen: '',
      precio_usd: 0,
      talla: '',
      color: '',
      cantidad: 1,
      peso_kg: 0,
    }]);
  }

  function eliminarItemEdit(id: string) {
    setItemsEdit((prev) => prev.filter((it) => it.id !== id));
  }

  async function subirImagenItemEdit(id: string, file: File | undefined) {
    if (!file) return;
    const base64 = await resizeToBase64(file);
    setItemsEdit((prev) => prev.map((it) => it.id === id ? { ...it, imagen: base64 } : it));
  }

  /**
   * Recalcula los montos a partir de los artículos.
   * Pedidos "manuales" (importados por PDF, sin flete ni comisión) mantienen
   * total = subtotal. Pedidos de la web recalculan flete + comisión + seguro.
   */
  function recomputarFinanzas(items: ItemCarrito[]) {
    const subtotal = items.reduce((a, i) => a + i.precio_usd * i.cantidad, 0);
    const descuento = pedido?.descuento ?? 0;
    const esManual = (pedido?.costo_envio ?? 0) === 0 && (pedido?.comision ?? 0) === 0;
    if (esManual) {
      return { subtotal, costo_envio: 0, costo_proteccion: 0, comision: 0, total: Math.max(0, subtotal - descuento) };
    }
    const conSeguro = (pedido?.costo_proteccion ?? 0) > 0;
    const d = calcularDesgloseCarrito(items, 10, conSeguro, 0);
    return {
      subtotal: d.producto,
      costo_envio: d.envio,
      costo_proteccion: d.proteccion,
      comision: d.comision,
      total: Math.max(0, d.total - descuento),
    };
  }

  async function guardarItems() {
    if (!pedido) return;
    if (itemsEdit.length === 0) {
      alert('El pedido debe tener al menos un artículo.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setGuardandoItems(true);
    try {
      const fin = recomputarFinanzas(itemsEdit);
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ items: itemsEdit, ...fin }),
      });
      const data = await res.json();
      if (data.ok) {
        setPedido(data.pedido);
        setEditandoItems(false);
        setItemsEdit([]);
      }
    } finally {
      setGuardandoItems(false);
    }
  }

  // ── Archivar / restaurar ────────────────────────────────────────────────
  const [archivando, setArchivando] = useState(false);

  async function cambiarArchivo(body: { archivado: boolean; archivado_motivo?: MotivoArchivo }) {
    if (!pedido) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setArchivando(true);
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
      if (data.ok) setPedido(data.pedido);
    } finally {
      setArchivando(false);
    }
  }

  const finanzasPreview = editandoItems ? recomputarFinanzas(itemsEdit) : null;

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-[#1A1A1A]">Artículos del pedido</h2>
              {!editandoItems ? (
                <button
                  onClick={iniciarEdicionItems}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] hover:underline"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar artículos
                </button>
              ) : (
                <button
                  onClick={cancelarEdicionItems}
                  className="text-xs font-medium text-gray-400 hover:text-[#1A1A1A]"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* ── Modo lectura ──────────────────────────────────────── */}
            {!editandoItems && (
              <>
                <div className="space-y-4">
                  {pedido.items?.map((item, i) => (
                    <div key={i} className="flex gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      {item.imagen && (
                        <button
                          type="button"
                          onClick={() => setImagenAmpliada(item.imagen)}
                          className="group relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 cursor-zoom-in"
                          title="Ver captura del cliente"
                        >
                          <Image
                            src={item.imagen}
                            alt={item.nombre}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
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
              </>
            )}

            {/* ── Modo edición ──────────────────────────────────────── */}
            {editandoItems && finanzasPreview && (
              <>
                <div className="space-y-3">
                  {itemsEdit.map((item, idx) => (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-1">
                          {idx + 1}
                        </span>
                        {/* Captura / imagen del artículo */}
                        <label
                          className="group relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-dashed border-gray-300 hover:border-[#1A1A1A] cursor-pointer flex items-center justify-center transition-colors"
                          title={item.imagen ? 'Cambiar captura' : 'Subir captura'}
                        >
                          {item.imagen ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                                <Pencil className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            </>
                          ) : (
                            <ImagePlus className="w-5 h-5 text-gray-400 group-hover:text-[#1A1A1A]" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              subirImagenItemEdit(item.id, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          value={item.nombre}
                          onChange={(e) => actualizarItemEdit(item.id, 'nombre', e.target.value)}
                          placeholder="Nombre del artículo"
                          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] mt-0.5"
                        />
                        <button
                          onClick={() => eliminarItemEdit(item.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0 mt-1.5"
                          aria-label="Eliminar artículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={item.talla}
                          onChange={(e) => actualizarItemEdit(item.id, 'talla', e.target.value)}
                          placeholder="Talla"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                        />
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => actualizarItemEdit(item.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Cant</span>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => actualizarItemEdit(item.id, 'cantidad', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precio_usd}
                            onChange={(e) => actualizarItemEdit(item.id, 'precio_usd', e.target.value)}
                            placeholder="Precio/u"
                            className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={agregarItemEdit}
                  className="mt-3 w-full border border-dashed border-gray-300 text-gray-500 hover:border-[#1A1A1A] hover:text-[#1A1A1A] rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar artículo
                </button>

                {/* Desglose recalculado */}
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal productos</span>
                    <span>{formatUSD(finanzasPreview.subtotal)}</span>
                  </div>
                  {finanzasPreview.costo_envio > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Envío aéreo ZOOM</span>
                      <span>{formatUSD(finanzasPreview.costo_envio)}</span>
                    </div>
                  )}
                  {finanzasPreview.costo_proteccion > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Protección ZOOM</span>
                      <span>{formatUSD(finanzasPreview.costo_proteccion)}</span>
                    </div>
                  )}
                  {finanzasPreview.comision > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Comisión del servicio</span>
                      <span>{formatUSD(finanzasPreview.comision)}</span>
                    </div>
                  )}
                  {pedido.descuento > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Descuento {pedido.codigo_cupon ? `(${pedido.codigo_cupon})` : ''}</span>
                      <span>−{formatUSD(pedido.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
                    <span className="text-[#1A1A1A]">Total</span>
                    <span className="text-[#1A1A1A]">{formatUSD(finanzasPreview.total)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={cancelarEdicionItems}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarItems}
                    disabled={guardandoItems}
                    className="flex-1 bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {guardandoItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar artículos
                  </button>
                </div>
              </>
            )}
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

            {/* Estado de pago 60/40 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado de pago</label>
              <select
                value={estadoPagoSel}
                onChange={(e) => setEstadoPagoSel(e.target.value as EstadoPago)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              >
                {ESTADOS_PAGO_OPCIONES.map((e) => (
                  <option key={e} value={e}>
                    {estadoPagoEmoji(e)} {estadoPagoLabel(e)}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Abono 60%: <span className="font-semibold text-[#1A1A1A]">{formatUSD(calcularAbono(pedido.total))}</span></span>
                <span>Resta 40%: <span className="font-semibold text-[#1A1A1A]">{formatUSD(calcularRestante(pedido.total))}</span></span>
              </div>
            </div>

            {/* Seguimiento ZOOM — solo al marcar "En tránsito" */}
            {estadoSel === 'en_transito' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Truck className="w-4 h-4" />
                  <span className="text-xs font-semibold">Guía de seguimiento ZOOM</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Número de guía
                  </label>
                  <input
                    type="text"
                    value={trackingNumero}
                    onChange={(e) => setTrackingNumero(e.target.value)}
                    placeholder="Ej. 1234567890"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    URL de seguimiento
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://www.grupozoom.com/tracking/..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
                <p className="text-xs text-blue-600/80 leading-relaxed">
                  El cliente verá esta guía al consultar su pedido mientras esté en tránsito.
                </p>
              </div>
            )}

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

          {/* Archivar pedido */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-[#1A1A1A] mb-1">Archivar pedido</h2>
            {pedido.archivado ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Este pedido está archivado
                  {pedido.archivado_motivo
                    ? ` como “${motivoArchivoEmoji(pedido.archivado_motivo)} ${motivoArchivoLabel(pedido.archivado_motivo)}”`
                    : ''}
                  .
                </p>
                <button
                  onClick={() => cambiarArchivo({ archivado: false })}
                  disabled={archivando}
                  className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                >
                  {archivando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
                  Restaurar a activos
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Sácalo de la vista activa moviéndolo al archivo.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => cambiarArchivo({ archivado: true, archivado_motivo: 'completado' })}
                    disabled={archivando}
                    className="w-full border border-gray-200 hover:border-green-400 hover:bg-green-50 text-[#1A1A1A] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Archivar como completado
                  </button>
                  <button
                    onClick={() => cambiarArchivo({ archivado: true, archivado_motivo: 'no_pago' })}
                    disabled={archivando}
                    className="w-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-[#1A1A1A] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    <Ban className="w-4 h-4 text-gray-500" />
                    Archivar: no pagó
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox — captura del cliente ampliada */}
      {imagenAmpliada && (
        <div
          onClick={() => setImagenAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-7 h-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenAmpliada}
            alt="Captura del cliente"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
