import type { EstadoPedido, EstadoPago, EstadoCotizacion } from '@/types';

export interface DashboardOrder {
  id: string; codigo: string; created_at: string; cliente_nombre: string;
  cliente_estado: string | null; total: number; estado: EstadoPedido;
  estado_pago: EstadoPago | null; archivado: boolean; archivado_motivo: string | null;
}
export interface DashboardQuote { created_at: string; estado: EstadoCotizacion; archivado: boolean }
export interface DashboardCheckout { created_at: string; recuperado: boolean; total: number }
export interface DashboardRange { days: number; start: string; end: string; previousStart: string; fromISO: string; toISO: string }
export interface DashboardPoint { date: string; pedidos: number; ventas: number }
export interface DashboardMetric { value: number; previous: number; change: number | null }
export interface DashboardTraffic {
  status: 'connected' | 'not_configured' | 'error';
  sessions: DashboardMetric | null; users: number | null; pageViews: number | null;
  daily: { date: string; visits: number }[];
}
export interface DashboardData {
  range: DashboardRange;
  generatedAt: string;
  metrics: { sales: DashboardMetric; orders: DashboardMetric; average: DashboardMetric; collected: DashboardMetric; receivable: number; ordersPerDay: number; confirmedOrders: number; pendingOrders: number; pendingAmount: number; quotes: DashboardMetric; approvedQuotes: number; pendingQuotes: number; checkouts: number; recoveryRate: number; unrecoveredAmount: number; subscribers: number };
  daily: DashboardPoint[];
  statuses: { estado: EstadoPedido; count: number }[];
  paymentMethods: { estado: 'pagado_total' | 'abono_60' | 'pendiente'; count: number; total: number }[];
  regions: { name: string; sales: number; count: number }[];
  recent: DashboardOrder[];
  traffic: DashboardTraffic;
  unavailable: string[];
}

export function caracasDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function shiftDate(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function dashboardRange(days: number, now = new Date()): DashboardRange {
  const end = caracasDate(now);
  const start = shiftDate(end, 1 - days);
  const previousStart = shiftDate(start, -days);
  return { days, start, end, previousStart, fromISO: `${previousStart}T04:00:00.000Z`, toISO: `${shiftDate(end, 1)}T04:00:00.000Z` };
}
function money(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function amount(value: number) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, number) : 0; }
function metric(value: number, previous: number): DashboardMetric {
  return { value: money(value), previous: money(previous), change: previous > 0 ? money((value - previous) / previous * 100) : null };
}
export function isConfirmed(order: DashboardOrder): boolean {
  return order.archivado_motivo !== 'no_pago' && (['pago_confirmado', 'comprando', 'en_transito', 'entregado'].includes(order.estado) || ['abono_60', 'pagado_total'].includes(order.estado_pago || ''));
}
function collected(order: DashboardOrder) {
  return isConfirmed(order) ? amount(order.total) * (order.estado_pago === 'pagado_total' ? 1 : order.estado_pago === 'abono_60' ? .6 : 0) : 0;
}

export function aggregateDashboard(range: DashboardRange, orders: DashboardOrder[], quotes: DashboardQuote[], checkouts: DashboardCheckout[], subscribers: { created_at: string }[]) {
  const current = orders.filter((o) => caracasDate(o.created_at) >= range.start && caracasDate(o.created_at) <= range.end);
  const previous = orders.filter((o) => caracasDate(o.created_at) >= range.previousStart && caracasDate(o.created_at) < range.start);
  const salesOrders = current.filter(isConfirmed);
  const previousSales = previous.filter(isConfirmed);
  const total = (rows: DashboardOrder[]) => rows.reduce((sum, o) => sum + amount(o.total), 0);
  const sales = total(salesOrders);
  const currentQuotes = quotes.filter((q) => caracasDate(q.created_at) >= range.start && caracasDate(q.created_at) <= range.end);
  const previousQuotes = quotes.filter((q) => caracasDate(q.created_at) >= range.previousStart && caracasDate(q.created_at) < range.start);
  const currentCheckouts = checkouts.filter((c) => caracasDate(c.created_at) >= range.start && caracasDate(c.created_at) <= range.end);
  const recovered = currentCheckouts.filter((c) => c.recuperado).length;
  const received = salesOrders.reduce((sum, o) => sum + collected(o), 0);
  const pending = current.filter((o) => !o.archivado && o.estado === 'pendiente_pago' && !isConfirmed(o));
  const daily: DashboardPoint[] = Array.from({ length: range.days }, (_, index) => ({ date: shiftDate(range.start, index), pedidos: 0, ventas: 0 }));
  const days = new Map(daily.map((point) => [point.date, point]));
  for (const order of current) {
    const day = days.get(caracasDate(order.created_at));
    if (day) { day.pedidos++; if (isConfirmed(order)) day.ventas += amount(order.total); }
  }
  daily.forEach((day) => { day.ventas = money(day.ventas); });
  const regions = new Map<string, { name: string; sales: number; count: number }>();
  for (const order of salesOrders) {
    const name = order.cliente_estado?.trim() || 'Sin estado indicado';
    const region = regions.get(name) || { name, sales: 0, count: 0 };
    region.sales += amount(order.total); region.count++; regions.set(name, region);
  }
  return {
    metrics: {
      sales: metric(sales, total(previousSales)), orders: metric(current.length, previous.length),
      average: metric(salesOrders.length ? sales / salesOrders.length : 0, previousSales.length ? total(previousSales) / previousSales.length : 0),
      collected: metric(received, previousSales.reduce((sum, o) => sum + collected(o), 0)),
      receivable: money(Math.max(0, sales - received)), ordersPerDay: money(current.length / range.days), confirmedOrders: salesOrders.length,
      pendingOrders: pending.length, pendingAmount: money(total(pending)), quotes: metric(currentQuotes.length, previousQuotes.length),
      approvedQuotes: currentQuotes.filter((q) => q.estado === 'aprobada').length,
      pendingQuotes: currentQuotes.filter((q) => !q.archivado && q.estado === 'pendiente_aprobacion').length,
      checkouts: currentCheckouts.length, recoveryRate: currentCheckouts.length ? money(recovered / currentCheckouts.length * 100) : 0,
      unrecoveredAmount: money(currentCheckouts.filter((c) => !c.recuperado).reduce((sum, c) => sum + amount(c.total), 0)),
      subscribers: subscribers.filter((s) => caracasDate(s.created_at) >= range.start && caracasDate(s.created_at) <= range.end).length,
    },
    daily,
    statuses: (['pendiente_pago', 'pago_confirmado', 'comprando', 'en_transito', 'entregado'] as EstadoPedido[]).map((estado) => ({ estado, count: current.filter((o) => o.estado === estado).length })),
    paymentMethods: (['pagado_total', 'abono_60', 'pendiente'] as const).map((estado) => {
      const rows = salesOrders.filter((o) => (o.estado_pago || 'pendiente') === estado);
      return { estado, count: rows.length, total: money(total(rows)) };
    }),
    regions: [...regions.values()].map((region) => ({ ...region, sales: money(region.sales) })).sort((a,b) => b.sales - a.sales).slice(0, 5),
    recent: [...current].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
  };
}
