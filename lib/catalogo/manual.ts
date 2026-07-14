// Proveedor MANUAL (respaldo). No hay fuente externa que consultar: el admin
// carga productos por URL (scrape) o a mano, y las lecturas del catálogo salen
// de la DB. Aquí la búsqueda externa no aplica y la verificación queda como
// 'desconocido' (el admin confirma manualmente antes de procesar el pago).
import type { VarianteCatalogo } from '@/types';
import type { CatalogProvider } from './provider';
import type {
  AvailabilityResult,
  ProductSearchParams,
  ProductSearchResult,
  ProviderProduct,
} from './types';

export class ManualProvider implements CatalogProvider {
  readonly id = 'manual' as const;
  readonly disponible = false;

  async searchProducts(_params: ProductSearchParams): Promise<ProductSearchResult> {
    return { productos: [], pagina: 1, porPagina: 0, hayMas: false };
  }

  async getProduct(_externalId: string): Promise<ProviderProduct | null> {
    return null;
  }

  async getVariants(_externalId: string): Promise<VarianteCatalogo[]> {
    return [];
  }

  async checkAvailability(): Promise<AvailabilityResult> {
    // Sin fuente externa no se puede verificar automáticamente.
    return { disponibilidad: 'desconocido' };
  }
}
