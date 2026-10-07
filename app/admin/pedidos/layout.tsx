import { AdminCotizacionProvider } from '@/components/AdminCotizacionContext';
import { CartProvider } from '@/components/CartContext';

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider storageKey="pedidos-shein-admin-cart">
      <AdminCotizacionProvider>{children}</AdminCotizacionProvider>
    </CartProvider>
  );
}
