'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, Copy, Check, Tag } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function suscribir(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEstado('enviando');
    setMensaje('');
    try {
      const res = await fetch('/api/suscriptores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setEstado('error');
        setMensaje(data.error ?? 'No se pudo suscribir. Intenta de nuevo.');
        return;
      }
      setEstado('ok');
      setCodigo(data.codigo ?? null);
      if (data.yaSuscrito) {
        setMensaje(data.codigo
          ? '¡Ya estabas suscrito! Este es tu código:'
          : '¡Ya estabas suscrito! Tu cupón ya fue usado.');
      } else {
        setMensaje('¡Listo! Usa este código en tu primer pedido:');
      }
      setEmail('');
    } catch {
      setEstado('error');
      setMensaje('Error de conexión. Intenta de nuevo.');
    }
  }

  function copiar() {
    if (!codigo) return;
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      <p className="font-semibold mb-2 text-gray-300 text-sm uppercase tracking-wide">Newsletter</p>
      <p className="text-sm text-gray-400 mb-3 leading-relaxed">
        Suscríbete y recibe un <span className="text-white font-semibold">10% de descuento</span> en tu primer pedido.
      </p>

      {estado === 'ok' ? (
        <div>
          <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{mensaje}</span>
          </div>
          {codigo && (
            <button
              onClick={copiar}
              className="w-full flex items-center justify-between gap-2 bg-white/10 border border-dashed border-white/30 rounded-lg px-3 py-2.5 hover:bg-white/15 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-white" />
                <span className="font-mono font-bold text-white tracking-wide">{codigo}</span>
              </span>
              {copiado
                ? <Check className="w-4 h-4 text-green-400" />
                : <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />}
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={suscribir} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
          />
          <button
            type="submit"
            disabled={estado === 'enviando'}
            className="bg-white text-[#1A1A1A] px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors disabled:opacity-60 flex items-center justify-center flex-shrink-0"
            aria-label="Suscribirse"
          >
            {estado === 'enviando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}

      {estado === 'error' && <p className="text-xs text-red-400 mt-2">{mensaje}</p>}
    </div>
  );
}
