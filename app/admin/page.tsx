'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowDownRight, ArrowUpRight, ArrowRight, Banknote, ChartNoAxesCombined, CircleDollarSign, FileText, Globe, Loader2, Mail, Package, RefreshCw, ShoppingCart, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatUSD } from '@/lib/calculations';
import { estadoLabel, estadoColor } from '@/lib/utils';
import type { DashboardData, DashboardMetric } from '@/lib/dashboard';
import AdminDashboardChart from '@/components/AdminDashboardChart';

const integer = new Intl.NumberFormat('es-VE');
function Trend({ metric }: { metric: DashboardMetric }) {
  if (metric.change === null) return <span className="text-xs text-gray-400">Sin base de comparación</span>;
  const positive = metric.change >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-700' : 'text-rose-600'}`}><Icon className="w-3.5 h-3.5" />{positive ? '+' : ''}{metric.change.toFixed(1)}%<span className="text-gray-400 font-normal ml-1">vs. período anterior</span></span>;
}
function Card({ label, value, icon: Icon, note, metric, href }: { label: string; value: string; icon: LucideIcon; note: string; metric?: DashboardMetric; href?: string }) {
  return <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between gap-2 mb-4"><p className="text-sm text-gray-500">{label}</p><span className="p-2 rounded-xl bg-gray-50"><Icon className="w-4 h-4 text-gray-600" /></span></div>
    <p className="text-2xl lg:text-3xl font-display font-bold tracking-tight mb-2">{value}</p>
    {metric && <Trend metric={metric} />}
    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{note}</p>
    {href && <Link href={href} className="inline-flex items-center gap-1 mt-3 text-xs font-semibold hover:underline">Ver detalle<ArrowRight className="w-3 h-3" /></Link>}
  </div>;
}
function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <section className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm"><h2 className="font-display font-bold text-base">{title}</h2><p className="text-xs text-gray-400 mt-1 mb-4 leading-relaxed">{note}</p>{children}</section>;
}

