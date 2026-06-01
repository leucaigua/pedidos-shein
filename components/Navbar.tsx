'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { ShoppingCart, Package, Menu, X, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { totalItems } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cuentaHref = mounted && user ? '/cuenta' : '/cuenta/login';
  const cuentaLabel = mounted && user ? 'Mi cuenta' : 'Ingresar';

  return (
    <nav className="bg-white border-b border-[#E5E5E5] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-white rounded-lg p-1 flex-shrink-0 shadow-sm">
            <Image src="/logo.png" alt="Pedidos SHEIN" width={36} height={36} className="rounded" />
          </span>
          <span className="text-2xl font-bold font-display text-[#1A1A1A]">
            Pedidos<span className="text-[#737373]">SHEIN</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/catalogo" className="text-sm font-medium text-[#737373] hover:text-[#1A1A1A] transition-colors">
            Catálogo
          </Link>
          <Link href="/pedir" className="text-sm font-medium text-[#737373] hover:text-[#1A1A1A] transition-colors">
            Hacer pedido
          </Link>
          <Link href="/mis-pedidos" className="text-sm font-medium text-[#737373] hover:text-[#1A1A1A] transition-colors">
            Rastrear
          </Link>
        </div>

        {/* Cuenta + Cart + mobile toggle */}
        <div className="flex items-center gap-1">
          <Link
            href={cuentaHref}
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[#737373] hover:text-[#1A1A1A] transition-colors px-3 py-2"
          >
            <UserIcon className="w-5 h-5" />
            {cuentaLabel}
          </Link>
          <Link href="/carrito" className="relative p-2">
            <ShoppingCart className="w-6 h-6 text-[#1A1A1A]" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            className="md:hidden p-2 text-[#1A1A1A]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#E5E5E5] px-4 py-4 flex flex-col gap-4">
          <Link href="/catalogo" className="text-sm font-medium text-[#3D3D3D]" onClick={() => setMenuOpen(false)}>
            Catálogo
          </Link>
          <Link href="/pedir" className="text-sm font-medium text-[#3D3D3D]" onClick={() => setMenuOpen(false)}>
            Hacer pedido
          </Link>
          <Link href="/mis-pedidos" className="flex items-center gap-2 text-sm font-medium text-[#3D3D3D]" onClick={() => setMenuOpen(false)}>
            <Package className="w-4 h-4" /> Rastrear pedido
          </Link>
          <Link href={cuentaHref} className="flex items-center gap-2 text-sm font-medium text-[#3D3D3D]" onClick={() => setMenuOpen(false)}>
            <UserIcon className="w-4 h-4" /> {cuentaLabel}
          </Link>
        </div>
      )}
    </nav>
  );
}
