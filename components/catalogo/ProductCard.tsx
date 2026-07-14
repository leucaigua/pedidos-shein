'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingCart, Check } from 'lucide-react';
import { formatUSD } from '@/lib/calculations';
import type { ProductoCatalogo } from '@/types';

const DISPONIBILIDAD: Record<string, { texto: string; clase: string } | undefined> = {
  disponible: { texto: 'Disponible', clase: 'bg-green-50 text-green-700' },
  pocas: { texto: 'Pocas unidades', clase: 'bg-amber-50 text-amber-700' },
  agotado: { texto: 'No disponible', clase: 'bg-gray-100 text-gray-500' },
};

export default function ProductCard({
  producto,
  onAgregar,
  agregado,
}: {
  producto: ProductoCatalogo;
  onAgregar: (p: ProductoCatalogo) => void;
  agregado?: boolean;
}) {
  const href = `/catalogo/${producto.slug ?? producto.id}`;
  const tieneVariantes = (producto.variantes?.length ?? 0) > 0;
  const agotado = producto.disponibilidad === 'agotado';
  const descuento =
    producto.precio_anterior_usd && producto.precio_anterior_usd > producto.precio_usd
      ? Math.round((1 - producto.precio_usd / producto.precio_anterior_usd) * 100)
      : 0;
  const dispo = producto.disponibilidad ? DISPONIBILIDAD[producto.disponibilidad] : undefined;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={href} className="relative block h-48 sm:h-56 bg-gray-50">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {descuento > 0 && (
          <span className="absolute top-2 left-2 bg-[#1A1A1A] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{descuento}%
          </span>
        )}
        {producto.categoria && (
          <span className="absolute top-2 right-2 bg-white/90 text-[#1A1A1A] text-[11px] font-medium px-2 py-0.5 rounded-full">
            {producto.categoria}
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link
          href={href}
          className="text-sm font-medium text-[#212121] line-clamp-2 mb-2 hover:text-[#1A1A1A] min-h-[2.5rem]"
        >
          {producto.nombre}
        </Link>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-lg font-bold text-[#1A1A1A]">{formatUSD(producto.precio_usd)}</span>
          {descuento > 0 && (
            <span className="text-xs text-gray-400 line-through">
              {formatUSD(producto.precio_anterior_usd!)}
            </span>
          )}
        </div>

        {dispo && (
          <span className={`self-start text-[11px] font-medium px-2 py-0.5 rounded-full mb-3 ${dispo.clase}`}>
            {dispo.texto}
          </span>
        )}

        <div className="mt-auto flex gap-2">
          <Link
            href={href}
            className="flex-1 text-center text-xs border border-[#1A1A1A] text-[#1A1A1A] py-2 rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors font-medium"
          >
            Ver producto
          </Link>
          {/* "Agregar" directo solo para productos SIN variantes y que no vienen
              de AliExpress (los de AliExpress cargan talla/color al abrir el detalle). */}
          {!tieneVariantes && !agotado && producto.source !== 'aliexpress' && (
            <button
              onClick={() => onAgregar(producto)}
              aria-label="Agregar al carrito"
              className={`p-2 rounded-lg transition-colors ${
                agregado ? 'bg-green-500 text-white' : 'bg-[#1A1A1A] text-white hover:bg-[#3D3D3D]'
              }`}
            >
              {agregado ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
