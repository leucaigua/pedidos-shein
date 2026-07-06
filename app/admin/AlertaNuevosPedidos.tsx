'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import { Bell, X } from 'lucide-react';

type PedidoNuevo = {
  codigo: string;
  cliente_nombre: string;
  total: number;
  created_at: string;
};

const INTERVALO_MS = 20_000; // cada 20 segundos

/**
 * Detector de pedidos nuevos para el panel admin. Sondea el backend cada pocos
 * segundos; cuando entra un pedido reproduce un sonido, muestra una notificación
 * del navegador (si el admin la permite) y un aviso en pantalla.
 */
export default function AlertaNuevosPedidos() {
  const [avisos, setAvisos] = useState<PedidoNuevo[]>([]);
  const ultimoRef = useRef<string | null>(null);
  const iniciadoRef = useRef(false);

  // Beep con Web Audio API (sin necesidad de un archivo de sonido).
  const reproducirSonido = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // El navegador puede bloquear el audio hasta que el usuario interactúe.
    }
  }, []);

  const notificarNavegador = useCallback((pedido: PedidoNuevo) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification('🛍️ Nuevo pedido', {
        body: `${pedido.cliente_nombre} · ${formatUSD(pedido.total)} · ${pedido.codigo}`,
        tag: pedido.codigo,
      });
    } catch {
      /* noop */
    }
  }, []);

  const consultar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (ultimoRef.current) params.set('desde', ultimoRef.current);

    try {
      const res = await fetch(`/api/admin/pedidos/nuevos?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const nuevos: PedidoNuevo[] = data.nuevos ?? [];

      // Primer sondeo: solo fijamos la referencia, no alertamos de lo existente.
      if (!iniciadoRef.current) {
        iniciadoRef.current = true;
        ultimoRef.current = data.ultimo ?? new Date().toISOString();
        return;
      }

      if (nuevos.length > 0) {
        ultimoRef.current = nuevos[0].created_at;
        setAvisos((prev) => [...nuevos, ...prev].slice(0, 5));
        reproducirSonido();
        nuevos.forEach(notificarNavegador);
      }
    } catch {
      /* reintentamos en el siguiente ciclo */
    }
  }, [reproducirSonido, notificarNavegador]);

  useEffect(() => {
    // Pedir permiso de notificaciones del navegador una vez.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    consultar();
    const id = setInterval(consultar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [consultar]);

  function descartar(codigo: string) {
    setAvisos((prev) => prev.filter((p) => p.codigo !== codigo));
  }

  if (avisos.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-xs">
      {avisos.map((pedido) => (
        <div
          key={pedido.codigo}
          className="bg-white border border-gray-200 shadow-lg rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2"
        >
          <span className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1A1A1A]">¡Nuevo pedido!</p>
            <p className="text-xs text-gray-600 truncate">
              {pedido.cliente_nombre} · <span className="font-mono">{pedido.codigo}</span>
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{formatUSD(pedido.total)}</p>
          </div>
          <button
            onClick={() => descartar(pedido.codigo)}
            className="text-gray-400 hover:text-[#1A1A1A] flex-shrink-0"
            aria-label="Descartar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
