// Proveedor de catálogo intercambiable. La fuente externa se selecciona con la
// variable de entorno CATALOGO_PROVIDER (aliexpress | manual).
//
// El proveedor representa la FUENTE EXTERNA usada por:
//   • el admin, para buscar e importar productos a la tabla `catalogo`, y
//   • el checkout, para re-verificar precio/disponibilidad antes de pagar.
// La vista pública SIEMPRE lee de la tabla `catalogo` (DB propia), no del proveedor.
import type { CatalogoSource, VarianteCatalogo } from '@/types';
import type {
  AvailabilityResult,
  ProductSearchParams,
  ProductSearchResult,
  ProviderProduct,
} from './types';

export interface CatalogProvider {
  readonly id: CatalogoSource;
  /** ¿Puede consultar la fuente externa? (false en modo manual sin credenciales) */
  readonly disponible: boolean;

  searchProducts(params: ProductSearchParams): Promise<ProductSearchResult>;
  getProduct(externalId: string): Promise<ProviderProduct | null>;
  getVariants(externalId: string): Promise<VarianteCatalogo[]>;
  checkAvailability(
    externalId: string,
    variantId?: string
  ): Promise<AvailabilityResult>;
}

let singleton: CatalogProvider | null = null;

/** Devuelve el proveedor configurado (memoizado). Solo servidor. */
export function getCatalogProvider(): CatalogProvider {
  if (singleton) return singleton;

  const modo = (process.env.CATALOGO_PROVIDER ?? 'manual').toLowerCase();

  // Import perezoso para no cargar el cliente de AliExpress en modo manual.
  if (modo === 'aliexpress') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AliexpressProvider } = require('./aliexpress') as typeof import('./aliexpress');
    singleton = new AliexpressProvider();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ManualProvider } = require('./manual') as typeof import('./manual');
    singleton = new ManualProvider();
  }
  return singleton;
}

/** Solo para tests: reinicia el proveedor memoizado. */
export function __resetCatalogProvider(): void {
  singleton = null;
}
