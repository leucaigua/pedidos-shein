'use client';

import { useId, useState } from 'react';

interface Point { date: string; value: number }
const compact = new Intl.NumberFormat('es-VE', { notation: 'compact', maximumFractionDigits: 1 });
function dateLabel(date: string) { return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' }); }
export default function AdminDashboardChart({ points, title, currency = false, bars = false }: { points: Point[]; title: string; currency?: boolean; bars?: boolean }) {
  const id = useId().replaceAll(':', '');
  const [active, setActive] = useState<number | null>(null);
  const width = 620, height = 230, left = 48, top = 16, bottom = 38, right = 12;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.ceil(Math.max(...points.map((p) => p.value), bars ? 2 : 1) * 1.15);
  const x = (index: number) => left + (bars ? (index + .5) / points.length * plotWidth : points.length === 1 ? plotWidth / 2 : index / (points.length - 1) * plotWidth);
  const y = (value: number) => top + plotHeight * (1 - value / max);
  const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(p.value)}`).join(' ');
  const baseline = top + plotHeight;
  const area = points.length ? `${path} L ${x(points.length - 1)} ${baseline} L ${x(0)} ${baseline} Z` : '';
  const format = (value: number) => currency ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : String(value);
  const chosen = active === null ? null : points[active];
  return <div>
    <div className="h-7 text-right text-xs text-gray-500">{chosen ? <span>{dateLabel(chosen.date)} · <strong className="text-gray-900">{format(chosen.value)}</strong></span> : <span>Pasa sobre el gráfico para ver cada día</span>}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="w-full" onMouseLeave={() => setActive(null)}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1A1A1A" stopOpacity=".15" /><stop offset="100%" stopColor="#1A1A1A" stopOpacity=".01" /></linearGradient></defs>
      {[0, Math.ceil(max / 2), max].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#E5E7EB" strokeDasharray="3 5" /><text x={left - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">{currency ? '$' : ''}{compact.format(value)}</text></g>)}
      {!bars && <><path d={area} fill={`url(#${id})`} /><path d={path} fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round" /></>}
      {points.map((p, index) => <g key={p.date} tabIndex={0} role="img" aria-label={`${dateLabel(p.date)}: ${format(p.value)}`} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(index)}>
        {bars ? <rect x={x(index) - Math.max(3, plotWidth / points.length * .55) / 2} y={y(p.value)} width={Math.max(3, plotWidth / points.length * .55)} height={baseline - y(p.value)} rx="2" fill={active === index ? '#E8B731' : '#1A1A1A'} /> : <circle cx={x(index)} cy={y(p.value)} r={active === index ? 4 : 2} fill={active === index ? '#E8B731' : '#1A1A1A'} />}
        <rect x={x(index) - plotWidth / points.length / 2} y={top} width={plotWidth / points.length} height={plotHeight} fill="transparent" />
        <title>{dateLabel(p.date)}: {format(p.value)}</title>
      </g>)}
      {[...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].map((index) => points[index] && <text key={index} x={x(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#9CA3AF">{dateLabel(points[index].date)}</text>)}
    </svg>
    {points.every((point) => point.value === 0) && <p className="text-center text-xs text-gray-400">Sin actividad registrada en este período.</p>}
  </div>;
}
