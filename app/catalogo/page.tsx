'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { formatUSD } from '@/lib/calculations';
import type { ProductoCatalogo } from '@/types';
import { ShoppingCart, Search, Loader2, Package, Sparkles, Clock, Bell } from 'lucide-react';

const CATEGORIAS = ['Todas', 'Ropa', 'Zapatos', 'Accesorios', 'Hogar', 'Belleza'];

export default function CatalogoPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [agregados, setAgregados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/catalogo')
      .then((r) => r.json())
      .then((d) => setProductos(d.productos ?? []))
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = productos.filter((p) => {
    const matchCat = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
    const matchBusq =
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBusq;
  });

  function pedirDesde(producto: ProductoCatalogo) {
    router.push(`/pedir?url=${encodeURIComponent(producto.url_shein || '')}&nombre=${encodeURIComponent(producto.nombre)}&precio=${producto.precio_usd}&imagen=${encodeURIComponent(producto.imagen_url || '')}&peso=${producto.peso_estimado_kg}`);
  }

  function agregarDirecto(producto: ProductoCatalogo) {
    addItem({
      nombre: producto.nombre,
      url_shein: producto.url_shein || '',
      imagen: producto.imagen_url || '',
      precio_usd: producto.precio_usd,
      talla: '',
      color: '',
      cantidad: 1,
      peso_kg: producto.peso_estimado_kg,
    });
    setAgregados((prev) => ({ ...prev, [producto.id]: true }));
    setTimeout(() => setAgregados((prev) => ({ ...prev, [producto.id]: false })), 2000);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2">Catálogo</h1>
        <p className="text-gray-500 mb-6">Productos populares seleccionados por nuestro equipo.</p>

        {/* Aviso: próximamente */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-[#1A1A1A] to-[#3D3D3D] text-white px-6 py-8 sm:px-10 sm:py-10 mb-8 shadow-sm">
          {/* Detalles decorativos */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex flex-col items-center text-center gap-4">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full ring-1 ring-white/15">
              <Clock className="w-3.5 h-3.5" />
              Muy pronto
            </span>

            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-pulse ring-2 ring-[#1A1A1A]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-bold">
              Nuestro catálogo estará disponible próximamente
            </h2>
            <p className="text-white/70 max-w-md text-sm sm:text-base leading-relaxed">
              Estamos preparando una selección especial de productos con los mejores
              precios para ti. Mientras tanto, puedes hacer tu pedido con el enlace de
              cualquier producto que quieras. ¡Gracias por tu paciencia! ✨
            </p>

            <button
              onClick={() => router.push('/pedir')}
              className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors mt-1"
            >
              <Bell className="w-4 h-4" />
              Hacer un pedido ahora
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  categoriaActiva === cat
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A1A1A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de productos */}
        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3" />
            <p className="font-medium">No hay productos disponibles</p>
            <p className="text-sm mt-1">
              {productos.length === 0
                ? 'El catálogo está vacío por el momento.'
                : 'Intenta con otra categoría o búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Imagen */}
                <div
                  className="relative h-48 bg-gray-50 cursor-pointer"
                  onClick={() => pedirDesde(producto)}
                >
                  {producto.imagen_url ? (
                    <Image
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {producto.categoria && (
                    <span className="absolute top-2 left-2 bg-white/90 text-[#1A1A1A] text-xs font-medium px-2 py-0.5 rounded-full">
                      {producto.categoria}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="text-sm font-medium text-[#212121] line-clamp-2 cursor-pointer hover:text-[#1A1A1A] transition-colors mb-2"
                    onClick={() => pedirDesde(producto)}
                  >
                    {producto.nombre}
                  </p>
                  <p className="text-lg font-bold text-[#1A1A1A] mb-3">
                    {formatUSD(producto.precio_usd)}
                    <span className="text-xs text-gray-400 font-normal ml-1">USD</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => pedirDesde(producto)}
                      className="flex-1 text-xs border border-[#1A1A1A] text-[#1A1A1A] py-2 rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors font-medium"
                    >
                      Pedir
                    </button>
                    <button
                      onClick={() => agregarDirecto(producto)}
                      className={`p-2 rounded-lg transition-colors ${
                        agregados[producto.id]
                          ? 'bg-green-500 text-white'
                          : 'bg-[#1A1A1A] text-white hover:bg-[#3D3D3D]'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
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
