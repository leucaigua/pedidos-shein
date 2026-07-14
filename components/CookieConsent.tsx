'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie-consent';

type Consent = 'granted' | 'denied';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function aplicarConsentimiento(estado: Consent) {
  window.gtag?.('consent', 'update', {
    analytics_storage: estado,
    ad_storage: estado,
    ad_user_data: estado,
    ad_personalization: estado,
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage no disponible (modo privado, etc.)
    }
    if (guardado === 'granted' || guardado === 'denied') {
      aplicarConsentimiento(guardado);
    } else {
      setVisible(true);
    }
  }, []);

  function decidir(estado: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, estado);
    } catch {
      // Ignorar si no se puede persistir
    }
    aplicarConsentimiento(estado);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#1A1A1A] text-white shadow-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-[#FFD700]" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-gray-300 leading-relaxed">
              Usamos cookies esenciales para que el sitio funcione y cookies de analítica para
              mejorar tu experiencia. Puedes aceptarlas o rechazar las de analítica. Más detalles
              en nuestra{' '}
              <Link href="/cookies" className="text-white underline font-medium">
                Política de Cookies
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => decidir('granted')}
                className="order-1 sm:order-2 bg-white text-[#1A1A1A] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Aceptar todas
              </button>
              <button
                onClick={() => decidir('denied')}
                className="order-2 sm:order-1 border border-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                Solo esenciales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
