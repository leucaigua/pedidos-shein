'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { calcularDesglose, formatUSD, formatBsD, calcularEnvioAereo } from '@/lib/calculations';
import type { DesglosePrecio } from '@/types';
import {
  Search, Loader2, ShoppingCart, AlertCircle, CheckCircle,
  ExternalLink, Upload, XCircle, Info, Package, Camera,
} from 'lucide-react';

type Paso = 'formulario' | 'resultado' | 'confirmado';

const PESO_DEFAULT = 0.3;

interface ResultadoProducto {
  nombre: string;
  imagen: string;
  imagenShein: string;
  precio: number;
  peso: number;        // estimado por IA según la captura
  categoria: string;   // tipo de producto detectado
  desglose: DesglosePrecio;
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

function PedirContent() {
  const searchParams = useSearchParams();
  const { addItem, totalItems } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>('formulario');
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState('');

  // Campos del formulario
  const [url, setUrl] = useState('');
  const [talla, setTalla] = useState('');
  const [color, setColor] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');

  // Resultado
  const [resultado, setResultado] = useState<ResultadoProducto | null>(null);

  // Pre-fill desde catálogo (?url=&precio=...)
  useEffect(() => {
    const pUrl = searchParams.get('url');
    if (pUrl) setUrl(pUrl);
  }, [searchParams]);

  // ── Manejar captura ────────────────────────────────────────────────────
  async function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    const base64 = await resizeToBase64(file);
    setScreenshotBase64(base64);
    setError('');
  }

  function quitarCaptura() {
    setScreenshot(null);
    setScreenshotPreview('');
    setScreenshotBase64('');
  }

