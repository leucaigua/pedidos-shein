'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminCotizacion } from '@/components/AdminCotizacionContext';
import { imprimirCotizacion } from '@/lib/printCotizacion';
import CarritoPrintable from '@/components/CarritoPrintable';
import { calcularAbono, calcularRestante, formatUSD } from '@/lib/calculations';
import type { Cotizacion, DesglosePrecio } from '@/types';

const labels = { aprobada: 'Aprobada', pendiente_aprobacion: 'Pendiente de aprobación', no_procesada: 'No procesada' };
export default function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [error, setError] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [verificando, setVerificando] = useState<string | null>(null);
  const { abrir } = useAdminCotizacion();
  const router = useRouter();
  async function verificarProducto(itemId: string, checked: boolean) {
    if (verificando) return;
    setVerificando(itemId);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró.');
      const res = await fetch(`/api/admin/cotizaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ item_id: itemId, verificado_shein: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la verificación');
      setQuote(data.cotizacion);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
    finally { setVerificando(null); }
  }
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Tu sesión expiró.');
        const res = await fetch(`/api/admin/cotizaciones/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (active) setQuote(data.cotizacion);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Error de conexión'); }
    }
    load();
    return () => { active = false; };
  }, [id]);
  if (!quote) return <div className="p-6"><Link href="/admin/pedidos/cotizaciones">← Cotizaciones</Link>{error ? <p role="alert" className="text-red-600 mt-4">{error}</p> : <Loader2 className="animate-spin mx-auto my-12" />}</div>;
  const d: DesglosePrecio = { producto: quote.subtotal, envio: quote.costo_envio, proteccion: quote.costo_proteccion, comision: quote.comision, total: quote.total };
  const peso = quote.items.reduce((sum, item) => sum + item.peso_kg * item.cantidad, 0);
  const cantidad = quote.items.reduce((sum, item) => sum + item.cantidad, 0);
  return <>
    <div className="p-6 max-w-5xl mx-auto no-print">
      <Link href="/admin/pedidos/cotizaciones" className="text-sm text-gray-500 hover:underline">← Cotizaciones</Link>
      <div className="flex flex-wrap items-center justify-between gap-4 my-6">
        <div><h1 className="text-2xl font-bold">{quote.codigo}</h1><p className="text-gray-500 mt-1">{quote.cliente_nombre} · {labels[quote.estado]}{quote.archivado ? ' · Archivada' : ''}</p></div>
        <div className="flex gap-3"><button onClick={imprimirCotizacion} className="border rounded-xl px-4 py-2 text-sm">Descargar PDF</button>{!quote.archivado && quote.estado !== 'no_procesada' && <button disabled={abriendo} onClick={async () => {
          setAbriendo(true);
          try { await abrir(quote); router.push('/admin/pedidos/nuevo/carrito'); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir'); } finally { setAbriendo(false); }
        }} className="bg-[#1A1A1A] text-white rounded-xl px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"><Pencil className="w-4 h-4" />Editar cotización</button>}</div>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      <p className="mb-3 text-sm text-gray-500">Verificados en el carrito de SHEIN: {quote.items.filter((item) => item.verificado_shein).length} de {quote.items.length} productos. Marca cada producto después de comprobar su talla, color y cantidad.</p>
      <div className="rounded-xl border bg-white overflow-x-auto mb-6"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr>{['Producto', 'Cantidad', 'Peso por unidad', 'Precio', 'Total'].map((h) => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{quote.items.map((item) => <tr key={item.id} className="border-t"><td className="p-3">
                <div className="flex items-center gap-3 min-w-56">
                  <label className="flex flex-col items-center gap-1 shrink-0 text-xs text-gray-500">
                    <input type="checkbox" checked={item.verificado_shein === true} disabled={verificando !== null} onChange={(e) => verificarProducto(item.id, e.target.checked)} aria-label={`Verificado en el carrito de SHEIN: ${item.nombre}, ${[item.talla, item.color].filter(Boolean).join(', ')}, cantidad ${item.cantidad}`} className="h-5 w-5 accent-green-600 cursor-pointer disabled:cursor-wait" />
                    {verificando === item.id && <Loader2 className="h-3 w-3 animate-spin" aria-label="Guardando" />}
                  </label>
                  <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-50">
                    {item.imagen ? (
                      <Image src={item.imagen} alt={item.nombre} fill sizes="80px" className="object-contain" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full"><Package className="w-6 h-6 text-gray-300" aria-label="Sin imagen" /></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-xs text-gray-500">{[item.talla, item.color].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              </td><td className="p-3">{item.cantidad}</td><td className="p-3">{item.peso_kg} kg</td><td className="p-3">{formatUSD(item.precio_usd)}</td><td className="p-3">{formatUSD(item.precio_usd * item.cantidad)}</td></tr>)}</tbody></table></div>
      <div className="bg-white border rounded-xl p-5 max-w-sm ml-auto space-y-3 text-sm">
        <p className="flex justify-between"><span>Subtotal</span><span>{formatUSD(d.producto)}</span></p>
        <div className="flex justify-between"><div>Flete ZOOM<p className="text-xs text-gray-500">Peso total estimado: {peso.toFixed(2)} kg</p></div><span>{formatUSD(d.envio)}</span></div>
        <p className="flex justify-between"><span>Seguro</span><span>{formatUSD(d.proteccion)}</span></p><p className="flex justify-between"><span>Comisión</span><span>{formatUSD(d.comision)}</span></p>
        <p className="flex justify-between font-bold border-t pt-3"><span>Total</span><span>{formatUSD(d.total)}</span></p>
        <p className="flex justify-between"><span>{quote.pago_total ? 'Pago total (100%)' : 'Abono (60%)'}</span><span>{formatUSD(quote.pago_total ? d.total : calcularAbono(d.total))}</span></p><p className="flex justify-between text-gray-500"><span>Saldo al retirar</span><span>{formatUSD(quote.pago_total ? 0 : calcularRestante(d.total))}</span></p>
      </div>
    </div>
    <CarritoPrintable admin codigo={quote.codigo} clienteNombre={quote.cliente_nombre} items={quote.items} desglose={d} abono={quote.pago_total ? d.total : calcularAbono(d.total)} restante={quote.pago_total ? 0 : calcularRestante(d.total)} totalItems={cantidad} pagoTotal={quote.pago_total} />
  </>;
}