export default function AdminPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const res = await fetch(`/api/admin/dashboard?days=${days}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las métricas.');
      if (!signal?.aborted) setData(body);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Error de conexión.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [days]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  const m = data?.metrics;
  const periodLabel = data ? `${new Date(`${data.range.start}T12:00:00Z`).toLocaleDateString('es-VE')} – ${new Date(`${data.range.end}T12:00:00Z`).toLocaleDateString('es-VE')}` : '';
  const quoteAvailable = !data?.unavailable.includes('cotizaciones');
  const checkoutAvailable = !data?.unavailable.includes('carritos');
  return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div><p className="text-xs text-gray-400 uppercase tracking-[.18em] mb-2">Pedidos SHEIN · Administración</p><h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1><p className="text-sm text-gray-500 mt-2">Tu negocio de un vistazo{periodLabel ? ` · ${periodLabel}` : ''}</p></div>
      <div className="flex items-center gap-3"><select aria-label="Período del dashboard" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm">{[7,30,90].map((day) => <option key={day} value={day}>Últimos {day} días</option>)}</select><button onClick={() => load()} disabled={loading} aria-label="Actualizar dashboard" className="border border-gray-200 rounded-xl bg-white p-3 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    </div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => load()} className="underline ml-3">Reintentar</button></div>}
    {loading ? <div className="py-24 text-center text-sm text-gray-400"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-4" />Cargando el resumen de tu negocio…</div> : data && m && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card label="Ventas confirmadas" value={formatUSD(m.sales.value)} icon={CircleDollarSign} metric={m.sales} note={`${m.confirmedOrders} pedidos con pago o compra confirmada`} href="/admin/pedidos" />
        <Card label="Pedidos creados" value={integer.format(m.orders.value)} icon={Package} metric={m.orders} note={`${m.ordersPerDay.toFixed(1)} pedidos por día en promedio`} href="/admin/pedidos" />
        <Card label="Ticket promedio" value={formatUSD(m.average.value)} icon={ChartNoAxesCombined} metric={m.average} note="Valor promedio de una venta confirmada" />
        <Card label="Cobrado estimado" value={formatUSD(m.collected.value)} icon={Banknote} metric={m.collected} note="Según pagos registrados: abono del 60% o pago total" />
        <Card label="Pendientes de pago" value={integer.format(m.pendingOrders)} icon={Wallet} note={`${formatUSD(m.pendingAmount)} en pedidos activos por confirmar`} href="/admin/pedidos" />
        <Card label="Cotizaciones" value={quoteAvailable ? integer.format(m.quotes.value) : '—'} icon={FileText} metric={quoteAvailable ? m.quotes : undefined} note={quoteAvailable ? `${m.approvedQuotes} aprobadas · ${m.pendingQuotes} pendientes de aprobación` : 'Datos no disponibles temporalmente'} href="/admin/pedidos/cotizaciones" />
        <Card label="Recuperación de carritos" value={checkoutAvailable ? `${m.recoveryRate.toFixed(1)}%` : '—'} icon={ShoppingCart} note={checkoutAvailable ? `${m.checkouts} checkouts iniciados en el período` : 'Datos no disponibles temporalmente'} href="/admin/checkouts" />
        <Card label="Visitas al sitio" value={data.traffic.sessions ? integer.format(data.traffic.sessions.value) : '—'} icon={Globe} metric={data.traffic.sessions || undefined} note={data.traffic.status === 'connected' ? `${integer.format(data.traffic.users || 0)} visitantes · ${integer.format(data.traffic.pageViews || 0)} páginas vistas` : data.traffic.status === 'error' ? 'Google Analytics no está disponible temporalmente' : 'Pendiente de conectar Google Analytics'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Section title="Evolución de ventas" note="Valor total de ventas confirmadas, según la fecha de creación del pedido."><AdminDashboardChart title="Ventas confirmadas por día en dólares" currency points={data.daily.map((point) => ({ date: point.date, value: point.ventas }))} /></Section>
        <Section title="Pedidos por día" note={`Promedio de ${m.ordersPerDay.toFixed(1)} pedidos diarios. Incluye pedidos pendientes de pago.`}><AdminDashboardChart title="Cantidad de pedidos creados por día" bars points={data.daily.map((point) => ({ date: point.date, value: point.pedidos }))} /></Section>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Section title="Estado de los pedidos" note="Pedidos creados en el período, incluyendo los archivados."><div className="space-y-4">{data.statuses.map((row) => <div key={row.estado}><div className="flex justify-between text-xs mb-2"><span className="text-gray-600">{estadoLabel(row.estado)}</span><strong>{row.count}</strong></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.estado === 'entregado' ? 'bg-emerald-500' : row.estado === 'pendiente_pago' ? 'bg-amber-400' : 'bg-[#1A1A1A]'}`} style={{ width: `${m.orders.value ? row.count / m.orders.value * 100 : 0}%` }} /></div></div>)}</div></Section>
        <Section title="Pagos de ventas confirmadas" note="Distribución por estado de pago registrado.">
          <div className="flex justify-center mb-5"><svg viewBox="0 0 120 120" className="w-32 h-32" role="img" aria-label={`${m.confirmedOrders} ventas confirmadas por estado de pago`}><circle cx="60" cy="60" r="46" fill="none" stroke="#F3F4F6" strokeWidth="13" />{data.paymentMethods.map((row, index) => {
            const count = m.confirmedOrders || 1, circumference = 2 * Math.PI * 46;
            const previous = data.paymentMethods.slice(0,index).reduce((sum, row) => sum + row.count, 0);
            return <circle key={row.estado} cx="60" cy="60" r="46" fill="none" stroke={['#1A1A1A','#E8B731','#D1D5DB'][index]} strokeWidth="13" strokeDasharray={`${row.count / count * circumference} ${circumference}`} strokeDashoffset={-previous / count * circumference} transform="rotate(-90 60 60)"><title>{row.estado}: {row.count}</title></circle>;
          })}<text x="60" y="58" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1A1A1A">{m.confirmedOrders}</text><text x="60" y="76" textAnchor="middle" fontSize="9" fill="#9CA3AF">ventas</text></svg></div>
          <div className="space-y-2">{data.paymentMethods.map((row,index) => <div key={row.estado} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#1A1A1A','#E8B731','#D1D5DB'][index] }} />{row.estado === 'pagado_total' ? 'Pagadas al 100%' : row.estado === 'abono_60' ? 'Con abono del 60%' : 'Sin pago registrado'}</span><strong>{row.count}</strong></div>)}</div>
          <p className="text-xs text-gray-400 border-t border-gray-100 mt-4 pt-3">Saldo estimado por cobrar: <span className="font-semibold text-gray-700">{formatUSD(m.receivable)}</span></p>
        </Section>
        <Section title="Estados con más ventas" note="Ventas confirmadas por destino en Venezuela.">{data.regions.length ? <div className="space-y-5">{data.regions.map((region,index) => <div key={region.name}><div className="flex justify-between gap-2 text-sm"><span className="text-gray-600"><span className="text-gray-300 mr-2">{index + 1}</span>{region.name}</span><strong>{formatUSD(region.sales)}</strong></div><p className="text-xs text-gray-400 mt-1 ml-4">{region.count} pedido{region.count !== 1 ? 's' : ''}</p></div>)}</div> : <div className="py-16 text-center text-sm text-gray-400">Aún no hay ventas confirmadas.</div>}</Section>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2"><Section title="Visitas y audiencia" note="Sesiones registradas por Google Analytics.">{data.traffic.status === 'connected' ? <AdminDashboardChart title="Visitas al sitio por día" points={data.daily.map((point) => ({ date: point.date, value: data.traffic.daily.find((day) => day.date === point.date)?.visits || 0 }))} /> : <div className="flex flex-col items-center justify-center py-10 text-center"><Globe className="w-9 h-9 text-gray-300 mb-3" /><p className="text-sm font-semibold">{data.traffic.status === 'error' ? 'No pudimos consultar las visitas' : 'Conecta Google Analytics'}</p><p className="text-xs text-gray-400 mt-2 max-w-sm">{data.traffic.status === 'error' ? 'Las métricas de pedidos siguen disponibles. Intenta actualizar más tarde.' : 'El sitio ya tiene Analytics. Al conectar su propiedad aquí podrás ver visitas, visitantes y páginas vistas.'}</p><a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline mt-4">Abrir Google Analytics</a></div>}</Section></div>
        <Section title="Oportunidades de seguimiento" note="Clientes a los que puedes dar el siguiente paso."><div className="space-y-4">
          <Link href="/admin/pedidos/cotizaciones" className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"><span className="text-sm text-gray-600">Cotizaciones pendientes</span><span className="font-bold">{quoteAvailable ? m.pendingQuotes : '—'}</span></Link>
          <Link href="/admin/checkouts" className="block rounded-xl bg-amber-50 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-amber-900">Carritos por recuperar</span><ShoppingCart className="w-4 h-4 text-amber-700" /></div><p className="font-bold mt-1 text-amber-950">{checkoutAvailable ? formatUSD(m.unrecoveredAmount) : '—'}</p></Link>
          <Link href="/admin/suscriptores" className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"><span className="inline-flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4" />Nuevos suscriptores</span><span className="font-bold">{data.unavailable.includes('suscriptores') ? '—' : m.subscribers}</span></Link>
        </div></Section>
      </div>
      <Section title="Últimos pedidos" note="Los seis pedidos más recientes del período."><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-xs text-gray-400 border-b border-gray-100">{['Pedido','Cliente','Fecha','Estado','Total'].map((label) => <th key={label} className="py-3 pr-4 font-medium">{label}</th>)}</tr></thead><tbody>{data.recent.map((order) => <tr key={order.id} className="border-b border-gray-50 last:border-0"><td className="py-4 pr-4"><Link href={`/admin/pedidos/${order.id}`} className="font-semibold text-xs whitespace-nowrap hover:underline">{order.codigo}</Link></td><td className="py-4 pr-4">{order.cliente_nombre}</td><td className="py-4 pr-4 text-xs text-gray-500 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</td><td className="py-4 pr-4"><span className={`text-xs rounded-full px-2.5 py-1 whitespace-nowrap ${estadoColor(order.estado)}`}>{estadoLabel(order.estado)}</span></td><td className="py-4 font-semibold whitespace-nowrap">{formatUSD(order.total)}</td></tr>)}{!data.recent.length && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No hay pedidos en este período.</td></tr>}</tbody></table></div><Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-xs font-semibold mt-4 hover:underline">Ver todos los pedidos<ArrowRight className="w-3 h-3" /></Link></Section>
      <div className="flex flex-wrap justify-between gap-2 mt-5 text-[11px] text-gray-400"><span className="inline-flex items-center gap-1.5"><Activity className="w-3 h-3" />Actualizado {new Date(data.generatedAt).toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit' })} · Hora de Venezuela</span><span>El período incluye hoy. Ventas y cobros agrupados por fecha de creación del pedido.</span></div>
    </>}
  </div>;
}