  // ── Consultar: todo en paralelo ────────────────────────────────────────
  async function consultar() {
    // Validaciones
    if (!url.trim() || !url.includes('shein')) {
      setError('Ingresa un link válido de SHEIN'); return;
    }
    if (!screenshot) {
      setError('Sube la captura de pantalla del producto (con el precio visible)'); return;
    }
    if (!talla.trim()) {
      setError('La talla es obligatoria'); return;
    }
    if (!color.trim()) {
      setError('El color es obligatorio'); return;
    }

    setError('');
    setConsultando(true);

    try {
      // Ejecutar scraping y extracción de precio en paralelo
      const fd = new FormData();
      fd.append('screenshot', screenshot);

      const [scrapeRes, priceRes] = await Promise.all([
        fetch('/api/scrape-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }),
        fetch('/api/verify-price', { method: 'POST', body: fd }),
      ]);

      const scrapeData = await scrapeRes.json();
      const priceData = await priceRes.json();

      // Validar precio extraído de la captura
      if (!priceData.ok || !priceData.encontrado || !priceData.precio) {
        setError(
          priceData.mensaje ||
          'No se pudo extraer el precio de la captura. Asegúrate de que el precio sea claramente visible en la pantalla.'
        );
        setConsultando(false);
        return;
      }

      const precio = priceData.precio as number;
      const peso = Number(priceData.peso_kg) || PESO_DEFAULT;
      const categoria: string = priceData.categoria || '';
      const nombre: string = scrapeData?.producto?.nombre || scrapeData?.nombre || '';
      const imagenShein: string = scrapeData?.producto?.imagen || '';
      const desglose = calcularDesglose(precio * cantidad, peso * cantidad);

      setResultado({ nombre, imagen: screenshotBase64, imagenShein, precio, peso, categoria, desglose });
      setPaso('resultado');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setConsultando(false);
    }
  }

  // Recalcular desglose al cambiar cantidad
  useEffect(() => {
    if (!resultado) return;
    setResultado(r => r
      ? { ...r, desglose: calcularDesglose(r.precio * cantidad, r.peso * cantidad) }
      : r
    );
  }, [cantidad]);

  // ── Agregar al carrito ─────────────────────────────────────────────────
  function agregarAlCarrito() {
    if (!resultado) return;
    addItem({
      nombre: resultado.nombre || 'Producto SHEIN',
      url_shein: url,
      imagen: resultado.imagen || resultado.imagenShein,
      precio_usd: resultado.precio,
      talla,
      color,
      cantidad,
      peso_kg: resultado.peso,
    });
    setPaso('confirmado');
  }

  function empezarDeNuevo() {
    setPaso('formulario');
    setUrl(''); setTalla(''); setColor(''); setCantidad(1);
    setScreenshot(null); setScreenshotPreview(''); setScreenshotBase64('');
    setResultado(null); setError('');
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2">Hacer pedido</h1>
        <p className="text-gray-500 mb-8">
          Completa los datos del producto y extraemos el precio automáticamente de tu captura.
        </p>

        {/* ── FORMULARIO ────────────────────────────────────────────── */}
        {paso === 'formulario' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

            {/* 1 — Link */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
                1. Link del producto en SHEIN
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://us.shein.com/... o link compartido desde la app"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>

            {/* 2 — Captura */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                2. Captura de pantalla del producto
              </label>
              <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                Abre el producto en SHEIN, asegúrate de que el <strong>precio sea visible</strong> y toma una captura.
                Extraeremos el precio automáticamente.
              </p>

              {screenshotPreview ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-green-200">
                    <Image src={screenshotPreview} alt="Captura" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-700 truncate">{screenshot?.name}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-gray-400 hover:text-[#1A1A1A] transition-colors mt-0.5"
                    >
                      Cambiar captura
                    </button>
                  </div>
                  <button onClick={quitarCaptura} className="text-gray-300 hover:text-red-400 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Subir captura de pantalla</p>
                  <p className="text-xs text-gray-400">JPG, PNG o WEBP · el precio debe ser visible</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
            </div>

            {/* 3 — Talla y Color (obligatorios) */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
                3. Talla y color <span className="text-[#1A1A1A]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={talla}
                    onChange={e => setTalla(e.target.value)}
                    placeholder="Talla (S, M, L, XL, 38...)"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] ${
                      !talla.trim() && error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder="Color (Negro, Rojo...)"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] ${
                      !color.trim() && error ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 4 — Cantidad */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
                4. Cantidad
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                className="w-32 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>

            {/* Info de peso (estimado automáticamente) */}
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 leading-relaxed">
                Estimamos el <strong>peso del producto automáticamente</strong> a partir de tu captura
                (ropa, zapatos, muebles, etc.) para calcular el flete con mayor precisión.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón Consultar */}
            <button
              onClick={consultar}
              disabled={consultando}
              className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-bold py-4 rounded-xl text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {consultando ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Extrayendo precio y datos...</>
              ) : (
                <><Search className="w-5 h-5" /> Consultar</>
              )}
            </button>
          </div>
        )}

        {/* ── RESULTADO ─────────────────────────────────────────────── */}
        {paso === 'resultado' && resultado && (
          <div className="space-y-5">

            {/* Tarjeta del producto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Imagen + info principal */}
              <div className="flex">
                <div className="relative w-40 h-44 flex-shrink-0 bg-gray-50">
                  {resultado.imagen ? (
                    <Image src={resultado.imagen} alt={resultado.nombre} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    Tu captura
                  </span>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <p className="font-semibold text-[#212121] text-sm leading-snug mb-3 line-clamp-3">
                      {resultado.nombre || 'Producto SHEIN'}
                    </p>

                    {/* Precio extraído automáticamente */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Precio en SHEIN</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-[#1A1A1A]">
                      {formatUSD(resultado.precio)}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>Talla: <span className="font-medium text-gray-700">{talla}</span></p>
                    <p>Color: <span className="font-medium text-gray-700">{color}</span></p>
                    <p>Cantidad: <span className="font-medium text-gray-700">{cantidad}</span></p>
                    <p>
                      Peso est.: <span className="font-medium text-gray-700">{resultado.peso} kg/u</span>
                      {resultado.categoria && (
                        <span className="text-gray-400"> · {resultado.categoria}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Link a SHEIN */}
              {url && (
                <div className="border-t border-gray-50 px-4 py-2">
                  <a
                    href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#1A1A1A] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver producto en SHEIN
                  </a>
                </div>
              )}
            </div>

            {/* Desglose de precio */}
            <div className="bg-[#1A1A1A] text-white rounded-2xl p-5">
              <h3 className="font-display font-bold text-base mb-4">Desglose de precio</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Producto × {cantidad}</span>
                  <span>{formatUSD(resultado.desglose.producto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">
                    Flete ZOOM ({(resultado.peso * cantidad).toFixed(2)} kg)
                  </span>
                  <span>{formatUSD(resultado.desglose.envio)}</span>
                </div>
                {resultado.desglose.proteccion > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      Seguro {resultado.desglose.producto <= 100 ? '($1.20 fijo)' : '(1%)'}
                    </span>
                    <span>{formatUSD(resultado.desglose.proteccion)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-300">Comisión del servicio (10%)</span>
                  <span>{formatUSD(resultado.desglose.comision)}</span>
                </div>
                <div className="border-t border-white/20 pt-2.5 mt-1 flex justify-between font-bold text-base">
                  <span>TOTAL USD</span>
                  <span className="text-[#FFFFFF] text-xl">{formatUSD(resultado.desglose.total)}</span>
                </div>
                {!!resultado.desglose.totalBsd && resultado.desglose.totalBsd > 0 && (
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-400">Total en Bs</span>
                    <span className="text-[#FFFFFF]">{formatBsD(resultado.desglose.total, 1)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Calculado sobre {(resultado.peso * cantidad).toFixed(2)} kg de peso estimado.
                Flete mínimo $16.20 · $16.20 por cada ½ kg.
              </p>

              {/* Nota informativa de envío */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#FFFFFF] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  <span className="text-[#FFFFFF] font-semibold">¿Tienes más artículos?</span>{' '}
                  Si agregas más productos al carrito, el flete se recalcula automáticamente sobre el peso total del pedido —
                  compartir el envío entre varios artículos puede reducir el costo por producto.
                  <br />
                  <span className="text-gray-400 mt-1 block">
                    Flete mínimo: $16.20 · $16.20 por cada ½ kg adicional.
                  </span>
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={empezarDeNuevo}
                className="flex-1 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                ← Cambiar producto
              </button>
              <button
                onClick={agregarAlCarrito}
                className="flex-1 bg-[#1A1A1A] text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#3D3D3D] transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Agregar al carrito
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRMADO ────────────────────────────────────────────── */}
        {paso === 'confirmado' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-2">¡Agregado al carrito!</h2>
            <p className="text-gray-500 mb-6">
              Tienes {totalItems} artículo{totalItems !== 1 ? 's' : ''} en tu carrito.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/carrito"
                className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3D3D3D] transition-colors">
                Ver carrito y pagar
              </Link>
              <button onClick={empezarDeNuevo}
                className="border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Agregar otro producto
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
