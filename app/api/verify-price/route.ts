import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('screenshot') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Captura requerida' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType =
      (file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif') ||
      'image/jpeg';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Esta es una captura de pantalla de un producto en la app de SHEIN.

TAREA 1 — Precio: Extrae el precio de venta visible (el precio más grande o prominente, normalmente en rojo).

TAREA 3 — Nombre del producto: Extrae el NOMBRE/TÍTULO exacto del producto tal como aparece en la captura (el título descriptivo del artículo, normalmente arriba o junto al precio). Cópialo textual, sin inventar. Si no hay un título claro visible, devuelve "".

TAREA 2 — Peso estimado: Identifica qué tipo de producto es y estima su peso de envío en kg usando esta tabla de referencia:
- Lencería, ropa interior, bikini, calcetines: 0.15 kg
- Camiseta, blusa, top, falda: 0.25 kg
- Vestido, pantalón, jeans, shorts: 0.4 kg
- Suéter, hoodie, chaqueta ligera: 0.6 kg
- Abrigo grueso, chaqueta acolchada: 0.9 kg
- Sandalias, tacones: 0.6 kg
- Tenis, zapatos deportivos: 0.8 kg
- Botas: 1.3 kg
- Bolso, cartera, mochila: 0.6 kg
- Accesorios pequeños (joyería, gafas, gorras): 0.1 kg
- Mousepad, alfombrilla de ratón: 0.5 kg
- Decoración pequeña del hogar: 1 kg
- Electrónico pequeño (audífonos, cargador, cables, smartwatch): 0.4 kg
- Electrónico mediano (teclado, parlante, cámara, tablet, consola portátil): 1 kg
- Electrónico grande (monitor, impresora, equipo voluminoso): 4 kg
- Lámpara, organizador, artículo mediano de hogar: 2.5 kg
- Silla, mesa pequeña, estante: 5 kg
- Escritorio, mueble grande: 8 kg
Si el producto no encaja exactamente, da tu mejor estimación razonable según su tamaño y material.

Responde ÚNICAMENTE con un objeto JSON con este formato exacto:
{"precio": 12.99, "encontrado": true, "peso_kg": 0.4, "categoria": "Vestido", "nombre": "Vestido floral de manga corta"}
Si no hay ningún precio visible:
{"precio": 0, "encontrado": false, "peso_kg": 0, "categoria": "", "nombre": ""}
No incluyas nada más, solo el JSON.`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    let precio = 0;
    let encontrado = false;
    let peso_kg = 0;
    let categoria = '';
    let nombre = '';

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        precio = parsed.precio ?? 0;
        encontrado = parsed.encontrado ?? false;
        peso_kg = Number(parsed.peso_kg) || 0;
        categoria = parsed.categoria ?? '';
        nombre = (parsed.nombre ?? '').toString().trim();
      }
    } catch {
      return NextResponse.json({ error: 'No se pudo analizar la imagen' }, { status: 422 });
    }

    if (!encontrado || precio === 0) {
      return NextResponse.json({
        ok: false,
        encontrado: false,
        precio: 0,
        mensaje: 'No se encontró un precio visible en la captura. Asegúrate de que el precio del producto sea claramente visible en la pantalla.',
      });
    }

    // Salvaguarda: peso razonable (entre 0.1 y 30 kg), por defecto 0.3
    if (!peso_kg || peso_kg < 0.1) peso_kg = 0.3;
    if (peso_kg > 30) peso_kg = 30;

    return NextResponse.json({ ok: true, encontrado: true, precio, peso_kg, categoria, nombre });
  } catch (e) {
    console.error('[verify-price]', e);
    return NextResponse.json({ error: 'Error al analizar la imagen' }, { status: 500 });
  }
}
