-- ============================================================
-- MIGRACIÓN: Carritos / checkouts abandonados
-- Ejecutar en el SQL Editor de supabase.com
--
-- Guarda los datos de contacto de clientes que llegaron al checkout
-- (nombre, WhatsApp, email, artículos) pero NO confirmaron el pedido,
-- para poder enviarles recordatorios ("tu carrito expira") u ofertas.
-- ============================================================

CREATE TABLE IF NOT EXISTS checkouts_abandonados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,   -- identificador persistente del navegador del cliente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Datos de contacto capturados en el checkout (parciales)
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  cliente_estado TEXT,

  -- Artículos y montos (recalculados en el servidor)
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,

  -- Recuperación: se marca cuando el mismo checkout termina en un pedido
  recuperado BOOLEAN DEFAULT false,
  recuperado_en TIMESTAMPTZ,
  pedido_codigo TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkouts_abandonados_updated_at ON checkouts_abandonados(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkouts_abandonados_recuperado ON checkouts_abandonados(recuperado);
CREATE INDEX IF NOT EXISTS idx_checkouts_abandonados_telefono ON checkouts_abandonados(cliente_telefono);

-- ⚠️ SEGURIDAD: la tabla contiene PII (nombre, teléfono, email). Igual que en
-- `pedidos`, NO hay políticas públicas: toda lectura/escritura pasa por la API
-- del servidor con service_role_key (que bypasea RLS):
--   • Captura pública    → POST /api/checkouts-abandonados
--   • Panel admin        → GET/DELETE /api/admin/checkouts-abandonados/*
-- Con la anon key (pública) NO se puede leer ni escribir directamente.
ALTER TABLE checkouts_abandonados ENABLE ROW LEVEL SECURITY;
