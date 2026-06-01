import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import type { ProductoScraped } from '@/types';

function extraerNombreDeUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    // Acepta sufijos opcionales como -cat-1764 antes de .html
    const match = pathname.match(/\/([^/?]+?)-p-\d+(?:-[^/?]*)?\.html/);
    if (!match) return '';
    const slug = match[1];

    // Slug con guiones (escritorio): Women-s-Dress → Women's Dress
    if (slug.includes('-')) {
      return slug.replace(/-s-/g, "'s ").replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Slug camelCase sin guiones (móvil m.shein.com)
    let name = slug.replace(/([a-z0-9])([A-Z])/g, '$1 $2');       // 2New → 2 New
    name = name.replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');     // PUMaterial → PU Material
    name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');         // KUnderarm → K Underarm
    name = name.replace(/,/g, ', ');
    return name.trim();
  } catch {
    return '';
  }
}

function runPythonScraper(url: string): Promise<ProductoScraped> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scraper', 'shein_scraper.py');
    const cmd = `python3 "${scriptPath}" "${url.replace(/"/g, '\\"')}"`;

    const child = exec(cmd, { timeout: 35000 }, (error, stdout, stderr) => {
      if (stderr) console.error('[scraper stderr]', stderr.slice(0, 200));

      try {
        const data = JSON.parse(stdout.trim());
        resolve({
          ok: data.ok && !!data.nombre,
          nombre: data.nombre || '',
          precio: data.precio || 0,
          imagen: data.imagen || '',
          url,
        });
      } catch {
        // Fallback: al menos el nombre desde la URL
        const nombre = extraerNombreDeUrl(url);
        resolve({ ok: !!nombre, nombre, precio: 0, imagen: '', url });
      }
    });

    // Si el proceso tarda demasiado, matar y devolver fallback
    child.on('error', () => {
      const nombre = extraerNombreDeUrl(url);
      resolve({ ok: !!nombre, nombre, precio: 0, imagen: '', url });
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }
    if (!url.includes('shein.com')) {
      return NextResponse.json({ error: 'Solo se aceptan links de SHEIN' }, { status: 400 });
    }

    const producto = await runPythonScraper(url);

    if (!producto.ok) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        url,
        mensaje: 'No se pudo extraer el producto. Por favor llena los datos manualmente.',
      });
    }

    return NextResponse.json({ ok: true, producto });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
