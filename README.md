# Pedidos SHEIN 🛍️

*🇬🇧 English · [🇪🇸 Español](#-español)*

Web platform that lets people in **Venezuela** buy any **SHEIN** product **without needing
an international credit card**. The customer uploads screenshots or links of the products
they want, the platform automatically extracts the price and weight, calculates the air
shipping cost (via **ZOOM Casilleros**) and generates the final total. We buy the products
on the customer's behalf and deliver them in Venezuela.

## How it works

1. **Upload your screenshots** — The customer takes a screenshot (or pastes the link) of
   each SHEIN product with the price visible. Each screenshot is one item of the order.
2. **We calculate your price** — The price and weight of each product are extracted
   automatically and shipping is added. The customer specifies size, model and color.
3. **We confirm and buy** — The customer adds everything to the cart, pays, and we buy
   and ship. They receive it within days in Venezuela.

### Features

- 🖼️ **Automatic product extraction** from SHEIN screenshots or links
- 🧮 **Final price calculation** with currency conversion and weight-based air shipping
- 🛒 **Cart and checkout** with coupon validation
- 💳 **Multiple payment methods**: Pago Móvil (Bs), Zelle, Binance Pay and USD cash
- 🏬 **Dropshipping catalog** — a ready-to-buy store fed from the **AliExpress official
  API** (or manually), with resale pricing, product pages and availability sync
- 👤 **User accounts** and order tracking ("My orders")
- 📨 **Newsletter** and subscriber capture
- 🛒 **Abandoned checkout recovery** — captures the contact of customers who reach
  checkout but don't confirm, with one-tap WhatsApp reminders
- 🔐 **Admin panel** to manage orders, quotes, catalog, subscribers and settings
- 📱 Personalized support via **WhatsApp**
- 🎬 **Self-hosted social feeds** — custom TikTok and Instagram sections on the home page

## Tech stack

| Area | Technology |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database / Auth | [Supabase](https://supabase.com) (Postgres + Auth) |
| AI / Extraction | [Anthropic SDK](https://www.anthropic.com) + Cheerio (scraping) |
| Catalog source | AliExpress Open Platform / Dropshipping API (HMAC-signed) |
| HTTP | Axios |
| Icons | Lucide React |
| Hosting | [Netlify](https://www.netlify.com) (`@netlify/plugin-nextjs`) |
| Node | ≥ 20.9.0 |

## Dropshipping catalog

Beyond the "buy from SHEIN by screenshot" flow, the app now includes a **ready-to-buy
catalog** (`/catalogo`, product pages at `/catalogo/[slug]`) that works as a resale store.
Products are fed into the `catalogo` table from an interchangeable **provider**, selected
with the `CATALOGO_PROVIDER` env var:

- **`aliexpress`** — the official AliExpress Open Platform / Dropshipping API. Requests are
  HMAC-signed server-side; the admin can **search** and **import** products, and price /
  availability are **synced** and **re-verified at checkout**.
- **`manual`** — products are curated by hand, no external credentials required.

**Resale pricing (server-only):** the customer never sets prices. The internal source price
(`precio_base_usd`) is never sent to the browser — the public price is computed on the server
as `precio_usd = round(precio_base_usd × (1 + catalogo_markup_pct/100))`, where the markup
(default **20%**) is editable in `/admin/config`.

**Admin flow (`/admin/catalogo`):** authorize AliExpress via OAuth (tokens stored in
`config`), search by keyword, and import products (with variants, images, weight and
availability). Server endpoints: `POST /api/catalogo/buscar`, `/importar`, `/sincronizar`,
`/verificar`, and `/aliexpress-auth`.

- **Setup:** run `supabase-migration-catalogo-v2.sql` in the Supabase SQL Editor (additive —
  it evolves the existing `catalogo` table), then set the `ALIEXPRESS_*` env vars if using
  the AliExpress provider.

## Social feeds

The home page shows two self-hosted social sections instead of paid third-party widgets
(Elfsight/Behold). Both live in `components/` and are rendered from `app/page.tsx`.

### `TikTokCarousel.tsx`

Auto-scrolling carousel of TikTok videos with hover-to-play preview and arrow navigation.
Video URLs are hardcoded in the `VIDEOS` array at the top of the file — thumbnails and
titles are fetched at runtime from TikTok's public **oEmbed** endpoint (no API key). If a
thumbnail can't be fetched it falls back to a plain card that still links to the video.

- **To update:** paste/replace the TikTok links in the `VIDEOS` array.
- Optional `PROXY` constant to route oEmbed calls through a caching Cloudflare Worker.

### `InstagramFeed.tsx`

Edge-to-edge grid (6 cols desktop / 4 tablet / 3 mobile) of the latest **@shein.maturin**
posts, with video/carousel badges and a hover overlay. It fetches a clean JSON feed from
a **Cloudflare Worker** (`instagram-feed-worker.js`) that talks to the official Instagram
API, caches the response 3 h and auto-refreshes the long-lived token via cron — so the
access token is never exposed to the browser.

- **Config:** set `FEED_URL` at the top of the file to the Worker's `/feed` URL.
- **Fallback:** if `FEED_URL` is empty or the Worker fails, it uses the `MANUAL_POSTS`
  array (and hides the section entirely if there's nothing to show).
- **Worker setup:** see the step-by-step instructions in the header comment of
  `instagram-feed-worker.js` (Instagram professional account + Meta app token + KV binding
  named `IG` + cron trigger).

> Note: because the Worker caches the feed for 3 hours, a brand-new Instagram post can take
> up to ~3 h to appear on the site.

## Abandoned checkouts

The admin panel has an **Abandoned checkouts** section (`/admin/checkouts`), inspired by
Shopify, to recover customers who reach checkout but never confirm the order.

**How it's captured:** on the checkout page, as soon as the customer enters a WhatsApp
number (or is logged in with an email) and has items in the cart, their contact and cart
are saved (debounced) against a persistent browser `session_id`. If they later confirm the
order, that record is marked **Recovered** and linked to the order code.

**In the admin:** two tabs — **No recuperados** (not recovered) / **Recuperados**
(recovered) — plus search by name, phone or email. Each row shows contact, item count,
total and time since last activity, with:

- a **Recordar** button that opens WhatsApp (`wa.me/<phone>`) with a pre-filled reminder
  ("your cart is about to expire — want me to help you finish it?"), tying into the cart's
  24 h TTL,
- a copyable email (for email/Klaviyo campaigns), and delete.

**Security:** the `checkouts_abandonados` table holds PII, so it follows the same posture
as `pedidos` — **RLS enabled with no public policies**. All reads/writes go through the
server API with the `service_role_key`: public capture via `POST /api/checkouts-abandonados`
(rate-limited, totals recalculated server-side) and the admin views via
`/api/admin/checkouts-abandonados` (admin role only).

- **Setup:** run `supabase-migration-checkouts.sql` in the Supabase SQL Editor (also
  included in `supabase-schema.sql`) to create the table before using the feature.

## About me

Hi 👋 I'm **Leu Caigua**, developer and creator of this platform. I built Pedidos SHEIN
to solve a real problem in Venezuela: giving access to SHEIN shopping to people who don't
have an international credit card, with transparent pricing and a simple experience from
start to finish.

- 💼 GitHub: [@leucaigua](https://github.com/leucaigua)
- 📧 Contact: leurisecaigua@gmail.com

> *Suggestions or questions? All contributions and feedback are welcome.*

---

## 🇪🇸 Español

*[🇬🇧 English](#pedidos-shein-) · 🇪🇸 Español*

Plataforma web que permite a personas en **Venezuela** comprar cualquier producto de
**SHEIN sin necesidad de una tarjeta internacional**. El cliente sube capturas o enlaces
de los productos que quiere, la plataforma extrae automáticamente el precio y el peso,
calcula el costo de envío aéreo (vía **ZOOM Casilleros**) y genera el total final.
Nosotros compramos los productos por el cliente y se los entregamos en Venezuela.

## ¿Cómo funciona?

1. **Sube tus capturas** — El cliente toma una captura (o pega el enlace) de cada
   producto de SHEIN con el precio visible. Cada captura es un artículo del pedido.
2. **Calculamos tu precio** — Se extrae automáticamente el precio y el peso de cada
   producto y se suma el envío. El cliente indica talla, modelo y color.
3. **Confirmamos y compramos** — El cliente agrega todo al carrito, paga, y nosotros
   compramos y enviamos. Lo recibe en días en Venezuela.

### Funcionalidades

- 🖼️ **Extracción automática de productos** a partir de capturas o enlaces de SHEIN
- 🧮 **Cálculo de precio final** con conversión y costo de envío aéreo por peso
- 🛒 **Carrito y checkout** con validación de cupones
- 💳 **Múltiples métodos de pago**: Pago Móvil (Bs), Zelle, Binance Pay y efectivo USD
- 🏬 **Catálogo dropshipping** — tienda lista para comprar, alimentada desde la **API
  oficial de AliExpress** (o de forma manual), con precio de reventa, fichas de producto y
  sincronización de disponibilidad
- 👤 **Cuentas de usuario** y seguimiento de pedidos ("Mis pedidos")
- 📨 **Newsletter** y captación de suscriptores
- 🛒 **Recuperación de carritos abandonados** — capta el contacto de clientes que llegan
  al checkout pero no confirman, con recordatorios por WhatsApp en un toque
- 🔐 **Panel de administración** para gestionar pedidos, cotizaciones, catálogo,
  suscriptores y configuración
- 📱 Atención personalizada por **WhatsApp**
- 🎬 **Feeds sociales propios** — secciones a medida de TikTok e Instagram en el home (sin widgets de terceros tipo Elfsight)

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| Base de datos / Auth | [Supabase](https://supabase.com) (Postgres + Auth) |
| IA / Extracción | [Anthropic SDK](https://www.anthropic.com) + Cheerio (scraping) |
| Fuente de catálogo | AliExpress Open Platform / Dropshipping API (firma HMAC) |
| HTTP | Axios |
| Iconos | Lucide React |
| Hosting | [Netlify](https://www.netlify.com) (`@netlify/plugin-nextjs`) |
| Node | ≥ 20.9.0 |


## Catálogo dropshipping

Además del flujo de "comprar de SHEIN por captura", la app ahora incluye un **catálogo
listo para comprar** (`/catalogo`, fichas en `/catalogo/[slug]`) que funciona como tienda de
reventa. Los productos se cargan en la tabla `catalogo` desde un **proveedor** intercambiable,
seleccionado con la variable de entorno `CATALOGO_PROVIDER`:

- **`aliexpress`** — la API oficial de AliExpress (Open Platform / Dropshipping). Las
  peticiones se firman con HMAC en el servidor; el admin puede **buscar** e **importar**
  productos, y el precio / disponibilidad se **sincronizan** y **re-verifican en el checkout**.
- **`manual`** — productos curados a mano, sin credenciales externas.

**Precio de reventa (solo servidor):** el cliente nunca fija precios. El precio interno de la
fuente (`precio_base_usd`) nunca se envía al navegador — el precio público se calcula en el
servidor como `precio_usd = round(precio_base_usd × (1 + catalogo_markup_pct/100))`, donde el
markup (por defecto **20%**) es editable en `/admin/config`.

**Flujo del admin (`/admin/catalogo`):** autorizar AliExpress vía OAuth (tokens guardados en
`config`), buscar por palabra clave e importar productos (con variantes, imágenes, peso y
disponibilidad). Endpoints del servidor: `POST /api/catalogo/buscar`, `/importar`,
`/sincronizar`, `/verificar` y `/aliexpress-auth`.

- **Setup:** ejecuta `supabase-migration-catalogo-v2.sql` en el SQL Editor de Supabase
  (es aditiva — evoluciona la tabla `catalogo` existente) y define las variables `ALIEXPRESS_*`
  si usas el proveedor de AliExpress.

## Feeds sociales

El home muestra dos secciones sociales propias en lugar de widgets de pago de terceros
(Elfsight/Behold). Ambas viven en `components/` y se renderizan desde `app/page.tsx`.

### `TikTokCarousel.tsx`

Carrusel con auto-scroll de videos de TikTok, con previsualización al pasar el mouse
(reproduce el video mudo) y navegación por flechas. Las URLs de los videos están fijas en
el arreglo `VIDEOS` al inicio del archivo — las miniaturas y títulos se obtienen en tiempo
real desde el endpoint público **oEmbed** de TikTok (sin API key). Si una miniatura no se
puede cargar, muestra una tarjeta simple que igual enlaza al video.

- **Para actualizar:** pega/reemplaza los enlaces de TikTok en el arreglo `VIDEOS`.
- Constante `PROXY` opcional para enrutar las llamadas oEmbed por un Worker de Cloudflare
  con caché.

### `InstagramFeed.tsx`

Cuadrícula edge-to-edge (6 columnas en desktop / 4 en tablet / 3 en móvil) con las últimas
publicaciones de **@shein.maturin**, con insignias de video/carrusel y overlay al pasar el
mouse. Obtiene un JSON limpio desde un **Worker de Cloudflare** (`instagram-feed-worker.js`)
que llama a la API oficial de Instagram, cachea la respuesta 3 h y auto-refresca el token
de larga duración por cron — así el token de acceso nunca se expone al navegador.

- **Configuración:** define `FEED_URL` al inicio del archivo con la URL `/feed` del Worker.
- **Fallback:** si `FEED_URL` está vacío o el Worker falla, usa el arreglo `MANUAL_POSTS`
  (y oculta la sección por completo si no hay nada que mostrar).
- **Setup del Worker:** ver el paso a paso en el comentario de cabecera de
  `instagram-feed-worker.js` (cuenta profesional de Instagram + token de la app de Meta +
  binding KV llamado `IG` + trigger de cron).

> Nota: como el Worker cachea el feed durante 3 horas, una publicación nueva de Instagram
> puede tardar hasta ~3 h en aparecer en el sitio.


## Carritos abandonados

El panel admin tiene una sección de **Carritos abandonados** (`/admin/checkouts`), inspirada
en Shopify, para recuperar a los clientes que llegan al checkout pero no confirman el pedido.

**Cómo se captura:** en el checkout, en cuanto el cliente escribe su WhatsApp (o está
logueado con email) y tiene artículos en el carrito, se guarda su contacto y su carrito (con
debounce) asociados a un `session_id` persistente del navegador. Si luego confirma el pedido,
ese registro se marca como **Recuperado** y se vincula al código del pedido.

**En el admin:** dos pestañas — **No recuperados** / **Recuperados** — más búsqueda por
nombre, teléfono o email. Cada fila muestra el contacto, nº de artículos, total y el tiempo
desde la última actividad, con:

- un botón **Recordar** que abre WhatsApp (`wa.me/<teléfono>`) con un recordatorio prellenado
  ("tu carrito está por expirar, ¿te ayudo a completarlo?"), que conecta con el TTL de 24 h
  del carrito,
- el email copiable (para campañas de correo/Klaviyo) y eliminar.

**Seguridad:** la tabla `checkouts_abandonados` contiene PII, así que sigue la misma postura
que `pedidos` — **RLS activado sin políticas públicas**. Toda lectura/escritura pasa por la
API del servidor con la `service_role_key`: captura pública vía `POST /api/checkouts-abandonados`
(con rate-limit y montos recalculados en el servidor) y las vistas del panel vía
`/api/admin/checkouts-abandonados` (solo rol admin).

- **Setup:** ejecuta `supabase-migration-checkouts.sql` en el SQL Editor de Supabase (también
  incluido en `supabase-schema.sql`) para crear la tabla antes de usar la función.


## Sobre mí

Hola 👋 Soy **Leu Caigua**, desarrolladora y creadora de esta plataforma. Construí
Pedidos SHEIN para resolver un problema real en Venezuela: dar acceso a las compras
en SHEIN a personas que no cuentan con una tarjeta internacional, con precios
transparentes y una experiencia sencilla de principio a fin.

- 💼 GitHub: [@leucaigua](https://github.com/leucaigua)
- 📧 Contacto: leurisecaigua@gmail.com

> *¿Sugerencias o dudas? Toda contribución y feedback es bienvenido.*
