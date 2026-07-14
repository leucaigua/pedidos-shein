// Tipos de la capa de proveedor de catálogo (fuente externa: AliExpress / manual).
// Los tipos de dominio (ProductoCatalogo, VarianteCatalogo, etc.) viven en '@/types'.
import type {
  CatalogoSource,
  Disponibilidad,
  VarianteCatalogo,
} from '@/types';

export type OrdenCatalogo = 'relevancia' | 'precio_asc' | 'precio_desc';

export interface ProductSearchParams {
  query?: string;
  categoria?: string;
  precioMin?: number;   // en USD, sobre el precio BASE de la fuente
  precioMax?: number;
  orden?: OrdenCatalogo;
  pagina?: number;      // 1-based
  porPagina?: number;
}

// Producto tal como lo entrega el PROVEEDOR (precios BASE, sin markup).
// El markup de reventa se aplica en el servidor al importar/mostrar.
export interface ProviderProduct {
  externalId: string;
  source: CatalogoSource;
  sourceUrl: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  subcategoria?: string;
  precioBaseUsd: number;
  precioAnteriorUsd?: number;
  imagenes: string[];
  pesoKg?: number;
  disponibilidad: Disponibilidad;
  variantes: VarianteCatalogo[];
}

export interface ProductSearchResult {
  productos: ProviderProduct[];
  pagina: number;
  porPagina: number;
  total?: number;      // total estimado si la fuente lo entrega
  hayMas: boolean;
}

export interface AvailabilityResult {
  disponibilidad: Disponibilidad;
  precioBaseUsd?: number;   // precio base actualizado, si la fuente lo entrega
}
