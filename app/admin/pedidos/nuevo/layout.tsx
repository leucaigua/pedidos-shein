import Link from 'next/link';

export default function NuevoPedidoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="no-print px-4 pt-6 max-w-5xl mx-auto flex flex-wrap gap-4 text-sm">
        <Link href="/admin/pedidos" className="text-gray-500 hover:underline">← Volver a pedidos</Link>
        <Link href="/admin/pedidos/cotizaciones" className="hover:underline">Cotizaciones</Link>
        <Link href="/admin/pedidos/nuevo" className="hover:underline">Hacer pedido</Link>
        <Link href="/admin/pedidos/nuevo/carrito" className="hover:underline">Ver cotización</Link>
      </div>
      {children}
    </>
  );
}
