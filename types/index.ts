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

// Motivo por el que un pedido se archiva.
export type MotivoArchivo =
  | 'completado'  // pedido finalizado (llegó hasta entregado)
  | 'no_pago';    // no se procesó porque el cliente no pagó

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
  // --- Catálogo (dropshipping): opcionales para no romper items existentes ---
  catalogo_id?: string;        // id del producto en la tabla `catalogo`
  external_id?: string;        // id del producto en la fuente (AliExpress)
  source?: CatalogoSource;     // origen del producto
  variante?: string;           // etiqueta de la variante elegida (color/talla/modelo)
  variante_id?: string;        // id de la variante en la fuente
  // Snapshot del precio de reventa mostrado al agregar (SHEIN/AliExpress cambian precios).
  precio_snapshot?: number;
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
  archivado?: boolean;
  archivado_motivo?: MotivoArchivo | null;
  archivado_en?: string | null;
}

export interface CheckoutAbandonado {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  cliente_estado: string | null;
  items: ItemCarrito[];
  subtotal: number;
  total: number;
  recuperado: boolean;
  recuperado_en: string | null;
  pedido_codigo: string | null;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  rol: 'cliente' | 'admin';
  created_at: string;
}

export type CatalogoSource = 'aliexpress' | 'manual' | 'shein';

export type Disponibilidad = 'disponible' | 'pocas' | 'agotado' | 'desconocido';

export interface VarianteCatalogo {
  id: string;
  sku?: string;
  color?: string;
  talla?: string;
  modelo?: string;
  imagen?: string;
  // precio_base_usd es INTERNO (no se expone al frontend público).
  precio_base_usd?: number;
  peso_kg?: number;
  disponibilidad?: Disponibilidad;
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  imagen_url: string;
  precio_usd: number;              // precio de reventa (mostrado al cliente)
  precio_anterior_usd?: number;    // precio tachado si hay descuento
  categoria: string;
  subcategoria?: string;
  peso_estimado_kg: number;
  url_shein: string;               // legado; equivalente a source_url
  activo: boolean;
  created_at: string;
  // --- Campos del catálogo de dropshipping ---
  external_id?: string;
  source?: CatalogoSource;
  source_url?: string;
  slug?: string;
  descripcion?: string;
  imagenes?: string[];
  destacado?: boolean;
  disponibilidad?: Disponibilidad;
  variantes?: VarianteCatalogo[];
  last_synced_at?: string | null;
  updated_at?: string;
}

// Fila cruda de la tabla `catalogo` (incluye el precio base INTERNO).
// Nunca se envía tal cual al frontend público; ver toProductoPublico().
export interface CatalogoRow extends ProductoCatalogo {
  precio_base_usd?: number;
}

export interface ConfigApp {
  comision_pct: number;
  proteccion_activa: boolean;
  tasa_bsd: number;
  whatsapp: string;
  mensaje_checkout: string;
  metodos_pago: MetodoPago[];
  // Markup de reventa del catálogo (%). El 20% ya es el margen: en artículos de
  // catálogo NO se apila la comisión del flujo por enlace.
  catalogo_markup_pct: number;
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
