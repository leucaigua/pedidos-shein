'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ItemCarrito, DesglosePrecio } from '@/types';
import { formatUSD } from '@/lib/calculations';

interface Props {
  admin?: boolean;
  codigo?: string;
  clienteNombre?: string;
  pagoTotal?: boolean;
  items: ItemCarrito[];
  desglose: DesglosePrecio;
  abono: number;
  restante: number;
  totalItems: number;
}

/**
 * Documento imprimible del carrito (solo visible en `@media print`).
 * El usuario lo genera desde el botón "Descargar PDF" del carrito: el diálogo
 * nativo del navegador permite guardarlo como PDF sin dependencias extra.
 */
export default function CarritoPrintable({ items, desglose, abono, restante, totalItems, admin = false, pagoTotal = false, codigo, clienteNombre }: Props) {
  // La fecha se calcula en el cliente (evita desajustes de hidratación) y se
  // refresca justo antes de imprimir para que el PDF lleve la hora real.
  const [sello, setSello] = useState({ fecha: '', hora: '' });

  useEffect(() => {
    function actualizar() {
      const ahora = new Date();
      setSello({
        fecha: ahora.toLocaleDateString('es-VE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        hora: ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    actualizar();
    window.addEventListener('beforeprint', actualizar);
    return () => window.removeEventListener('beforeprint', actualizar);
  }, []);

  const { fecha, hora } = sello;

  return (
    <div className="solo-print text-[#1A1A1A]">
      {/* Encabezado */}
      <header className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Pedidos SHEIN" width={44} height={44} className="rounded" />
          <div>
            <p className="font-display font-bold text-xl leading-tight">Pedidos SHEIN</p>
            <p className="text-xs text-gray-500">Venezuela · Compras por encargo</p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <p className="font-display font-bold text-base text-[#1A1A1A]">{admin ? "Cotización" : "Resumen de carrito"}</p>
          {admin && codigo && <p className="font-semibold">{codigo}</p>}
          {admin && clienteNombre && <p>Cliente: {clienteNombre}</p>}
          <p>{fecha} · {hora}</p>
          <p>{totalItems} artículo{totalItems !== 1 ? 's' : ''}</p>
        </div>
      </header>

      {/* Artículos */}
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="border-b border-gray-300 text-left text-[10px] uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-2 font-semibold w-8">#</th>
            <th className="py-2 pr-2 font-semibold">Producto</th>
            <th className="py-2 px-2 font-semibold text-center w-12">Cant.</th>
            <th className="py-2 px-2 font-semibold text-right w-20">P. unit.</th>
            <th className="py-2 pl-2 font-semibold text-right w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b border-gray-200 evitar-corte align-top">
              <td className="py-2.5 pr-2 text-gray-400">{i + 1}</td>
              <td className="py-2.5 pr-2">
                <p className="font-medium leading-snug">{item.nombre}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {item.talla && <span>Talla: {item.talla} · </span>}
                  {item.color && <span>Color: {item.color} · </span>}
                  <span>Peso: {item.peso_kg} kg/u</span>
                </p>
                {item.url_shein && (
                  <p className="text-[9px] text-gray-400 mt-0.5 break-all">{item.url_shein}</p>
                )}
              </td>
              <td className="py-2.5 px-2 text-center">{item.cantidad}</td>
              <td className="py-2.5 px-2 text-right">{formatUSD(item.precio_usd)}</td>
              <td className="py-2.5 pl-2 text-right font-semibold">
                {formatUSD(item.precio_usd * item.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end evitar-corte">
        <div className="w-72 text-xs">
          <div className="flex justify-between py-1 text-gray-600">
            <span>Subtotal productos</span>
            <span>{formatUSD(desglose.producto)}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600">
            <span>Flete ZOOM</span>
            <span>{formatUSD(desglose.envio)}</span>
          </div>
          {desglose.proteccion > 0 && (
            <div className="flex justify-between py-1 text-gray-600">
              <span>Seguro {desglose.producto <= 100 ? '($1.20)' : '(1%)'}</span>
              <span>{formatUSD(desglose.proteccion)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 text-gray-600">
            <span>{admin ? "Comisión" : "Comisión (10%)"}</span>
            <span>{formatUSD(desglose.comision)}</span>
          </div>
          <div className="flex justify-between py-2 mt-1 border-t-2 border-[#1A1A1A] font-display font-bold text-sm">
            <span>Total del pedido</span>
            <span>{formatUSD(desglose.total)}</span>
          </div>

          <div className="mt-3 border border-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] text-white">
              <span className="font-semibold">{admin && pagoTotal ? "Pagas hoy (100%)" : "Abonas hoy (60%)"}</span>
              <span className="font-display font-bold">{formatUSD(abono)}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-gray-600">
              <span>{admin && pagoTotal ? "Saldo al retirar" : "Restante al retirar (40%)"}</span>
              <span>{formatUSD(restante)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie */}
      <footer className="mt-8 pt-4 border-t border-gray-300 text-[10px] leading-relaxed text-gray-500 evitar-corte">
        <p className="font-semibold text-gray-700 mb-1">
          {admin ? "Este documento es una cotización, no una factura ni un pedido confirmado." : "Este documento es un resumen de carrito, no una factura ni un pedido confirmado."}
        </p>
        <p>
          Los precios y la disponibilidad tienen una vigencia de 24 horas por las fluctuaciones de
          inventario de SHEIN. {admin && pagoTotal
            ? "Para procesar el pedido debes pagar el 100% del total. Sin saldo pendiente al retirar."
            : "Para procesar el pedido debes abonar el 60% del total; el 40% restante se paga al retirarlo."}
        </p>
        <p className="mt-1">Generado en pedidos-shein · {fecha} {hora}</p>
      </footer>
    </div>
  );
}
