'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import {
  calcularDesgloseCarrito, calcularAbono, calcularRestante, formatUSD, formatBsD,
} from '@/lib/calculations';
import type { ItemCarrito } from '@/types';
import {
  Loader2, ShoppingCart, AlertCircle, CheckCircle,
  XCircle, Info, Package, Camera, RefreshCw, Link2,
  ChevronDown, HelpCircle, Sparkles,
} from 'lucide-react';

type Paso = 'formulario' | 'confirmado';

const PESO_DEFAULT = 0.3;

type EstadoItem = 'procesando' | 'listo' | 'error';

interface ItemPedido {
  id: string;
  file: File;
  preview: string;
  base64: string;
  estado: EstadoItem;
  // Resultado de la IA
  nombre: string;
  categoria: string;
  precio: number;
  peso: number;
  // Campos opcionales que llena el usuario
  talla: string;
  color: string;
  url: string;
  mensajeError?: string;
}

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

function uid() {
  return crypto.randomUUID();
}

function PedirContent() {
  const searchParams = useSearchParams();
  const { addMany, totalItems } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>('formulario');
  const [error, setError] = useState('');
  const [agregados, setAgregados] = useState(0);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [instruccionesAbierto, setInstruccionesAbierto] = useState(false);

  // Pre-fill de link desde catálogo (?url=) — se aplica al primer item cuando exista
  const urlInicial = searchParams.get('url') || '';

  // ── Procesar una captura: extraer precio + peso con la IA ───────────────
  async function procesarItem(id: string, file: File) {
    try {
      const fd = new FormData();
      fd.append('screenshot', file);
      const res = await fetch('/api/verify-price', { method: 'POST', body: fd });
      const data = await res.json();

      if (!data.ok || !data.encontrado || !data.precio) {
        setItems((prev) => prev.map((it) => it.id === id ? {
          ...it,
          estado: 'error',
          mensajeError: data.mensaje || 'No se pudo leer el precio. Asegúrate de que el precio sea visible en la captura.',
        } : it));
        return;
      }

      const precio = data.precio as number;
      const peso = Number(data.peso_kg) || PESO_DEFAULT;
      const categoria: string = data.categoria || '';
      const nombreCaptura: string = (data.nombre || '').trim();

      setItems((prev) => prev.map((it) => it.id === id ? {
        ...it,
        estado: 'listo',
        precio,
        peso,
        categoria,
        nombre: nombreCaptura || categoria || 'Producto SHEIN',
      } : it));
    } catch {
      setItems((prev) => prev.map((it) => it.id === id ? {
        ...it,
        estado: 'error',
        mensajeError: 'Error de conexión. Reintenta.',
      } : it));
    }
  }

  // ── Subir 1 o varias capturas ───────────────────────────────────────────
  async function handleScreenshots(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');

    const nuevos: ItemPedido[] = await Promise.all(
      files.map(async (file) => ({
        id: uid(),
        file,
        preview: URL.createObjectURL(file),
        base64: await resizeToBase64(file),
        estado: 'procesando' as EstadoItem,
        nombre: '',
        categoria: '',
        precio: 0,
        peso: PESO_DEFAULT,
        talla: '',
        color: '',
        url: '',
      })),
    );

    // Aplicar link inicial (desde catálogo) al primer item si aún no hay items
    if (urlInicial && items.length === 0 && nuevos.length > 0) {
      nuevos[0].url = urlInicial;
    }

    setItems((prev) => [...prev, ...nuevos]);
    // Reset del input para permitir volver a subir las mismas imágenes
    e.target.value = '';

    // Procesar todas en paralelo
    nuevos.forEach((it) => procesarItem(it.id, it.file));
  }

  function reintentar(id: string) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, estado: 'procesando', mensajeError: undefined } : i));
    procesarItem(id, it.file);
  }

  function eliminarItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function actualizarCampo(id: string, campo: 'talla' | 'color' | 'url', valor: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [campo]: valor } : i));
  }

  // Best-effort: al pegar un link, mejora el nombre con el scraper (no bloquea)
  async function mejorarNombreDesdeLink(id: string, url: string) {
    if (!url.trim() || !url.includes('shein')) return;
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      const nombre: string = data?.producto?.nombre || '';
      if (nombre) {
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, nombre } : i));
      }
    } catch {
      // silencioso: el link es opcional y solo sirve de referencia
    }
  }

  // ── Items listos y desglose combinado (flete compartido) ────────────────
  const itemsListos = items.filter((i) => i.estado === 'listo');
  const procesando = items.some((i) => i.estado === 'procesando');

  const itemsCarrito: ItemCarrito[] = itemsListos.map((i) => ({
    id: i.id,
    nombre: i.nombre || 'Producto SHEIN',
    url_shein: i.url.trim(),
    imagen: i.base64,
    precio_usd: i.precio,
    talla: i.talla.trim(),
    color: i.color.trim(),
    cantidad: 1,
    peso_kg: i.peso,
  }));

  const desglose = calcularDesgloseCarrito(itemsCarrito);

  // ── Agregar todo al carrito ─────────────────────────────────────────────
  function agregarTodoAlCarrito() {
    if (itemsCarrito.length === 0) {
      setError('Sube al menos una captura con el precio visible.');
      return;
    }
    addMany(itemsCarrito.map(({ id: _id, ...rest }) => rest));
    setAgregados(itemsCarrito.length);
    setPaso('confirmado');
    setItems([]);
  }

  function empezarDeNuevo() {
    setPaso('formulario');
    setItems([]);
    setError('');
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2">Hacer pedido</h1>
        <p className="text-gray-500 mb-8">
          Sube una o varias capturas de los productos (con el precio visible) y arma tu pedido.
          Extraemos el precio de cada captura automáticamente.
        </p>

        {/* ── FORMULARIO ────────────────────────────────────────────── */}
        {paso === 'formulario' && (
          <div className="space-y-5">

            {/* Instrucciones desplegables */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setInstruccionesAbierto((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-3.5 text-left"
                aria-expanded={instruccionesAbierto}
              >
                <HelpCircle className="w-5 h-5 text-[#1A1A1A] flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-[#1A1A1A]">
                  ¿Cómo tomar la captura correcta?
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${instruccionesAbierto ? 'rotate-180' : ''}`}
                />
              </button>

              {instruccionesAbierto && (
                <div className="px-4 pb-5 pt-1 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mb-1">
                    Para calcular tu precio correctamente, la captura debe mostrar
                    <strong className="text-[#1A1A1A]"> claramente estos dos datos</strong>:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1.5 mb-5 mt-3">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                      <span>El <strong className="text-[#1A1A1A]">nombre del producto</strong> (el título descriptivo del artículo).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                      <span>El <strong className="text-[#1A1A1A]">precio</strong> del producto (normalmente en rojo o destacado).</span>
                    </li>
                  </ul>

                  {/* Captura de ejemplo anotada */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Ejemplo
                  </p>
                  <div className="flex justify-center">
                    <div className="w-full max-w-[230px] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                      {/* Foto del producto (simulada) */}
                      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                      {/* Nombre del producto — resaltado ① */}
                      <div className="px-3 pt-3">
                        <div className="relative rounded-lg ring-2 ring-[#1A1A1A] bg-[#1A1A1A]/[0.03] px-2 py-1.5">
                          <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                          <p className="text-xs text-gray-700 leading-snug">
                            Vestido Floral Manga Corta Cuello V
                          </p>
                        </div>
                      </div>
                      {/* Precio — resaltado ② */}
                      <div className="px-3 pt-3 pb-4">
                        <div className="relative inline-block rounded-lg ring-2 ring-red-500 bg-red-50 px-2.5 py-1">
                          <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                          <span className="text-lg font-bold text-red-600">$12.99</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#1A1A1A] text-white text-[9px] font-bold flex items-center justify-center">1</span>
                      Nombre visible
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">2</span>
                      Precio visible
                    </span>
                  </div>

                  <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Si el precio o el nombre no se ven bien en la captura, no podremos calcular tu pedido.
                      Toma la captura desde la página del producto en la app de SHEIN.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Zona de subida */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5 transition-colors"
            >
              <Camera className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">
                {items.length === 0 ? 'Subir capturas de pantalla' : 'Agregar más capturas'}
              </p>
              <p className="text-xs text-gray-400">
                Puedes seleccionar varias a la vez · el precio debe ser visible
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleScreenshots}
            />

            {/* Lista de items */}
            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      {/* Miniatura */}
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        {item.preview ? (
                          <Image src={item.preview} alt={`Captura ${idx + 1}`} fill className="object-cover" unoptimized />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300 m-auto" />
                        )}
                      </div>

                      {/* Datos */}
                      <div className="flex-1 min-w-0">
                        {item.estado === 'procesando' && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                            <Loader2 className="w-4 h-4 animate-spin" /> Leyendo precio...
                          </div>
                        )}

                        {item.estado === 'error' && (
                          <div className="py-1">
                            <div className="flex items-start gap-1.5 text-xs text-red-500 mb-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{item.mensajeError}</span>
                            </div>
                            <button
                              onClick={() => reintentar(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                            >
                              <RefreshCw className="w-3 h-3" /> Reintentar
                            </button>
                          </div>
                        )}

                        {item.estado === 'listo' && (
                          <>
                            <p className="font-medium text-[#212121] text-sm leading-snug line-clamp-2">
                              {item.nombre}
                            </p>
                            <div className="mt-1.5 flex items-baseline gap-1.5">
                              <span className="text-xl font-display font-bold text-[#1A1A1A]">
                                {formatUSD(item.precio)}
                              </span>
                              <span className="text-xs text-gray-400">precio en SHEIN</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarItem(item.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors self-start p-0.5"
                        aria-label="Eliminar"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Campos opcionales */}
                    {item.estado === 'listo' && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-50 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.talla}
                            onChange={(e) => actualizarCampo(item.id, 'talla', e.target.value)}
                            placeholder="Talla o Modelo (opcional)"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                          />
                          <input
                            type="text"
                            value={item.color}
                            onChange={(e) => actualizarCampo(item.id, 'color', e.target.value)}
                            placeholder="Color (opcional)"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                          />
                        </div>
                        <div className="relative">
                          <Link2 className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => actualizarCampo(item.id, 'url', e.target.value)}
                            onBlur={(e) => mejorarNombreDesdeLink(item.id, e.target.value)}
                            placeholder="Agregar link del producto (opcional)"
                            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resumen / total */}
            {itemsListos.length > 0 && (
              <div className="bg-[#1A1A1A] text-white rounded-2xl p-5">
                <h3 className="font-display font-bold text-base mb-4">
                  Resumen ({itemsListos.length} artículo{itemsListos.length !== 1 ? 's' : ''})
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Subtotal productos</span>
                    <span>{formatUSD(desglose.producto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      Flete ZOOM ({itemsListos.reduce((a, i) => a + i.peso, 0).toFixed(2)} kg)
                    </span>
                    <span>{formatUSD(desglose.envio)}</span>
                  </div>
                  {desglose.proteccion > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">
                        Seguro {desglose.producto <= 100 ? '($1.20 fijo)' : '(1%)'}
                      </span>
                      <span>{formatUSD(desglose.proteccion)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-300">Comisión del servicio (10%)</span>
                    <span>{formatUSD(desglose.comision)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-2.5 mt-1 flex justify-between font-bold text-base">
                    <span>TOTAL USD</span>
                    <span className="text-xl">{formatUSD(desglose.total)}</span>
                  </div>
                  {!!desglose.totalBsd && desglose.totalBsd > 0 && (
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-gray-400">Total en Bs</span>
                      <span>{formatBsD(desglose.total, 1)}</span>
                    </div>
                  )}
                </div>

                {/* Desglose de pago 60/40 */}
                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#FFD700]">
                      Aparta con solo el 60%
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-gray-300">Pagas hoy (60%)</span>
                    <span className="text-2xl font-display font-bold text-white">
                      {formatUSD(calcularAbono(desglose.total))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-white/10">
                    <span>Restante al retirar (40%)</span>
                    <span>{formatUSD(calcularRestante(desglose.total))}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-300 leading-relaxed">
                    El <span className="text-white font-semibold">flete se comparte</span> entre todos tus
                    artículos, por eso el total puede ser menor que la suma de los envíos estimados de cada item.
                    Flete mínimo $12.90 · $12.90 por cada ½ kg.
                  </p>
                </div>
              </div>
            )}

            {/* Error general */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón agregar todo */}
            {items.length > 0 && (
              <button
                onClick={agregarTodoAlCarrito}
                disabled={procesando || itemsListos.length === 0}
                className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-bold py-4 rounded-xl text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Procesando capturas...</>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Agregar {itemsListos.length} al carrito
                  </>
                )}
              </button>
            )}

            {/* Estado vacío */}
            {items.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 p-3.5 bg-[#1A1A1A] text-white rounded-xl">
                  <Sparkles className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                  <p className="text-sm leading-relaxed">
                    <strong className="text-[#FFD700]">Aparta tu pedido con solo el 60%.</strong>{' '}
                    Pagas el 60% para procesarlo y el 40% restante al retirarlo.
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Cada captura se convierte en un artículo. Estimamos el <strong>precio y el peso</strong> de
                    cada producto automáticamente. Especifica la talla (o modelo), y el color.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRMADO ────────────────────────────────────────────── */}
        {paso === 'confirmado' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-2">
              ¡{agregados} artículo{agregados !== 1 ? 's' : ''} agregado{agregados !== 1 ? 's' : ''}!
            </h2>
            <p className="text-gray-500 mb-6">
              Tienes {totalItems} artículo{totalItems !== 1 ? 's' : ''} en tu carrito.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/carrito"
                className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3D3D3D] transition-colors">
                Ver carrito y procesar
              </Link>
              <button onClick={empezarDeNuevo}
                className="border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Agregar más productos
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function PedirPage() {
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
      <PedirContent />
    </Suspense>
  );
}
