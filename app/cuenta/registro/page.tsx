'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { Loader2, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const { refrescar } = useAuth();

  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', password: '' });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [revisaCorreo, setRevisaCorreo] = useState(false);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      // El nombre y teléfono van como metadata; un trigger crea el perfil automáticamente
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nombre: form.nombre.trim(),
            telefono: form.telefono.trim(),
          },
        },
      });
      if (authError) {
        setError(authError.message.includes('already')
          ? 'Ya existe una cuenta con este correo. Inicia sesión.'
          : 'No se pudo crear la cuenta. Intenta de nuevo.');
        return;
      }

      if (data.session) {
        // Sesión inmediata (sin confirmación de correo) → al dashboard
        await refrescar();
        router.push('/cuenta');
      } else {
        // Confirmación de correo activada → avisar al usuario
        setRevisaCorreo(true);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  if (revisaCorreo) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-[#1A1A1A] mb-2">Revisa tu correo</h1>
            <p className="text-gray-500 text-sm mb-6">
              Te enviamos un enlace de confirmación a <strong>{form.email}</strong>.
              Confírmalo y luego inicia sesión.
            </p>
            <Link href="/cuenta/login" className="inline-block bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3D3D3D] transition-colors">
              Ir a iniciar sesión
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2 text-center">Crear cuenta</h1>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Guarda tu historial, vuelve a pedir en un clic y sigue tus envíos.
          </p>

          <form onSubmit={registrar} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo</label>
              <input
                type="text" required value={form.nombre}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Tu nombre"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp</label>
              <input
                type="tel" required value={form.telefono}
                onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="+58 414 1234567"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
              <input
                type="email" autoComplete="email" required value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@correo.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
              <input
                type="password" autoComplete="new-password" required value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit" disabled={cargando}
              className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {cargando ? 'Creando...' : 'Crear cuenta'}
            </button>

            <p className="text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link href="/cuenta/login" className="text-[#1A1A1A] font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
