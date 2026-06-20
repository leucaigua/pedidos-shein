import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { esAdmin, tokenDeRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ItemCotizacion {
  numero: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'PDF requerido' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Este PDF es una cotización de productos de SHEIN con forma de tabla. Cada fila tiene: un número de ítem, una IMAGEN del producto, la cantidad y el total (precio en USD de esa fila).

TAREA: Por cada fila/ítem de la tabla, devuelve:
- "numero": el número del ítem.
- "nombre": un nombre corto y descriptivo del producto EN ESPAÑOL, basándote en lo que ves en la imagen (ej. "Audífonos diadema transparente", "Funda de teléfono Hello Kitty rosada", "Suéter tejido rosado", "Top deportivo negro"). Sé específico con el tipo de producto y color. NO inventes marcas ni texto que no se vea.
- "cantidad": la cantidad (columna Cantidad).
- "total": el total de esa fila como número (columna Total), sin símbolo de moneda.

También devuelve "total_general": el total general de la cotización (la fila "Total").

Responde ÚNICAMENTE con un objeto JSON con este formato exacto, sin texto adicional:
{"items":[{"numero":1,"nombre":"Audífonos diadema transparente","cantidad":1,"total":8.24}],"total_general":84.51}`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();

    let items: ItemCotizacion[] = [];
    let total_general = 0;

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Sin JSON');
      const parsed = JSON.parse(match[0]);
      items = (parsed.items || [])
        .map((it: Record<string, unknown>, i: number) => ({
          numero: Number(it.numero) || i + 1,
          nombre: String(it.nombre || '').trim() || `Producto ${i + 1}`,
          cantidad: Math.max(1, Number(it.cantidad) || 1),
          total: Number(it.total) || 0,
        }))
        .filter((it: ItemCotizacion) => it.total > 0);
      total_general = Number(parsed.total_general) || items.reduce((a, it) => a + it.total, 0);
    } catch {
      return NextResponse.json(
        { error: 'No se pudo leer la cotización del PDF. Verifica que sea una cotización válida.' },
        { status: 422 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No se detectaron artículos en el PDF.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, items, total_general });
  } catch (e) {
    console.error('[cotizacion]', e);
    return NextResponse.json({ error: 'Error al procesar el PDF' }, { status: 500 });
  }
}
