'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { calcularEnvioAereo, formatUSD } from '@/lib/calculations';
import type { ProductoCatalogo, VarianteCatalogo } from '@/types';
import {
  Package, Loader2, AlertCircle, Check, ExternalLink, ShoppingCart, Minus, Plus, Info, ChevronRight,
} from 'lucide-react';

function unicos(vals: (string | undefined)[]): string[] {
  return [...new Set(vals.filter((v): v is string => Boolean(v)))];
}

export default function ProductoDetallePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [producto, setProducto] = useState<ProductoCatalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [imgActiva, setImgActiva] = useState(0);
  const [color, setColor] = useState('');
  const [talla, setTalla] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    setCargando(true);
    setError(false);
    fetch(`/api/catalogo/${slug}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProducto(d.producto);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [slug]);

  const variantes = useMemo(() => producto?.variantes ?? [], [producto]);
  const colores = useMemo(() => unicos(variantes.map((v) => v.color)), [variantes]);
  const tallas = useMemo(() => unicos(variantes.map((v) => v.talla)), [variantes]);
  const requiereColor = colores.length > 0;
  const requiereTalla = tallas.length > 0;

  // Variante seleccionada según color/talla elegidos.
  const varianteSel: VarianteCatalogo | undefined = useMemo(() => {
    if (variantes.length === 0) return undefined;
    return variantes.find(
      (v) => (!requiereColor || v.color === color) && (!requiereTalla || v.talla === talla)
    );
  }, [variantes, color, talla, requiereColor, requiereTalla]);

  const listoParaAgregar =
    !!producto &&
    (!requiereColor || !!color) &&
    (!requiereTalla || !!talla) &&
    producto.disponibilidad !== 'agotado' &&
    varianteSel?.disponibilidad !== 'agotado';

  if (cargando) {
    return (
      <Marco>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      </Marco>
    );
  }

  if (error || !producto) {
    return (
      <Marco>
        <div className="flex flex-col items-center py-32 text-gray-500">
          <AlertCircle className="w-12 h-12 mb-3 text-red-300" />
          <p className="font-medium">Producto no disponible</p>
          <Link href="/catalogo" className="mt-4 text-sm text-[#1A1A1A] underline">
            Volver al catálogo
          </Link>
        </div>
      </Marco>
    );
  }

  const imagenes = producto.imagenes?.length ? producto.imagenes : [producto.imagen_url].filter(Boolean);
  const peso = producto.peso_estimado_kg;
  const subtotal = producto.precio_usd * cantidad;
  const envioEst = calcularEnvioAereo(peso * cantidad);
  const totalEst = subtotal + envioEst;
  const descuento =
    producto.precio_anterior_usd && producto.precio_anterior_usd > producto.precio_usd
      ? Math.round((1 - producto.precio_usd / producto.precio_anterior_usd) * 100)
      : 0;

  function agregar() {
    if (!producto || !listoParaAgregar) return;
    const etiqueta = [color, talla].filter(Boolean).join(' / ');
    addItem({
      nombre: producto.nombre,
      url_shein: producto.source_url || producto.url_shein || '',
      imagen: producto.imagen_url || imagenes[0] || '',
      precio_usd: producto.precio_usd,
      talla,
      color,
      cantidad,
      peso_kg: peso,
      catalogo_id: producto.id,
      external_id: producto.external_id,
      source: producto.source,
      variante: etiqueta || undefined,
      variante_id: varianteSel?.id,
      precio_snapshot: producto.precio_usd,
    });
    setAgregado(true);
    setTimeout(() => router.push('/carrito'), 700);
  }

  return (
    <Marco>
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 mb-4">
        <Link href="/catalogo" className="hover:text-[#1A1A1A]">Catálogo</Link>
        {producto.categoria && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span>{producto.categoria}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Galería */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3">
            {imagenes[imgActiva] ? (
              <Image src={imagenes[imgActiva]} alt={producto.nombre} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-12 h-12 text-gray-300" />
              </div>
            )}
            {descuento > 0 && (
              <span className="absolute top-3 left-3 bg-[#1A1A1A] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{descuento}%
              </span>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imagenes.slice(0, 8).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgActiva(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                    i === imgActiva ? 'border-[#1A1A1A]' : 'border-transparent'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#1A1A1A] mb-3">
            {producto.nombre}
          </h1>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-[#1A1A1A]">{formatUSD(producto.precio_usd)}</span>
            {descuento > 0 && (
              <span className="text-base text-gray-400 line-through">
                {formatUSD(producto.precio_anterior_usd!)}
              </span>
            )}
          </div>

          {/* Selector de color */}
          {requiereColor && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Color {color && <span className="text-gray-400 font-normal">· {color}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {colores.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor((v) => (v === c ? '' : c))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      color === c ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-gray-200 text-gray-700 hover:border-[#1A1A1A]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector de talla */}
          {requiereTalla && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#212121] mb-2">
                Talla {talla && <span className="text-gray-400 font-normal">· {talla}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {tallas.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTalla((v) => (v === t ? '' : t))}
                    className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      talla === t ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-gray-200 text-gray-700 hover:border-[#1A1A1A]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[#212121] mb-2">Cantidad</label>
            <div className="inline-flex items-center gap-3 border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#1A1A1A] disabled:opacity-30"
                disabled={cantidad <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium">{cantidad}</span>
              <button
                onClick={() => setCantidad((c) => c + 1)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#1A1A1A]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Estimado */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Producto ({cantidad})</span>
              <span>{formatUSD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío aéreo estimado</span>
              <span>{formatUSD(envioEst)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#1A1A1A] pt-2 border-t border-gray-200">
              <span>Total estimado</span>
              <span>{formatUSD(totalEst)}</span>
            </div>
            <p className="text-[11px] text-gray-400 pt-1">
              Estimado sin comisión/seguro. El detalle final aparece en el carrito.
            </p>
          </div>

          {/* Agregar */}
          <button
            onClick={agregar}
            disabled={!listoParaAgregar}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-colors mb-2 ${
              agregado
                ? 'bg-green-500 text-white'
                : listoParaAgregar
                  ? 'bg-[#1A1A1A] text-white hover:bg-[#3D3D3D]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {agregado ? <><Check className="w-5 h-5" /> ¡Agregado!</> : <><ShoppingCart className="w-5 h-5" /> Agregar al carrito</>}
          </button>
          {!listoParaAgregar && !agregado && producto.disponibilidad !== 'agotado' && (
            <p className="text-xs text-amber-600 text-center mb-2">
              Selecciona {requiereColor && !color ? 'color' : ''}
              {requiereColor && !color && requiereTalla && !talla ? ' y ' : ''}
              {requiereTalla && !talla ? 'talla' : ''} para continuar.
            </p>
          )}
          {producto.disponibilidad === 'agotado' && (
            <p className="text-xs text-gray-500 text-center mb-2">Producto no disponible por ahora.</p>
          )}

          {/* Aviso de verificación */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mb-4">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>
              Los precios y la disponibilidad pueden cambiar. Verificaremos nuevamente el
              producto antes de procesar tu pedido.
            </span>
          </div>

          {(producto.source_url || producto.url_shein) && (
            <a
              href={producto.source_url || producto.url_shein}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A1A1A]"
            >
              Ver producto original <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Descripción */}
      {producto.descripcion && (
        <div className="mt-10 max-w-3xl">
          <h2 className="font-display font-bold text-[#1A1A1A] mb-2">Descripción</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{producto.descripcion}</p>
        </div>
      )}
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
