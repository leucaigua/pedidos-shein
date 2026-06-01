import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generarCodigoCupon } from '@/lib/cupones';
import { esAdmin, tokenDeRequest } from '@/lib/auth';
import type { SupabaseClient } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crea un cupón único reintentando si hay colisión de código
async function crearCupon(supabase: SupabaseClient, email: string) {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoCupon();
    const { data, error } = await supabase
      .from('cupones')
      .insert({ codigo, email, descuento_pct: 10 })
      .select('codigo, descuento_pct')
      .single();
    if (!error && data) return data;
    if (error && error.code !== '23505') break; // error distinto a colisión
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
    }
    const correo = email.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('suscriptores').insert({ email: correo });

    if (error) {
      // 23505 = ya suscrito → devolver su cupón existente (sin usar) si lo tiene
      if (error.code === '23505') {
        const { data: cuponExistente } = await supabase
          .from('cupones')
          .select('codigo, descuento_pct, usado')
          .eq('email', correo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return NextResponse.json({
          ok: true,
          yaSuscrito: true,
          codigo: cuponExistente && !cuponExistente.usado ? cuponExistente.codigo : null,
          descuento_pct: cuponExistente?.descuento_pct ?? 10,
          usado: cuponExistente?.usado ?? false,
        });
      }
      return NextResponse.json({ error: 'No se pudo suscribir' }, { status: 500 });
    }

    // Nuevo suscriptor → generar cupón de bienvenida
    const cupon = await crearCupon(supabase, correo);

    return NextResponse.json({
      ok: true,
      codigo: cupon?.codigo ?? null,
      descuento_pct: cupon?.descuento_pct ?? 10,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await esAdmin(tokenDeRequest(req)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('suscriptores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, suscriptores: data ?? [] });
}
