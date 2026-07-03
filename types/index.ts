export type EstadoPedido =
  | 'pendiente_pago'
  | 'pago_confirmado'
  | 'comprando'
  | 'en_transito'
  | 'entregado';

// Progreso del pago (esquema 60% abono / 40% al retirar).
export type EstadoPago =
  | 'pendiente'       // sin pago registrado
  | 'abono_60'        // pagó el 60% (abono)
  | 'pagado_total';   // pagó el 40% restante → pedido pagado en su totalidad

export interface ItemCarrito {
  id: string;
  nombre: string;
  url_shein: string;
  imagen: string;
  precio_usd: number;
  talla: string;
  color: string;
  cantidad: number;
  peso_kg: number;
}

export interface DesglosePrecio {
  producto: number;
  envio: number;
  proteccion: number;
  comision: number;
  total: number;
  totalBsd?: number;
}

export interface DatosCliente {
  nombre: string;
  cedula: string;
  telefono: string;
  estado_vzla: string;
  direccion: string;
  nota: string;
  metodo_pago: string;
}

export interface Pedido {
  id: string;
  codigo: string;
  created_at: string;
  estado: EstadoPedido;
  cliente_nombre: string;
  cliente_cedula: string;
  cliente_telefono: string;
  cliente_estado: string;
  cliente_direccion: string;
  nota_cliente: string;
  nota_admin: string;
  subtotal: number;
  costo_envio: number;
  costo_proteccion: number;
  comision: number;
  descuento: number;
  codigo_cupon: string | null;
  total: number;
  metodo_pago: string;
  estado_pago?: EstadoPago;
  items: ItemCarrito[];
  user_id?: string | null;
  cliente_email?: string | null;
  tracking_numero?: string | null;
  tracking_url?: string | null;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  rol: 'cliente' | 'admin';
  created_at: string;
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  imagen_url: string;
  precio_usd: number;
  categoria: string;
  peso_estimado_kg: number;
  url_shein: string;
  activo: boolean;
  created_at: string;
}

export interface ConfigApp {
  comision_pct: number;
  proteccion_activa: boolean;
  tasa_bsd: number;
  whatsapp: string;
  mensaje_checkout: string;
  metodos_pago: MetodoPago[];
}

export interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
  instrucciones: string;
  datos_cuenta: string;
}

export interface ProductoScraped {
  nombre: string;
  precio: number;
  imagen: string;
  url: string;
  ok: boolean;
}
