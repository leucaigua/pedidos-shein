'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConfigApp, MetodoPago } from '@/types';
import { Loader2, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';

const CONFIG_DEFAULT: ConfigApp = {
  comision_pct: 10,
  proteccion_activa: true,
  tasa_bsd: 40,
  whatsapp: '',
  mensaje_checkout: 'Gracias por tu pedido. Nos comunicaremos contigo en menos de 24 horas.',
  catalogo_markup_pct: 20,
  metodos_pago: [],
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigApp>(CONFIG_DEFAULT);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Enviamos el token para recibir la config completa (incluye métodos
        // de pago desactivados, que el público no recibe).
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/config', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const d = await res.json();
        if (d.config) setConfig(d.config);
      } catch {
        // se queda con CONFIG_DEFAULT
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function guardar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 3000);
      }
    } finally {
      setGuardando(false);
    }
  }

  function updateMetodo(idx: number, field: keyof MetodoPago, value: string | boolean) {
    setConfig((c) => {
      const metodos = [...c.metodos_pago];
      metodos[idx] = { ...metodos[idx], [field]: value };
      return { ...c, metodos_pago: metodos };
    });
  }

  function agregarMetodo() {
    setConfig((c) => ({
      ...c,
      metodos_pago: [
        ...c.metodos_pago,
        {
          id: `metodo_${Date.now()}`,
          nombre: '',
          activo: true,
          instrucciones: '',
          datos_cuenta: '',
        },
      ],
    }));
  }

  function eliminarMetodo(idx: number) {
    setConfig((c) => ({
      ...c,
      metodos_pago: c.metodos_pago.filter((_, i) => i !== idx),
    }));
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A1A]">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ajusta tarifas, comisiones y métodos de pago.</p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D3D3D] transition-colors disabled:opacity-60"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : guardado ? (
            <CheckCircle className="w-4 h-4 text-green-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {guardando ? 'Guardando...' : guardado ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Tarifas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Tarifas del servicio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Comisión del servicio (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={config.comision_pct}
                onChange={(e) => setConfig((c) => ({ ...c, comision_pct: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
              <p className="text-xs text-gray-400 mt-1">Se aplica a &quot;pedir por enlace&quot;. No aplica al catálogo.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Markup del catálogo (%)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                step="1"
                value={config.catalogo_markup_pct}
                onChange={(e) => setConfig((c) => ({ ...c, catalogo_markup_pct: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
              <p className="text-xs text-gray-400 mt-1">Margen de reventa sobre el precio de AliExpress (ej. 20%).</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tasa del día BsD/USD
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={config.tasa_bsd}
                onChange={(e) => setConfig((c) => ({ ...c, tasa_bsd: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
              <p className="text-xs text-gray-400 mt-1">Se usa para mostrar precios en bolívares.</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setConfig((c) => ({ ...c, proteccion_activa: !c.proteccion_activa }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.proteccion_activa ? 'bg-[#1A1A1A]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    config.proteccion_activa ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Activar Protección ZOOM
                <span className="block text-xs text-gray-400 font-normal">
                  $1 para pedidos menores a $100, 1% para mayores.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* WhatsApp y mensajes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-display font-semibold text-[#1A1A1A] mb-4">Contacto y mensajes</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Número de WhatsApp (con código de país)
              </label>
              <input
                type="text"
                value={config.whatsapp}
                onChange={(e) => setConfig((c) => ({ ...c, whatsapp: e.target.value }))}
                placeholder="584141234567"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
              />
              <p className="text-xs text-gray-400 mt-1">Ej: 584141234567 (sin + ni espacios)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Mensaje de confirmación (mostrado al cliente tras el pedido)
              </label>
              <textarea
                rows={3}
                value={config.mensaje_checkout}
                onChange={(e) => setConfig((c) => ({ ...c, mensaje_checkout: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[#1A1A1A]">Métodos de pago</h2>
            <button
              onClick={agregarMetodo}
              className="flex items-center gap-1 text-sm text-[#1A1A1A] hover:underline font-medium"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          <div className="space-y-4">
            {config.metodos_pago.map((metodo, idx) => (
              <div key={metodo.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => updateMetodo(idx, 'activo', !metodo.activo)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        metodo.activo ? 'bg-[#1A1A1A]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          metodo.activo ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Activo</span>
                  </label>
                  <button
                    onClick={() => eliminarMetodo(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del método</label>
                  <input
                    type="text"
                    value={metodo.nombre}
                    onChange={(e) => updateMetodo(idx, 'nombre', e.target.value)}
                    placeholder="Ej. Binance Pay (USDT)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Instrucciones al cliente</label>
                  <input
                    type="text"
                    value={metodo.instrucciones}
                    onChange={(e) => updateMetodo(idx, 'instrucciones', e.target.value)}
                    placeholder="Ej. Envía el pago al siguiente ID de Binance..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Datos de cuenta / ID / Dirección
                  </label>
                  <input
                    type="text"
                    value={metodo.datos_cuenta}
                    onChange={(e) => updateMetodo(idx, 'datos_cuenta', e.target.value)}
                    placeholder="Ej. correo@zelle.com o ID de Binance"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/30 focus:border-[#1A1A1A]"
                  />
                </div>
              </div>
            ))}
            {config.metodos_pago.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">
                No hay métodos de pago configurados. Agrega al menos uno.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
