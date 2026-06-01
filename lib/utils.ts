import type { EstadoPedido } from '@/types';

export function estadoLabel(estado: EstadoPedido): string {
  const labels: Record<EstadoPedido, string> = {
    pendiente_pago: 'Pendiente de pago',
    pago_confirmado: 'Pago confirmado',
    comprando: 'Comprando en SHEIN',
    en_transito: 'En tránsito',
    entregado: 'Entregado',
  };
  return labels[estado] ?? estado;
}

export function estadoEmoji(estado: EstadoPedido): string {
  const emojis: Record<EstadoPedido, string> = {
    pendiente_pago: '🟡',
    pago_confirmado: '🔵',
    comprando: '🟣',
    en_transito: '📦',
    entregado: '✅',
  };
  return emojis[estado] ?? '⚪';
}

export function estadoColor(estado: EstadoPedido): string {
  const colors: Record<EstadoPedido, string> = {
    pendiente_pago: 'bg-yellow-100 text-yellow-800',
    pago_confirmado: 'bg-blue-100 text-blue-800',
    comprando: 'bg-purple-100 text-purple-800',
    en_transito: 'bg-orange-100 text-orange-800',
    entregado: 'bg-green-100 text-green-800',
  };
  return colors[estado] ?? 'bg-gray-100 text-gray-800';
}

export function whatsappUrl(numero: string, mensaje: string): string {
  const clean = numero.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
