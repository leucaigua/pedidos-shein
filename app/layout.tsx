import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { CatalogoProvider } from "@/components/CatalogoContext";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Pedidos SHEIN Venezuela — Compra desde USA con envío aéreo",
  description: "Trae lo que quieras de SHEIN directo a tus manos en Venezuela. Envío aéreo rápido con ZOOM Casilleros. Paga en Bs, Zelle o Binance.",
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
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TZ98S373');`}
        </Script>
        {/* End Google Tag Manager */}
        {/* Google tag (gtag.js) */}
        <Script
          id="gtag-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-6MQGZ8M9VV"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-6MQGZ8M9VV');`}
        </Script>
        {/* End Google tag (gtag.js) */}
      </head>
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#212121]">
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
      </body>
    </html>
  );
}
