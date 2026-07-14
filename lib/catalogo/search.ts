// Motor de búsqueda del catálogo. Los nombres de producto vienen en INGLÉS
// (AliExpress) pero los clientes buscan en ESPAÑOL. Este módulo:
//  1) quita acentos y palabras vacías,
//  2) traduce cada término con un diccionario español→inglés,
//  3) arma un filtro OR de PostgREST contra `nombre` (inglés) y `categoria` (español).

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'para',
  'con', 'en', 'del', 'al', 'por', 'a', 'mi', 'tu', 'su', 'lo', 'que',
]);

// Español (sin acentos) → posibles términos en inglés que aparecen en los nombres.
const SINONIMOS: Record<string, string[]> = {
  // Género / genéricos
  ropa: ['clothing', 'clothes', 'apparel', 'wear', 'outfit'],
  mujer: ['women', 'woman', 'female', 'ladies', 'lady'],
  mujeres: ['women', 'female', 'ladies'],
  hombre: ['men', 'man', 'male'],
  hombres: ['men', 'male'],
  dama: ['women', 'ladies'], damas: ['women', 'ladies'],
  caballero: ['men'], nina: ['girl', 'kids'], nino: ['boy', 'kids'],
  ninos: ['kids', 'children'], bebe: ['baby'], bebes: ['baby'],
  // Ropa
  vestido: ['dress'], vestidos: ['dress'],
  blusa: ['blouse', 'shirt', 'top'], blusas: ['blouse', 'top'],
  camisa: ['shirt'], camisas: ['shirt'],
  camiseta: ['t-shirt', 'tshirt', 'tee'], franela: ['t-shirt', 'tee'],
  pantalon: ['pants', 'trousers'], pantalones: ['pants', 'trousers'],
  jean: ['jeans', 'denim'], jeans: ['jeans', 'denim'],
  falda: ['skirt'], faldas: ['skirt'],
  short: ['shorts'], shorts: ['shorts'], bermuda: ['shorts'],
  chaqueta: ['jacket', 'coat'], abrigo: ['coat', 'jacket'],
  sueter: ['sweater'], sudadera: ['hoodie', 'sweatshirt'],
  pijama: ['pajama', 'pajamas', 'pyjama', 'sleepwear'],
  interior: ['underwear', 'lingerie'], ropa_interior: ['underwear'],
  lenceria: ['lingerie'], brasier: ['bra'], sujetador: ['bra'],
  leggins: ['leggings'], leggings: ['leggings'], licra: ['leggings'],
  traje: ['suit', 'set'], conjunto: ['set', 'outfit'], bikini: ['bikini', 'swimwear'],
  // Zapatos
  zapato: ['shoes', 'footwear'], zapatos: ['shoes', 'footwear'],
  sandalia: ['sandals'], sandalias: ['sandals'],
  tacon: ['heels'], tacones: ['heels'],
  bota: ['boots'], botas: ['boots'],
  zapatilla: ['sneakers'], zapatillas: ['sneakers'],
  deportivos: ['sneakers', 'sport'], cholas: ['slippers', 'sandals'],
  // Accesorios
  cartera: ['bag', 'handbag', 'purse'], carteras: ['bag', 'handbag'],
  bolso: ['bag', 'handbag'], bolsos: ['bag', 'handbag'], bolsa: ['bag'],
  mochila: ['backpack'], morral: ['backpack'],
  reloj: ['watch'], relojes: ['watch'],
  lentes: ['sunglasses', 'glasses'], gafas: ['sunglasses', 'glasses'], anteojos: ['sunglasses'],
  collar: ['necklace'], collares: ['necklace'],
  arete: ['earring', 'earrings'], aretes: ['earrings'], zarcillo: ['earrings'], zarcillos: ['earrings'],
  pulsera: ['bracelet'], pulseras: ['bracelet'], anillo: ['ring'], anillos: ['ring'],
  cadena: ['chain', 'necklace'], gorra: ['cap', 'hat'], gorro: ['hat', 'beanie'], sombrero: ['hat'],
  cinturon: ['belt'], correa: ['belt', 'strap'], bufanda: ['scarf'],
  // Belleza
  maquillaje: ['makeup', 'cosmetic', 'cosmetics'],
  brocha: ['brush'], brochas: ['brush', 'brushes'],
  pestana: ['eyelash', 'lashes'], pestanas: ['eyelash', 'eyelashes', 'lashes'],
  labial: ['lipstick', 'lip'], labiales: ['lipstick'], brillo: ['lip', 'gloss'],
  sombra: ['eyeshadow'], sombras: ['eyeshadow'], delineador: ['eyeliner'], rimel: ['mascara'],
  base: ['foundation'], polvo: ['powder'], rubor: ['blush'], corrector: ['concealer'],
  una: ['nail', 'nails'], unas: ['nail', 'nails'], esmalte: ['nail', 'polish'],
  cabello: ['hair'], pelo: ['hair'], peluca: ['wig'], extensiones: ['hair', 'extensions'],
  peine: ['comb'], cepillo: ['brush'], secador: ['hair', 'dryer'], plancha: ['hair', 'straightener'],
  perfume: ['perfume', 'fragrance'], crema: ['cream'], piel: ['skin', 'skincare'],
  facial: ['facial', 'face'], serum: ['serum'], mascarilla: ['mask'],
  // Tecnología
  audifono: ['earbuds', 'earphone', 'headphones'], audifonos: ['earbuds', 'earphone', 'earphones', 'headphones'],
  auricular: ['earphone', 'headphones'], auriculares: ['earphones', 'headphones'],
  cargador: ['charger'], cargadores: ['charger'], cable: ['cable', 'cord'], cables: ['cable'],
  bateria: ['power', 'battery'], powerbank: ['power', 'bank'],
  forro: ['case', 'cover'], funda: ['case', 'cover'], estuche: ['case'], protector: ['protector', 'case'],
  smartwatch: ['smart', 'watch'], parlante: ['speaker'], corneta: ['speaker'], bocina: ['speaker'],
  audio: ['speaker', 'sound'], microfono: ['microphone', 'mic'], teclado: ['keyboard'], raton: ['mouse'],
  soporte: ['holder', 'stand'], tripode: ['tripod'], aro: ['ring', 'light'],
  luz: ['light', 'led'], luces: ['light', 'lights', 'led'], memoria: ['memory', 'usb'], usb: ['usb'],
  // Hogar
  cocina: ['kitchen'], hogar: ['home'], casa: ['home'],
  organizador: ['organizer'], organizadores: ['organizer'], almacenamiento: ['storage'],
  decoracion: ['decor', 'decoration'], adorno: ['decor'],
  sabana: ['bedding', 'sheets'], sabanas: ['bedding', 'sheets'], almohada: ['pillow'], cobija: ['blanket'],
  bano: ['bathroom', 'bath'], toalla: ['towel'], utensilio: ['utensil', 'gadget'], utensilios: ['kitchen', 'gadget'],
  vaso: ['cup', 'glass'], taza: ['mug', 'cup'], termo: ['bottle', 'thermos'], botella: ['bottle'],
  // Bebés / niños / juguetes
  juguete: ['toy'], juguetes: ['toys'], muneca: ['doll'], peluche: ['plush'],
};

