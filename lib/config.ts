import type { ConfigApp, MetodoPago } from '@/types';
import { getSupabaseAdmin } from './supabase';

const DEFAULT_CONFIG: ConfigApp = {
  comision_pct: 10,
  proteccion_activa: true,
  tasa_bsd: 40,
  whatsapp: '',
  mensaje_checkout:
    'Gracias por tu pedido. Nos comunicaremos contigo en menos de 24 horas.',
  metodos_pago: [
    {
      id: 'binance',
      nombre: 'Binance Pay (USDT)',
      activo: true,
      instrucciones: 'Envía el pago a nuestro ID de Binance Pay.',
      datos_cuenta: '',
    },
    {
      id: 'zelle',
      nombre: 'Zelle',
      activo: true,
      instrucciones: 'Envía el pago por Zelle al correo indicado.',
      datos_cuenta: '',
    },
    {
      id: 'pago_movil',
      nombre: 'Pago Móvil / Transferencia Bs',
      activo: true,
      instrucciones: 'Realiza el pago móvil a los datos indicados.',
      datos_cuenta: '',
    },
    {
      id: 'efectivo',
      nombre: 'Efectivo USD',
      activo: false,
      instrucciones: 'Pago en efectivo al momento de la entrega.',
      datos_cuenta: '',
    },
  ],
};

// Solo debe llamarse desde el servidor (usa la service_role_key). La config
// contiene datos_cuenta de los métodos de pago y ya NO es legible con la anon key.
export async function getConfig(): Promise<ConfigApp> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('config').select('clave, valor');
    if (error || !data || data.length === 0) return DEFAULT_CONFIG;

    const map: Record<string, string> = {};
    data.forEach((row: { clave: string; valor: string }) => {
      map[row.clave] = row.valor;
    });

    let metodos_pago: MetodoPago[] = DEFAULT_CONFIG.metodos_pago;
    if (map['metodos_pago']) {
      try {
        metodos_pago = JSON.parse(map['metodos_pago']);
      } catch {}
    }

    return {
      comision_pct: Number(map['comision_pct'] ?? DEFAULT_CONFIG.comision_pct),
      proteccion_activa: (map['proteccion_activa'] ?? 'true') === 'true',
      tasa_bsd: Number(map['tasa_bsd'] ?? DEFAULT_CONFIG.tasa_bsd),
      whatsapp: map['whatsapp'] ?? '',
      mensaje_checkout: map['mensaje_checkout'] ?? DEFAULT_CONFIG.mensaje_checkout,
      metodos_pago,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
