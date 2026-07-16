import type { DesglosePrecio, ItemCarrito } from '@/types';

const TARIFA_POR_UNIDAD = 12.90;   // USD por cada ½ kg o fracción
const TARIFA_MINIMA     = 12.90;   // flete mínimo

// Esquema de pago: 60% para procesar el pedido, 40% al retirar
export const ABONO_PCT = 0.6;
export const RESTANTE_PCT = 0.4;

/** Monto a pagar hoy (60%) para procesar el pedido. */
export function calcularAbono(total: number): number {
  return total * ABONO_PCT;
}

/** Monto pendiente (40%) que se paga al retirar el pedido. */
export function calcularRestante(total: number): number {
  return total * RESTANTE_PCT;
}

/**
 * Flete = MAX($12.90, ceil(peso ÷ 0.5) × $12.90)
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
  // La comisión del 10% se aplica a TODO el subtotal, incluidos los artículos
  // del catálogo (además del +20% de reventa ya incluido en su precio).
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

// Sufijo aleatorio cripto-seguro (sin caracteres ambiguos 0/O, 1/I).
// Reemplaza Math.random para que los códigos de pedido NO sean adivinables ni
// enumerables (antes: solo 10.000 combinaciones por día).
const CODIGO_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 símbolos

function sufijoAleatorio(longitud: number): string {
  const bytes = new Uint8Array(longitud);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < longitud; i++) {
    out += CODIGO_ALFABETO[bytes[i] % CODIGO_ALFABETO.length];
  }
  return out;
}

// Longitud exacta de un código de pedido: "PS-" (3) + "YYYYMMDD" (8) + "-" (1) + sufijo (7) = 19.
export const LONGITUD_CODIGO_PEDIDO = 19;

export function generarCodigoPedido(): string {
  const fecha = new Date();
  const ymd =
    fecha.getFullYear().toString() +
    String(fecha.getMonth() + 1).padStart(2, '0') +
    String(fecha.getDate()).padStart(2, '0');
  // 7 símbolos ⇒ 32^7 ≈ 3.4×10^10 combinaciones: no enumerables.
  return `PS-${ymd}-${sufijoAleatorio(7)}`;
}
