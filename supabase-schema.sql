-- ============================================================
-- PEDIDOS SHEIN — Esquema Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de supabase.com
-- ============================================================

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'pendiente_pago',

  -- Datos del cliente
  cliente_nombre TEXT NOT NULL,
  cliente_cedula TEXT,
  cliente_telefono TEXT NOT NULL,
  cliente_estado TEXT,
  cliente_direccion TEXT,
  nota_cliente TEXT,
  nota_admin TEXT,

  -- Financiero
  subtotal NUMERIC(10, 2) DEFAULT 0,
  costo_envio NUMERIC(10, 2) DEFAULT 0,
  costo_proteccion NUMERIC(10, 2) DEFAULT 0,
  comision NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  metodo_pago TEXT,

  -- Artículos del pedido (JSON array)
  -- Cada item: { nombre, url_shein, imagen, precio_usd, talla, color, cantidad, peso_kg }
  items JSONB NOT NULL DEFAULT '[]'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_codigo ON pedidos(codigo);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);

-- Tabla de catálogo curado
CREATE TABLE IF NOT EXISTS catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  imagen_url TEXT,
  precio_usd NUMERIC(10, 2) NOT NULL,
  categoria TEXT,
  peso_estimado_kg NUMERIC(5, 2) DEFAULT 0.3,
  url_shein TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de perfiles de usuario (clientes y admin), ligada a auth.users
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  rol TEXT DEFAULT 'cliente',  -- 'cliente' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vincular pedidos a un usuario (opcional: pedidos como invitado quedan en NULL)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_email TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_telefono ON pedidos(cliente_telefono);

-- Tabla de configuración (clave-valor)
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

-- Tabla de suscriptores al newsletter
CREATE TABLE IF NOT EXISTS suscriptores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suscriptores_created_at ON suscriptores(created_at DESC);

-- Tabla de cupones de descuento (1 por suscriptor, uso único)
CREATE TABLE IF NOT EXISTS cupones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  email TEXT,
  descuento_pct NUMERIC DEFAULT 10,
  usado BOOLEAN DEFAULT false,
  usado_en TIMESTAMPTZ,
  pedido_codigo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones(codigo);

-- Columnas de descuento en pedidos (si la tabla ya existe)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_cupon TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0;

-- Seguimiento de envío ZOOM (visible para el cliente cuando el pedido está en tránsito)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tracking_numero TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Valores por defecto de configuración
INSERT INTO config (clave, valor) VALUES
  ('comision_pct', '10'),
  ('proteccion_activa', 'true'),
  ('tasa_bsd', '40'),
  ('whatsapp', ''),
  ('mensaje_checkout', 'Gracias por tu pedido. Nos comunicaremos contigo en menos de 24 horas.'),
  ('metodos_pago', '[
    {"id":"binance","nombre":"Binance Pay (USDT)","activo":true,"instrucciones":"Envía el pago a nuestro ID de Binance Pay.","datos_cuenta":""},
    {"id":"zelle","nombre":"Zelle","activo":true,"instrucciones":"Envía el pago por Zelle al correo indicado.","datos_cuenta":""},
    {"id":"pago_movil","nombre":"Pago Móvil / Transferencia Bs","activo":true,"instrucciones":"Realiza el pago móvil a los datos indicados.","datos_cuenta":""},
    {"id":"efectivo","nombre":"Efectivo USD","activo":false,"instrucciones":"Pago en efectivo al momento de la entrega.","datos_cuenta":""}
  ]')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en pedidos
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Los pedidos son de solo lectura públicamente (para consultar por código)
CREATE POLICY "Lectura pública de pedidos por código"
  ON pedidos FOR SELECT
  USING (true);

-- Solo autenticados pueden insertar pedidos (lo hace la API con service role)
-- Nota: el INSERT se hace desde la API con service_role_key que bypasea RLS

-- Habilitar RLS en catálogo
ALTER TABLE catalogo ENABLE ROW LEVEL SECURITY;

-- El catálogo activo es público
CREATE POLICY "Catálogo activo es público"
  ON catalogo FOR SELECT
  USING (activo = true);

-- Habilitar RLS en config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- La config es de solo lectura pública
CREATE POLICY "Config es pública de solo lectura"
  ON config FOR SELECT
  USING (true);

-- Habilitar RLS en suscriptores (alta y lectura solo vía API con service role)
ALTER TABLE suscriptores ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: el INSERT y SELECT se hacen desde la API con service_role_key

-- Habilitar RLS en cupones (validación y canje solo vía API con service role)
ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: se opera desde la API con service_role_key

-- RLS en perfiles: cada usuario solo ve y edita su propio perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil propio select" ON perfiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfil propio insert" ON perfiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "perfil propio update" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse un usuario
-- Lee nombre/telefono desde la metadata enviada en signUp.
-- Funciona con o sin confirmación de correo activada.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, telefono, rol)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'nombre',
    NEW.raw_user_meta_data ->> 'telefono',
    'cliente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- IMPORTANTE: marcar tu usuario admin como rol 'admin'
-- (reemplaza el correo por el del admin que creaste en Authentication)
-- ============================================================
-- INSERT INTO perfiles (id, email, rol)
-- SELECT id, email, 'admin' FROM auth.users WHERE email = 'TU_CORREO_ADMIN@correo.com'
-- ON CONFLICT (id) DO UPDATE SET rol = 'admin';

-- ============================================================
-- FUNCIÓN HELPER: generar código de pedido
-- ============================================================
CREATE OR REPLACE FUNCTION generar_codigo_pedido()
RETURNS TEXT AS $$
DECLARE
  fecha TEXT;
  seq TEXT;
BEGIN
  fecha := TO_CHAR(NOW(), 'YYYYMMDD');
  seq := LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
  RETURN 'PS-' || fecha || '-' || seq;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DATOS DE EJEMPLO (opcional, eliminar en producción)
-- ============================================================

-- INSERT INTO catalogo (nombre, precio_usd, categoria, peso_estimado_kg, activo)
-- VALUES
--   ('Vestido floral manga larga', 15.99, 'Ropa', 0.3, true),
--   ('Jeans skinny tiro alto', 22.50, 'Ropa', 0.5, true),
--   ('Blusa de encaje manga corta', 9.99, 'Ropa', 0.2, true),
--   ('Bolso de cuero sintético', 18.00, 'Accesorios', 0.4, true),
--   ('Sandalias de tacón bajo', 25.00, 'Zapatos', 0.7, true);
