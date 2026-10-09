import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { CatalogoProvider } from "@/components/CatalogoContext";
import CookieConsent from "@/components/CookieConsent";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://www.pedidosshein.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Pedidos SHEIN Venezuela — Compra desde USA con envío aéreo",
  description: "Trae lo que quieras de SHEIN directo a tus manos en Venezuela. Envío aéreo rápido con ZOOM Casilleros. Paga en Bs, o Binance.",
  keywords: "comprar SHEIN Venezuela, SHEIN envío Venezuela, compras USA Venezuela, ZOOM casilleros Venezuela",
  openGraph: {
    title: "Pedidos SHEIN Venezuela",
    description: "Trae lo que quieras de SHEIN directo a Venezuela. Envío aéreo rápido.",
    type: "website",
    siteName: "Pedidos SHEIN Venezuela",
    locale: "es_VE",
    images: [
      {
        url: "/Pedidos-Shein-Thumbnail.jpg",
        width: 1731,
        height: 909,
        alt: "Pedidos SHEIN Venezuela",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pedidos SHEIN Venezuela",
    description: "Trae lo que quieras de SHEIN directo a Venezuela. Envío aéreo rápido.",
    images: ["/Pedidos-Shein-Thumbnail.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#212121]">
        {/* Inicializa el consentimiento antes de arrancar GTM y Analytics.
            afterInteractive evita renderizar un script nativo durante la hidratación. */}
        <Script id="analytics-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
window.gtag = function(){window.dataLayer.push(arguments);};
window.gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied'
});
try {
  var savedConsent = localStorage.getItem('cookie-consent');
  if (savedConsent === 'granted' || savedConsent === 'denied') {
    window.gtag('consent', 'update', {
      ad_storage: savedConsent,
      ad_user_data: savedConsent,
      ad_personalization: savedConsent,
      analytics_storage: savedConsent
    });
  }
} catch (_) {}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TZ98S373');
window.gtag('js', new Date());
window.gtag('config', 'G-6MQGZ8M9VV');`}
        </Script>
        <Script
          id="gtag-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-6MQGZ8M9VV"
          strategy="afterInteractive"
        />
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TZ98S373"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AuthProvider>
          <CatalogoProvider>
            <CartProvider>{children}</CartProvider>
          </CatalogoProvider>
        </AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
