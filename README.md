# Pedidos SHEIN 🛍️

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
