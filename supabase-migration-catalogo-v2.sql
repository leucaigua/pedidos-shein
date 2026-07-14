-- ============================================================
-- MIGRACIÓN: Catálogo de dropshipping (AliExpress API + manual)
-- Ejecutar en el SQL Editor de supabase.com
--
-- Evoluciona la tabla `catalogo` existente para funcionar como una tienda de
-- reventa que se llena desde una fuente externa (AliExpress vía API oficial) o
-- de forma manual. El precio mostrado al cliente (precio_usd) es de REVENTA:
--   precio_usd = round(precio_base_usd × (1 + catalogo_markup_pct/100))
-- El cálculo del markup ocurre SOLO en el servidor; el cliente nunca fija precios.
--
-- Migración ADITIVA: no elimina ni cambia columnas existentes.
-- ============================================================

-- --- Origen del producto -------------------------------------------------
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS external_id TEXT;             -- id del producto en la fuente (AliExpress)
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- 'aliexpress' | 'manual' | 'shein'
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS source_url TEXT;              -- URL del producto en la fuente
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS slug TEXT;                    -- URL amigable: /catalogo/:slug

-- --- Precio (modelo reventa) ---------------------------------------------
-- ⚠️ precio_base_usd es INTERNO (precio de la fuente). NO debe exponerse en el
--    frontend. Las lecturas públicas del catálogo se hacen por la API del
--    servidor seleccionando columnas explícitas (sin precio_base_usd).
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS precio_base_usd NUMERIC(10, 2);
-- Precio anterior (tachado) para mostrar % de descuento en reventa.
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS precio_anterior_usd NUMERIC(10, 2);

-- --- Ficha de producto ---------------------------------------------------
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]';  -- galería: string[]
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS subcategoria TEXT;
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;

-- disponibilidad: 'disponible' | 'pocas' | 'agotado' | 'desconocido'
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS disponibilidad TEXT DEFAULT 'disponible';

-- variantes: JSONB array. Cada item:
--   { id, sku, color, talla, modelo, imagen, precio_base_usd, peso_kg, disponibilidad }
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS variantes JSONB DEFAULT '[]';

-- --- Sincronización ------------------------------------------------------
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE catalogo ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- --- Índices -------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogo_slug ON catalogo(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalogo_external_id ON catalogo(external_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_source ON catalogo(source);
CREATE INDEX IF NOT EXISTS idx_catalogo_categoria ON catalogo(categoria);
CREATE INDEX IF NOT EXISTS idx_catalogo_activo ON catalogo(activo);
CREATE INDEX IF NOT EXISTS idx_catalogo_destacado ON catalogo(destacado);
-- Evita importar dos veces el mismo producto de la misma fuente
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogo_source_external
  ON catalogo(source, external_id) WHERE external_id IS NOT NULL;

-- --- Configuración: porcentaje de markup de reventa ----------------------
-- Editable en /admin/config. El precio de venta se recalcula en el servidor.
INSERT INTO config (clave, valor) VALUES ('catalogo_markup_pct', '20')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- NOTA RLS: la política "Catálogo activo es público" permite SELECT de TODAS
-- las columnas de productos activos con la anon key. Como ahora existe
-- precio_base_usd (interno), las lecturas públicas deben pasar por la API del
-- servidor (GET /api/catalogo), que selecciona columnas explícitas sin el
-- precio base. Restringir columnas a nivel de RLS (vía vista) queda como
-- endurecimiento de una fase posterior.
-- ============================================================
