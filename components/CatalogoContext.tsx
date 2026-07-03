'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CatalogoContextValue {
  /** true cuando el admin ya subió al menos un producto activo */
  hayCatalogo: boolean;
  cargando: boolean;
}

const CatalogoContext = createContext<CatalogoContextValue | null>(null);

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const [hayCatalogo, setHayCatalogo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/catalogo')
      .then((r) => r.json())
      .then((d) => setHayCatalogo((d.productos ?? []).length > 0))
      .catch(() => setHayCatalogo(false))
      .finally(() => setCargando(false));
  }, []);

  return (
    <CatalogoContext.Provider value={{ hayCatalogo, cargando }}>
      {children}
    </CatalogoContext.Provider>
  );
}

export function useCatalogo() {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider');
  return ctx;
}
