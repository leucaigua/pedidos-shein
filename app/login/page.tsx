'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        return;
      }
      router.push('/admin/pedidos');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-3xl font-display font-bold text-white mb-1">
            Pedidos<span className="text-[#888888]">SHEIN</span>
          </p>
          <p className="text-gray-400 text-sm">Panel de administrador</p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="bg-white rounded-2xl shadow-xl p-8 space-y-5"
        >
          <h1 className="text-xl font-display font-bold text-[#1A1A1A]">
            Iniciar sesión
          </h1>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              placeholder="admin@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#1A1A1A] hover:bg-[#3D3D3D] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
