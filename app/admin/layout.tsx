'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AlertaNuevosPedidos from './AlertaNuevosPedidos';
import {
  Package,
  BookOpen,
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Loader2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: Package },
  { href: '/admin/catalogo', label: 'Catálogo', icon: BookOpen },
  { href: '/admin/suscriptores', label: 'Suscriptores', icon: Mail },
  { href: '/admin/config', label: 'Configuración', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [verificando, setVerificando] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      // Verificar que el usuario tenga rol 'admin'
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .maybeSingle();
      if (perfil?.rol !== 'admin') {
        router.replace('/');
        return;
      }
      setVerificando(false);
    });
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-[#1A1A1A] text-white fixed inset-y-0 left-0 z-30">
        <div className="p-5 border-b border-white/10">
          <p className="text-xl font-display font-bold">
            Pedidos<span className="text-[#888888]">SHEIN</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Panel admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-[#1A1A1A] text-white flex items-center justify-between px-4 py-3">
        <p className="text-lg font-display font-bold">
          Pedidos<span className="text-[#888888]">SHEIN</span>
        </p>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#1A1A1A] pt-16">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            <button
              onClick={cerrarSesion}
              className="flex items-center gap-3 px-3 py-3 text-gray-400 hover:text-white text-sm w-full"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 pt-0 md:pt-0">
        <div className="pt-14 md:pt-0">{children}</div>
      </div>

      {/* Alerta de pedidos nuevos (sonido + notificación) */}
      <AlertaNuevosPedidos />
    </div>
  );
}
