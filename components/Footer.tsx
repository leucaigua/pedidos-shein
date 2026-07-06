'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, AtSign, Mail } from 'lucide-react';
import NewsletterForm from './NewsletterForm';
import { useCatalogo } from './CatalogoContext';

export default function Footer() {
  const { hayCatalogo } = useCatalogo();

  return (
    <footer className="bg-[#1A1A1A] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="bg-white rounded-lg p-1 flex-shrink-0">
              <Image src="/logo.png" alt="Pedidos SHEIN" width={36} height={36} className="rounded" />
            </span>
            <p className="text-2xl font-bold font-display">
              Pedidos<span className="text-[#888888]">SHEIN</span>
            </p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Traemos tus productos favoritos de SHEIN directo a Venezuela con
            envío aéreo rápido.
          </p>
        </div>

        {/* Links */}
        <div>
          <p className="font-semibold mb-3 text-gray-300 text-sm uppercase tracking-wide">Navegación</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
            {hayCatalogo && (
              <li><Link href="/catalogo" className="hover:text-white transition-colors">Catálogo</Link></li>
            )}
            <li><Link href="/pedir" className="hover:text-white transition-colors">Hacer pedido</Link></li>
            <li><Link href="/mis-pedidos" className="hover:text-white transition-colors">Seguimiento de pedido</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="font-semibold mb-3 text-gray-300 text-sm uppercase tracking-wide">Contacto</p>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              <span>@shein.maturin</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>info@pedidosshein.com</span>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <NewsletterForm />
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Pedidos SHEIN Venezuela. Servicio de compras por encargo.
      </div>
    </footer>
  );
}
