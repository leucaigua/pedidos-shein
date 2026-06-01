'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Download, RefreshCw } from 'lucide-react';

interface Suscriptor {
  id: string;
  email: string;
  created_at: string;
}

export default function AdminSuscriptoresPage() {
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/suscriptores', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setSuscriptores(data.suscriptores ?? []);
    } catch {
      setSuscriptores([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function exportarCSV() {
    const filas = [
      ['Email', 'Fecha de suscripción'],
      ...suscriptores.map((s) => [
        s.email,
        new Date(s.created_at).toLocaleDateString('es-VE'),
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Suscriptores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {suscriptores.length} suscriptor{suscriptores.length !== 1 ? 'es' : ''} al newsletter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A1A] transition-colors px-3 py-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={exportarCSV}
            disabled={suscriptores.length === 0}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
        </div>
      ) : suscriptores.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Mail className="w-12 h-12 mb-3" />
          <p className="font-medium">Sin suscriptores aún</p>
          <p className="text-sm mt-1">Los correos del formulario del newsletter aparecerán aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Correo
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suscriptores.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-[#212121] font-medium">{s.email}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {new Date(s.created_at).toLocaleDateString('es-VE', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
