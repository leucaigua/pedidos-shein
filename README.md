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


## Sobre mí

Hola 👋 Soy **Leu Caigua**, desarrolladora y creadora de esta plataforma. Construí
Pedidos SHEIN para resolver un problema real en Venezuela: dar acceso a las compras
en SHEIN a personas que no cuentan con una tarjeta internacional, con precios
transparentes y una experiencia sencilla de principio a fin.

- 💼 GitHub: [@leucaigua](https://github.com/leucaigua)
- 📧 Contacto: leurisecaigua@gmail.com

> *¿Sugerencias o dudas? Toda contribución y feedback es bienvenido.*
