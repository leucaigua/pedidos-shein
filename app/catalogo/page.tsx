'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/catalogo/ProductCard';
import { useCart } from '@/components/CartContext';
import { formatUSD } from '@/lib/calculations';
import type { ProductoCatalogo } from '@/types';
import {
  Search, Package, AlertCircle, Loader2, SlidersHorizontal, ShieldCheck, Plane, Wallet, Percent,
  Flame, Sparkles, TrendingDown, ArrowRight, ShoppingBag, Truck, BadgeCheck,
} from 'lucide-react';

const CATEGORIAS = ['Todas', 'Ropa', 'Zapatos', 'Accesorios', 'Belleza', 'Hogar', 'Tecnología'];
const ORDENES = [
  { v: 'relevancia', t: 'Relevancia' },
  { v: 'precio_asc', t: 'Menor precio' },
  { v: 'precio_desc', t: 'Mayor precio' },
];
const POR_PAGINA = 24;

const BADGES = [
  { icon: Wallet, t: 'Pago en Bs, Zelle y Binance' },
  { icon: Plane, t: 'Envío aéreo a Venezuela' },
  { icon: Percent, t: 'Aparta con el 60%' },
  { icon: ShieldCheck, t: 'Verificamos antes de comprar' },
];

function descuentoPct(p: ProductoCatalogo): number {
  return p.precio_anterior_usd && p.precio_anterior_usd > p.precio_usd
    ? Math.round((1 - p.precio_usd / p.precio_anterior_usd) * 100)
    : 0;
}

