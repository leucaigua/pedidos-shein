'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useOptionalAdminCotizacion } from '@/components/AdminCotizacionContext';
import { GuardarCotizacion, NombreClienteCotizacion } from '@/components/AdminCotizacionControls';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import CarritoPrintable from '@/components/CarritoPrintable';
import { calcularDesgloseCarrito, calcularAbono, calcularRestante, formatUSD } from '@/lib/calculations';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package, Sparkles, Clock, Printer } from 'lucide-react';

export default function CarritoView({ admin = false }: { admin?: boolean }) {
  const cotizacion = useOptionalAdminCotizacion();
  const { items, removeItem, updateQty, totalItems } = useCart();
  const desglose = calcularDesgloseCarrito(items, admin ? cotizacion?.config?.comision_pct : undefined, admin ? cotizacion?.config?.proteccion_activa : undefined);
  const pagarCompleto = false;
  const abono = pagarCompleto ? desglose.total : calcularAbono(desglose.total);
  const restante = pagarCompleto ? 0 : calcularRestante(desglose.total);

  // Abre el diálogo de impresión del navegador; desde ahí se guarda como PDF.
  function descargarPDF() {
    window.print();
  }

  if (totalItems === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        {!admin && <Navbar />}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-2">
            {admin ? "Tu cotización está vacía" : "Tu carrito está vacío"}
          </h2>
          <p className="text-gray-500 mb-6">Agrega productos para continuar.</p>
          <div className="flex gap-3">
            <Link
              href={admin ? "/admin/pedidos/nuevo" : "/pedir"}
              className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3D3D3D] transition-colors"
            >
              Hacer un pedido
            </Link>
            <Link
              href="/catalogo"
              className="border border-[#1A1A1A] text-[#1A1A1A] px-6 py-3 rounded-xl font-semibold hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              Ver catálogo
            </Link>
          </div>
        </main>
        {!admin && <Footer />}
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-screen no-print">
      {!admin && <Navbar />}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl font-display font-bold text-[#1A1A1A]">
            {admin ? "Cotización" : "Carrito"} ({totalItems} artículo{totalItems !== 1 ? 's' : ''})
          </h1>
          {admin && <button
            onClick={descargarPDF}
            className="inline-flex items-center gap-2 border border-gray-200 text-[#1A1A1A] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Descargar PDF
          </button>}
        </div>

        {admin && <NombreClienteCotizacion />}

        {/* Aviso de vigencia del carrito */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-0.5">{admin ? "Tu cotización tiene una vigencia de 24 horas" : "Tu carrito tiene una vigencia de 24 horas"}</p>
            <p className="text-amber-800">
              Debido a las fluctuaciones de inventario dentro de la plataforma de SHEIN,
              los precios y la disponibilidad pueden cambiar. Actualiza tu {admin ? "cotización" : "carrito"} cada 24 horas
              para confirmar los productos antes de procesar tu pedido.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de artículos */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4"
              >
                {/* Imagen */}
                <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                  {item.imagen ? (
                    <Image
                      src={item.imagen}
                      alt={item.nombre}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#212121] text-sm line-clamp-2 mb-1">
                    {item.nombre}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                    {item.talla && <span>Talla: <span className="text-gray-600">{item.talla}</span></span>}
                    {item.color && <span>Color: <span className="text-gray-600">{item.color}</span></span>}
                    <span>Peso: <span className="text-gray-600">{item.peso_kg} kg/u</span></span>
                  </div>
                  {item.url_shein && (
                    <a
                      href={item.url_shein}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1A1A1A] hover:underline"
                    >
                      Ver producto original →
                    </a>
                  )}
                </div>

                {/* Precio y controles */}
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-[#1A1A1A] font-bold text-right mb-2">
                      {formatUSD(item.precio_usd * item.cantidad)}
                    </p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                      <button
                        onClick={() => item.cantidad > 1 && updateQty(item.id, item.cantidad - 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#1A1A1A] disabled:opacity-30"
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                      <button
                        onClick={() => updateQty(item.id, item.cantidad + 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#1A1A1A]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href={admin ? "/admin/pedidos/nuevo" : "/pedir"}
              className="inline-flex items-center gap-2 text-sm text-[#1A1A1A] hover:underline"
            >
              + Agregar otro producto
            </Link>
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-display font-bold text-[#1A1A1A] text-lg mb-5">
                Resumen del pedido
              </h2>
              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal productos</span>
                  <span>{formatUSD(desglose.producto)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Flete ZOOM</span>
                  <span>{formatUSD(desglose.envio)}</span>
                </div>
                {desglose.proteccion > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Seguro {desglose.producto <= 100 ? '($1.20)' : '(1%)'}</span>
                    <span>{formatUSD(desglose.proteccion)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Comisión ({admin ? cotizacion?.config?.comision_pct ?? 10 : 10}%)</span>
                  <span>{formatUSD(desglose.comision)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                  <span className="text-[#1A1A1A]">Total del pedido</span>
                  <span className="text-[#1A1A1A] text-lg">{formatUSD(desglose.total)}</span>
                </div>
              </div>

              {admin && <GuardarCotizacion />}

              {/* Desglose de pago */}
              <div className="bg-[#1A1A1A] text-white rounded-xl p-4 mb-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {pagarCompleto ? "Paga el total hoy" : "Paga hoy solo el 60%"}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-1">
                  <span className="text-sm text-gray-300">{pagarCompleto ? "Pagas hoy (100%)" : "Abonas hoy (60%)"}</span>
                  <span className="text-2xl font-display font-bold">{formatUSD(abono)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400 pt-2 border-t border-white/10">
                  <span>{pagarCompleto ? "Saldo al retirar" : "Restante al retirar (40%)"}</span>
                  <span>{formatUSD(restante)}</span>
                </div>
              </div>

              <Link
                href={admin ? "/admin/pedidos/nuevo/checkout" : "/checkout"}
                className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {pagarCompleto ? "Pagar total y procesar" : "Pagar 60% y procesar"}
                <ArrowRight className="w-4 h-4" />
              </Link>

              {admin && <button
                onClick={descargarPDF}
                className="w-full mt-3 border border-gray-200 text-[#1A1A1A] font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Descargar cotización en PDF
              </button>}

              <p className="text-xs text-gray-400 text-center mt-3">
                {pagarCompleto ? "Pagas el 100% para procesar tu pedido. Sin saldo pendiente al retirar." : "Abonas el 60% para procesar tu pedido. El 40% restante lo pagas al retirarlo."}
              </p>
            </div>
          </div>
        </div>
      </main>
      {!admin && <Footer />}
    </div>

    {/* Documento que se imprime (oculto en pantalla). */}
    {admin && <CarritoPrintable
      admin={admin}
      codigo={cotizacion?.codigo}
      clienteNombre={cotizacion?.clienteNombre}
      pagoTotal={pagarCompleto}
      items={items}
      desglose={desglose}
      abono={abono}
      restante={restante}
      totalItems={totalItems}
    />}
    </>
  );
}