// Palabras cuya coincidencia también se busca en la columna `categoria` (español).
const A_CATEGORIA = new Set(['ropa', 'zapatos', 'zapato', 'belleza', 'hogar', 'accesorios', 'tecnologia']);

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function esc(term: string): string {
  // Quita caracteres que rompen el parser de or() y usa % para espacios.
  return term.replace(/[%,()*]/g, '').trim().replace(/\s+/g, '%');
}

/**
 * Devuelve el string para supabase.or(...) o null si no hay términos útiles.
 * Ej: "ropa de mujer" → busca categoría Ropa + nombres con clothing/women/…
 */
export function orDeBusqueda(q: string): string | null {
  const tokens = normalizar(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  if (tokens.length === 0) return null;

  const conds = new Set<string>();
  for (const token of tokens) {
    const t = esc(token);
    if (t) conds.add(`nombre.ilike.%${t}%`);
    // La categoría está en español: coincide con el token tal cual.
    if (A_CATEGORIA.has(token) || token.length >= 4) conds.add(`categoria.ilike.%${t}%`);
    for (const syn of SINONIMOS[token] ?? []) {
      const s = esc(syn);
      if (s) conds.add(`nombre.ilike.%${s}%`);
    }
  }
  if (conds.size === 0) return null;
  // Límite prudente de condiciones.
  return [...conds].slice(0, 40).join(',');
}
