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
- 📦 **Catalog** of featured products
- 👤 **User accounts** and order tracking ("My orders")
- 📨 **Newsletter** and subscriber capture
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
| HTTP | Axios |
| Icons | Lucide React |
| Hosting | [Netlify](https://www.netlify.com) (`@netlify/plugin-nextjs`) |
| Node | ≥ 20.9.0 |

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
- 📦 **Catálogo** de productos destacados
- 👤 **Cuentas de usuario** y seguimiento de pedidos ("Mis pedidos")
- 📨 **Newsletter** y captación de suscriptores
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
| HTTP | Axios |
| Iconos | Lucide React |
| Hosting | [Netlify](https://www.netlify.com) (`@netlify/plugin-nextjs`) |
| Node | ≥ 20.9.0 |


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


## Sobre mí

Hola 👋 Soy **Leu Caigua**, desarrolladora y creadora de esta plataforma. Construí
Pedidos SHEIN para resolver un problema real en Venezuela: dar acceso a las compras
en SHEIN a personas que no cuentan con una tarjeta internacional, con precios
transparentes y una experiencia sencilla de principio a fin.

- 💼 GitHub: [@leucaigua](https://github.com/leucaigua)
- 📧 Contacto: leurisecaigua@gmail.com

> *¿Sugerencias o dudas? Toda contribución y feedback es bienvenido.*
