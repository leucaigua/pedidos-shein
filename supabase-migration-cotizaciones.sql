-- Cotizaciones guardadas. Ejecutar en el SQL Editor de Supabase.
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (estado IN ('aprobada', 'pendiente_aprobacion', 'no_procesada')),
  items JSONB NOT NULL DEFAULT '[]',
  pago_total BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_envio NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_proteccion NUMERIC(12,2) NOT NULL DEFAULT 0,
  comision NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  archivado BOOLEAN NOT NULL DEFAULT false,
  archivado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_created_at ON public.cotizaciones(created_at DESC);
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: acceso exclusivo por API con service_role y rol admin.
REVOKE ALL ON public.cotizaciones FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cotizaciones TO service_role;