// Mini tarjeta para las secciones promocionales (NO es el ProductCard del grid).
function MiniDeal({ p }: { p: ProductoCatalogo }) {
  const dto = descuentoPct(p);
  return (
    <Link
      href={`/catalogo/${p.slug ?? p.id}`}
      className="group flex-shrink-0 w-28 sm:w-32"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-1.5">
        {p.imagen_url ? (
          <Image src={p.imagen_url} alt={p.nombre} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
        ) : (
          <div className="flex items-center justify-center h-full"><Package className="w-6 h-6 text-gray-300" /></div>
        )}
        {dto > 0 && (
          <span className="absolute top-1 left-1 bg-[#FF4747] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{dto}%
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-[#FF4747] leading-none">{formatUSD(p.precio_usd)}</p>
      {dto > 0 && (
        <p className="text-[11px] text-gray-400 line-through leading-tight">{formatUSD(p.precio_anterior_usd!)}</p>
      )}
    </Link>
  );
}

function PanelDeals({
  titulo, icon: Icon, color, productos, onVerTodo,
}: {
  titulo: string; icon: typeof Flame; color: string; productos: ProductoCatalogo[]; onVerTodo: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </span>
          <h3 className="font-display font-bold text-[#1A1A1A]">{titulo}</h3>
        </div>
        <button onClick={onVerTodo} className="text-xs text-gray-400 hover:text-[#1A1A1A] flex items-center gap-0.5">
          Ver todo <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {productos.map((p) => <MiniDeal key={p.id} p={p} />)}
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const { addItem } = useCart();
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('relevancia');
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  // Secciones promocionales (independientes de los filtros del grid).
  const [ofertas, setOfertas] = useState<ProductoCatalogo[]>([]);
  const [baratos, setBaratos] = useState<ProductoCatalogo[]>([]);

  const [agregados, setAgregados] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const construirURL = useCallback(
    (p: number) => {
      const sp = new URLSearchParams();
      if (categoria !== 'Todas') sp.set('categoria', categoria);
      if (busqueda.trim()) sp.set('q', busqueda.trim());
      if (orden !== 'relevancia') sp.set('orden', orden);
      if (soloOfertas) sp.set('ofertas', 'true');
      if (precioMin) sp.set('precioMin', precioMin);
      if (precioMax) sp.set('precioMax', precioMax);
      sp.set('pagina', String(p));
      sp.set('porPagina', String(POR_PAGINA));
      return `/api/catalogo?${sp.toString()}`;
    },
    [categoria, busqueda, orden, soloOfertas, precioMin, precioMax]
  );

  const cargar = useCallback(
    async (p: number, append: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (append) setCargandoMas(true); else setCargando(true);
      setError(false);
      try {
        const res = await fetch(construirURL(p), { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'error');
        const nuevos: ProductoCatalogo[] = data.productos ?? [];
        setProductos((prev) => (append ? [...prev, ...nuevos] : nuevos));
        setTotal(data.total ?? nuevos.length);
        setHayMas(Boolean(data.hayMas));
        setPagina(p);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(true);
      } finally {
        if (append) setCargandoMas(false); else setCargando(false);
      }
    },
    [construirURL]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => cargar(1, false), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cargar]);

  // Carga de secciones promocionales (una sola vez).
  useEffect(() => {
    fetch('/api/catalogo?ofertas=true&porPagina=10')
      .then((r) => r.json()).then((d) => setOfertas(d.productos ?? [])).catch(() => {});
    fetch('/api/catalogo?orden=precio_asc&porPagina=10')
      .then((r) => r.json()).then((d) => setBaratos(d.productos ?? [])).catch(() => {});
  }, []);

  function agregarDirecto(p: ProductoCatalogo) {
    addItem({
      nombre: p.nombre,
      url_shein: p.source_url || p.url_shein || '',
      imagen: p.imagen_url || '',
      precio_usd: p.precio_usd,
      talla: '',
      color: '',
      cantidad: 1,
      peso_kg: p.peso_estimado_kg,
      catalogo_id: p.id,
      external_id: p.external_id,
      source: p.source,
      precio_snapshot: p.precio_usd,
    });
    setAgregados((s) => ({ ...s, [p.id]: true }));
    setTimeout(() => setAgregados((s) => ({ ...s, [p.id]: false })), 2000);
  }

  const heroImgs = (ofertas.length ? ofertas : productos).slice(0, 6);

  function irAlGrid() {
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
  }
  function verOfertas() {
    setSoloOfertas(true);
    setFiltrosAbiertos(true);
    irAlGrid();
  }
  function verBaratos() {
    setOrden('precio_asc');
    irAlGrid();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

        {/* HERO promocional */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1A] via-[#262626] to-[#1A1A1A] px-6 py-7 md:px-10 md:py-9 mb-4">
          <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#FFD700]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-[#FF4747]/10 blur-3xl" />
          <div className="relative flex items-center gap-6">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 bg-[#FFD700] text-[#1A1A1A] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-3">
                <Sparkles className="w-3 h-3" /> Tienda online
              </span>
              <h1 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight mb-2">
                Cientos de productos<br className="hidden md:block" /> con envío a Venezuela
              </h1>
              <p className="text-gray-300 text-sm md:text-base mb-4 max-w-md">
                Explora, elige y aparta con el 60%. Nosotros compramos y te lo traemos.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="#productos" className="inline-flex items-center gap-2 bg-[#FFD700] text-[#1A1A1A] font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#ffdd33] transition-colors">
                  <ShoppingBag className="w-4 h-4" /> Ver productos
                </a>
                <Link href="/pedir" className="inline-flex items-center gap-2 border border-white/25 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  Pedir por enlace
                </Link>
              </div>
            </div>
            {/* Collage de productos (real) */}
            {heroImgs.length >= 3 && (
              <div className="hidden md:grid grid-cols-3 gap-2 w-64 flex-shrink-0">
                {heroImgs.slice(0, 6).map((p) => (
                  <Link key={p.id} href={`/catalogo/${p.slug ?? p.id}`} className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10">
                    {p.imagen_url && <Image src={p.imagen_url} alt="" fill className="object-cover" unoptimized />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Franja de confianza */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {BADGES.map(({ icon: Icon, t }) => (
            <div key={t} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
              <Icon className="w-4 h-4 text-[#1A1A1A] flex-shrink-0" />
              <span className="text-[11px] sm:text-xs text-gray-600 leading-tight">{t}</span>
            </div>
          ))}
        </div>

        {/* Ofertas de hoy — panel doble */}
        {(ofertas.length > 0 || baratos.length > 0) && (
          <section className="mb-6">
            <h2 className="text-lg font-display font-bold text-[#1A1A1A] mb-3">Ofertas de hoy</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ofertas.length > 0 && (
                <PanelDeals titulo="Ofertas" icon={Flame} color="bg-[#FF4747]" productos={ofertas} onVerTodo={verOfertas} />
              )}
              {baratos.length > 0 && (
                <PanelDeals titulo="Precios bajos" icon={TrendingDown} color="bg-[#1A1A1A]" productos={baratos} onVerTodo={verBaratos} />
              )}
            </div>
          </section>
        )}

        {/* Banner intermedio */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A1A1A] to-[#333] px-5 py-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-[#FFD700] flex-shrink-0" />
              <div>
                <p className="text-white font-display font-bold">Envío aéreo rápido a toda Venezuela</p>
                <p className="text-gray-300 text-xs">Verificamos precio y disponibilidad antes de comprar tu pedido.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-xs">
              <BadgeCheck className="w-4 h-4 text-[#FFD700]" /> Aparta con el 60%
            </div>
          </div>
        </section>

        {/* MÁS PARA TI — buscador + filtros + grid (funcionalidad intacta) */}
        <div id="productos" className="scroll-mt-4">
          <h2 className="text-lg font-display font-bold text-[#1A1A1A] mb-3">Más para ti</h2>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30"
            >
              {ORDENES.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <button
              onClick={() => setFiltrosAbiertos((v) => !v)}
              className={`flex items-center gap-1.5 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors bg-white ${
                filtrosAbiertos || soloOfertas || precioMin || precioMax
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          {filtrosAbiertos && (
            <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-100 rounded-xl p-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio mín (USD)</label>
                <input type="number" min="0" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio máx (USD)</label>
                <input type="number" min="0" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="—" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-2">
                <input type="checkbox" checked={soloOfertas} onChange={(e) => setSoloOfertas(e.target.checked)}
                  className="rounded border-gray-300 text-[#1A1A1A] focus:ring-[#1A1A1A]" />
                Solo ofertas
              </label>
            </div>
          )}

          <div className="flex gap-2 flex-wrap mb-5">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  categoria === cat
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1A1A1A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {cargando ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-48 sm:h-56 bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-5 bg-gray-100 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-20 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-3 text-red-300" />
              <p className="font-medium">No pudimos cargar el catálogo</p>
              <button
                onClick={() => cargar(1, false)}
                className="mt-4 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : productos.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-400">
              <Package className="w-12 h-12 mb-3" />
              <p className="font-medium">No hay productos</p>
              <p className="text-sm mt-1">Prueba con otra categoría o búsqueda.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">{total} producto{total !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {productos.map((p) => (
                  <ProductCard key={p.id} producto={p} onAgregar={agregarDirecto} agregado={agregados[p.id]} />
                ))}
              </div>
              {hayMas && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => cargar(pagina + 1, true)}
                    disabled={cargandoMas}
                    className="inline-flex items-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] bg-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-60"
                  >
                    {cargandoMas && <Loader2 className="w-4 h-4 animate-spin" />}
                    Cargar más
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
