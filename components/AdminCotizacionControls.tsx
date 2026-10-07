'use client';

import { useRouter } from 'next/navigation';
import { useAdminCotizacion } from '@/components/AdminCotizacionContext';
import { Save, Loader2 } from 'lucide-react';

export function NombreClienteCotizacion() {
  const { clienteNombre, codigo, setClienteNombre } = useAdminCotizacion();
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <label htmlFor="cotizacion-cliente" className="block text-sm font-semibold mb-2">Nombre del cliente *</label>
      <input id="cotizacion-cliente" value={clienteNombre} onChange={(event) => setClienteNombre(event.target.value)} maxLength={150} required placeholder="Nombre del cliente" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A1A]" />
      {codigo && <p className="text-xs text-gray-500 mt-2">Cotización {codigo}</p>}
    </div>
  );
}

export function GuardarCotizacion() {
  const { guardar, guardando, error, codigo, clienteNombre } = useAdminCotizacion();
  const router = useRouter();
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-2">{clienteNombre || 'Cliente sin nombre'}</p>
      {codigo && <p className="text-xs text-gray-500 mb-2">{codigo}</p>}
      <button type="button" disabled={guardando} onClick={async () => {
        try { await guardar(); router.push('/admin/pedidos/cotizaciones'); } catch { /* El error aparece debajo. */ }
      }} className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 p-3 text-sm font-semibold disabled:opacity-50 hover:bg-gray-50">
        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {guardando ? 'Guardando cotización…' : 'Guardar cotización'}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export function NuevaCotizacionButton({ label = "Nueva cotización" }: { label?: string }) {
  const { nueva, guardando, error } = useAdminCotizacion();
  const router = useRouter();
  return <div>
    <button type="button" disabled={guardando} onClick={async () => {
      try { await nueva(); router.push('/admin/pedidos/nuevo'); } catch { /* Se conserva el borrador si no se pudo guardar. */ }
    }} className="bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{label}</button>
    {error && <p role="alert" className="mt-2 text-xs text-red-600 max-w-sm">{error}</p>}
  </div>;
}
