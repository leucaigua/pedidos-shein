'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ItemCarrito, Pedido } from '@/types';

export default function PedidoProductoCheck({ pedidoId, item, index, onSaved }: {
  pedidoId: string;
  item: ItemCarrito;
  index: number;
  onSaved: (pedido: Pedido) => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function verificar(checked: boolean) {
    if (guardando) return;
    setGuardando(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró.');
      const res = await fetch(`/api/admin/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ item_index: index, item_id: item.id, verificado_shein: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la verificación');
      onSaved(data.pedido);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
    finally { setGuardando(false); }
  }

  return <span className="inline-flex flex-col items-start gap-1 shrink-0">
    <span className="inline-flex items-center gap-1">
      <input type="checkbox" checked={item.verificado_shein === true} disabled={guardando} onChange={(e) => verificar(e.target.checked)} aria-label={`Verificar ${item.nombre}, ${[item.talla, item.color].filter(Boolean).join(', ')}, cantidad ${item.cantidad}`} title="Producto verificado en el carrito" className="h-5 w-5 accent-green-600 cursor-pointer disabled:cursor-wait" />
      {guardando && <Loader2 className="h-3 w-3 animate-spin" aria-label="Guardando" />}
    </span>
    {error && <span role="alert" className="max-w-48 text-xs text-red-600">{error}</span>}
  </span>;
}
