'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useCart } from '@/components/CartContext';
import { supabase } from '@/lib/supabase';
import type { Cotizacion, ConfigApp } from '@/types';

const KEY = 'pedidos-shein-admin-cotizacion';
interface Draft { id: string; clienteNombre: string; codigo: string }
const EMPTY: Draft = { id: '', clienteNombre: '', codigo: '' };
interface QuoteContext {
  config: ConfigApp | null;
  clienteNombre: string;
  codigo: string;
  setClienteNombre: (nombre: string) => void;
  guardar: () => Promise<Cotizacion>;
  nueva: () => Promise<void>;
  abrir: (cotizacion: Cotizacion) => Promise<void>;
  sincronizar: (cotizacion: Cotizacion) => void;
  guardando: boolean;
  error: string;
}
const Context = createContext<QuoteContext | null>(null);

export function AdminCotizacionProvider({ children }: { children: React.ReactNode }) {
  const { items, pagoTotal, setPagoTotal, replaceItems, clearCart } = useCart();
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === 'undefined') return EMPTY;
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return EMPTY; }
  });
  const [config, setConfig] = useState<ConfigApp | null>(null);
  useEffect(() => {
    fetch('/api/config').then((res) => res.json()).then((data) => { if (data.config) setConfig(data.config); }).catch(() => {});
  }, []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const currentId = useRef(draft.id);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(draft)); }, [draft]);

  const descartar = useCallback((id: string) => {
    if (currentId.current !== id) return;
    // Invalida también los guardados pendientes de la cotización anterior.
    currentId.current = '';
    setDraft({ ...EMPTY });
    clearCart();
    setPagoTotal(false);
    setError('');
  }, [clearCart, setPagoTotal]);

  function sincronizar(cotizacion: Cotizacion) {
    if (cotizacion.archivado || cotizacion.estado === 'no_procesada') descartar(cotizacion.id);
  }

  async function consultarActual() {
    if (!draft.id || !draft.codigo) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const res = await fetch(`/api/admin/cotizaciones/${draft.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const message = data.error || 'No se pudo verificar la cotización actual.';
      setError(message);
      throw new Error(message);
    }
    return data.cotizacion as Cotizacion;
  }

  // Limpia un borrador guardado que se haya archivado desde otra sesión.
  useEffect(() => {
    if (!draft.id || !draft.codigo) return;
    let active = true;
    async function verificar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/admin/cotizaciones/${draft.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const { cotizacion } = await res.json();
        if (active && (cotizacion.archivado || cotizacion.estado === 'no_procesada')) descartar(draft.id);
      } catch { /* Un fallo de red no debe borrar el borrador. */ }
    }
    verificar();
    window.addEventListener('focus', verificar);
    return () => { active = false; window.removeEventListener('focus', verificar); };
  }, [draft.id, draft.codigo, descartar]);

  const guardar = useCallback(async (): Promise<Cotizacion> => {
    if (!draft.clienteNombre.trim() || !items.length) {
      const message = 'Ingresa el nombre del cliente y agrega artículos antes de guardar.';
      setError(message);
      throw new Error(message);
    }
    const snapshot = { id: draft.id, cliente_nombre: draft.clienteNombre, items, pago_total: pagoTotal };
    const task = async () => {
      if (snapshot.id !== currentId.current) throw new Error('La cotización ya no está en curso.');
      setGuardando(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
        const res = await fetch('/api/admin/cotizaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(snapshot),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409) descartar(snapshot.id);
          throw new Error(data.error || 'No se pudo guardar la cotización.');
        }
        const saved: Cotizacion = data.cotizacion;
        window.dispatchEvent(new Event('admin-cotizacion-guardada'));
        if (currentId.current === snapshot.id) setDraft((old) => ({ ...old, codigo: saved.codigo }));
        return saved;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error de conexión';
        if (currentId.current === snapshot.id) setError(message);
        throw new Error(message);
      } finally { setGuardando(false); }
    };
    const next = queue.current.catch(() => {}).then(task);
    queue.current = next;
    return next;
  }, [draft.id, draft.clienteNombre, items, pagoTotal, descartar]);

  // Los cambios de peso/cantidad y modalidad actualizan el mismo registro.
  useEffect(() => {
    if (!draft.id || !draft.clienteNombre.trim() || !items.length) return;
    const timer = setTimeout(() => { guardar().catch(() => {}); }, 1200);
    return () => clearTimeout(timer);
  }, [draft.id, draft.clienteNombre, items, pagoTotal, guardar]);

  function setClienteNombre(clienteNombre: string) {
    setDraft((old) => {
      const id = old.id || crypto.randomUUID();
      currentId.current = id;
      return { ...old, id, clienteNombre };
    });
  }

  async function nueva() {
    const actual = await consultarActual();
    const terminada = actual?.archivado || actual?.estado === 'no_procesada';
    if (terminada) descartar(draft.id);
    else if (items.length) {
      try { await guardar(); }
      catch (e) { if (currentId.current === draft.id) throw e; }
    }
    await queue.current.catch(() => {});
    const fresh = { ...EMPTY, id: crypto.randomUUID() };
    currentId.current = fresh.id;
    setDraft(fresh);
    clearCart();
    setPagoTotal(false);
    setError('');
  }

  async function abrir(cotizacion: Cotizacion) {
    if (cotizacion.archivado || cotizacion.estado === 'no_procesada') throw new Error('Esta cotización ya no está en curso. Cambia su estado antes de editarla.');
    if (items.length && draft.id !== cotizacion.id) {
      const actual = await consultarActual();
      if (actual?.archivado || actual?.estado === 'no_procesada') descartar(draft.id);
      else await guardar();
    }
    // Termina cualquier escritura del borrador previo antes de cambiar de cliente.
    await queue.current.catch(() => {});
    currentId.current = cotizacion.id;
    setDraft({ id: cotizacion.id, codigo: cotizacion.codigo, clienteNombre: cotizacion.cliente_nombre });
    replaceItems(cotizacion.items);
    setPagoTotal(cotizacion.pago_total);
    setError('');
  }

  return <Context.Provider value={{ config, clienteNombre: draft.clienteNombre, codigo: draft.codigo, setClienteNombre, guardar, nueva, abrir, sincronizar, guardando, error }}>{children}</Context.Provider>;
}

export function useAdminCotizacion() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta AdminCotizacionProvider');
  return value;
}

export function useOptionalAdminCotizacion() {
  return useContext(Context);
}
