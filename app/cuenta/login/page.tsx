'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { refrescar } = useAuth();
  const destino = params.get('next') || '/cuenta';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Correo o contraseña incorrectos.');
        return;
      }
      await refrescar();
      router.push(destino);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-display font-bold text-[#1A1A1A] mb-2 text-center">
            Iniciar sesión
          </h1>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Accede a tu historial de pedidos y vuelve a comprar fácilmente.
          </p>

          <form onSubmit={ingresar} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
              <input
                type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
              <input
                type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {cargando ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <Link href="/cuenta/registro" className="text-[#1A1A1A] font-semibold hover:underline">
                Regístrate
              </Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
