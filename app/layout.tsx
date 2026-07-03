import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { CatalogoProvider } from "@/components/CatalogoContext";

export const metadata: Metadata = {
  title: "Pedidos SHEIN Venezuela — Compra desde USA con envío aéreo",
  description: "Trae lo que quieras de SHEIN directo a tus manos en Venezuela. Envío aéreo rápido con ZOOM Casilleros. Paga en Bs, Zelle o Binance.",
  keywords: "comprar SHEIN Venezuela, SHEIN envío Venezuela, compras USA Venezuela, ZOOM casilleros Venezuela",
  openGraph: {
    title: "Pedidos SHEIN Venezuela",
    description: "Trae lo que quieras de SHEIN directo a Venezuela. Envío aéreo rápido.",
    type: "website",
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
        <AuthProvider>
          <CatalogoProvider>
            <CartProvider>{children}</CartProvider>
          </CatalogoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
