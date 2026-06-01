import type { DesglosePrecio, ItemCarrito } from '@/types';

const TARIFA_POR_UNIDAD = 16.20;   // USD por cada ½ kg o fracción
const TARIFA_MINIMA     = 16.20;   // flete mínimo

/**
 * Flete = MAX($16.20, ceil(peso ÷ 0.5) × $16.20)
 */
export function calcularEnvioAereo(pesoKg: number): number {
  const unidades = Math.ceil(pesoKg / 0.5);
  return Math.max(TARIFA_MINIMA, unidades * TARIFA_POR_UNIDAD);
}

/**
 * Seguro = $1.20 si mercancía ≤ $100  /  1% si > $100
 */
export function calcularSeguro(subtotal: number): number {
  return subtotal <= 100 ? 1.20 : subtotal * 0.01;
}

export function calcularDesglose(
  precioProducto: number,
  pesoKg: number,
  comisionPct = 10,
  conSeguro = true,
  tasaBsd = 0
): DesglosePrecio {
  const envio     = calcularEnvioAereo(pesoKg);
  const proteccion = conSeguro ? calcularSeguro(precioProducto) : 0;
  const comision  = precioProducto * (comisionPct / 100);
  const totalUSD  = precioProducto + envio + proteccion + comision;
  return {
    producto: precioProducto,
    envio,
    proteccion,
    comision,
    total: totalUSD,
    totalBsd: tasaBsd > 0 ? totalUSD * tasaBsd : 0,
  };
}

export function calcularDesgloseCarrito(
  items: ItemCarrito[],
  comisionPct = 10,
  conSeguro = true,
  tasaBsd = 0
): DesglosePrecio {
  const subtotal = items.reduce((acc: number, i: ItemCarrito) => acc + i.precio_usd * i.cantidad, 0);
  const peso     = items.reduce((acc: number, i: ItemCarrito) => acc + i.peso_kg   * i.cantidad, 0);
  const envio     = calcularEnvioAereo(peso);
  const proteccion = conSeguro ? calcularSeguro(subtotal) : 0;
  const comision  = subtotal * (comisionPct / 100);
  const totalUSD  = subtotal + envio + proteccion + comision;
  return {
    producto: subtotal,
    envio,
    proteccion,
    comision,
    total: totalUSD,
    totalBsd: tasaBsd > 0 ? totalUSD * tasaBsd : 0,
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatBsD(amount: number, tasa: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount * tasa) + ' Bs';
}

export function generarCodigoPedido(): string {
  const fecha = new Date();
  const ymd =
    fecha.getFullYear().toString() +
    String(fecha.getMonth() + 1).padStart(2, '0') +
    String(fecha.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `PS-${ymd}-${rand}`;
}
