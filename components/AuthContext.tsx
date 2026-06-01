'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Perfil {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  rol: string;
}

interface AuthContextValue {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = useCallback(async (u: User | null) => {
    if (!u) {
      setPerfil(null);
      return;
    }
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle();
    setPerfil(data ?? null);
  }, []);

  const refrescar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    await cargarPerfil(session?.user ?? null);
  }, [cargarPerfil]);

  useEffect(() => {
    refrescar().finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        cargarPerfil(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, [refrescar, cargarPerfil]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, refrescar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
