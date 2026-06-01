'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthContext';
import { useCart } from '@/components/CartContext';
import { supabase } from '@/lib/supabase';
import { estadoLabel, estadoEmoji, estadoColor } from '@/lib/utils';
import { formatUSD } from '@/lib/calculations';
import type { Pedido } from '@/types';
import {
  Loader2, Package, LogOut, RefreshCw, ShoppingCart, User as UserIcon, ChevronRight,
} from 'lucide-react';

export default function CuentaPage() {
  const router = useRouter();
  const { user, perfil, loading, cerrarSesion } = useAuth();
  const { addItem } = useCart();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [reordenado, setReordenado] = useState<string | null>(null);

  // Redirigir si no hay sesión
  useEffect(() => {
    if (!loading && !user) router.replace('/cuenta/login');
  }, [loading, user, router]);

  const cargarPedidos = useCallback(async () => {
    setCargandoPedidos(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/mis-pedidos', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setPedidos(data.pedidos ?? []);
    } catch {
      setPedidos([]);
    } finally {
      setCargandoPedidos(false);
    }
  }, []);

  useEffect(() => {
    if (user) cargarPedidos();
  }, [user, cargarPedidos]);

  function volverAPedir(pedido: Pedido) {
    (pedido.items ?? []).forEach((item) => {
      addItem({
        nombre: item.nombre,
        url_shein: item.url_shein,
        imagen: item.imagen,
        precio_usd: item.precio_usd,
        talla: item.talla,
        color: item.color,
        cantidad: item.cantidad,
        peso_kg: item.peso_kg,
      });
    });
    setReordenado(pedido.id);
    setTimeout(() => router.push('/carrito'), 600);
  }

  async function salir() {
    await cerrarSesion();
    router.push('/');
  }

  if (loading || (!user && !loading)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {/* Encabezado de perfil */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-[#1A1A1A]">
                Hola{perfil?.nombre ? `, ${perfil.nombre.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-gray-500">{perfil?.email ?? user?.email}</p>
            </div>
          </div>
          <button
            onClick={salir}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Historial de pedidos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-[#1A1A1A]">Mis pedidos</h2>
          <button
            onClick={cargarPedidos}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {cargandoPedidos ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Package className="w-12 h-12 mb-3" />
            <p className="font-medium">Aún no tienes pedidos</p>
            <p className="text-sm mt-1 mb-4">Haz tu primer pedido y aparecerá aquí.</p>
            <Link href="/pedir" className="bg-[#1A1A1A] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3D3D3D] transition-colors">
              Hacer un pedido
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                {/* Header del pedido */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-[#1A1A1A]">{pedido.codigo}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(pedido.created_at).toLocaleDateString('es-VE', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoColor(pedido.estado)}`}>
                    {estadoEmoji(pedido.estado)} {estadoLabel(pedido.estado)}
                  </span>
                </div>

                {/* Artículos resumidos */}
                <div className="space-y-1 mb-3">
                  {(pedido.items ?? []).slice(0, 3).map((item, i) => (
                    <p key={i} className="text-sm text-gray-600 truncate">
                      • {item.nombre} <span className="text-gray-400">×{item.cantidad}</span>
                    </p>
                  ))}
                  {(pedido.items?.length ?? 0) > 3 && (
                    <p className="text-xs text-gray-400">+{pedido.items.length - 3} artículo(s) más</p>
                  )}
                </div>

                {/* Footer del pedido */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="font-bold text-[#1A1A1A]">{formatUSD(pedido.total)}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/mis-pedidos?codigo=${pedido.codigo}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1A1A1A] transition-colors px-3 py-2"
                    >
                      Ver estado <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => volverAPedir(pedido)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                        reordenado === pedido.id
                          ? 'bg-green-500 text-white'
                          : 'bg-[#1A1A1A] text-white hover:bg-[#3D3D3D]'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {reordenado === pedido.id ? 'Agregado!' : 'Volver a pedir'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
