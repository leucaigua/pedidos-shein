'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import type { ItemCarrito } from '@/types';

// El carrito caduca a las 24 horas por las fluctuaciones de inventario/precios de SHEIN.
const CART_TTL_MS = 24 * 60 * 60 * 1000;
const CART_KEY = 'pedidos-shein-cart';
const CART_TS_KEY = 'pedidos-shein-cart-updated';

interface CartState {
  items: ItemCarrito[];
  updatedAt: number;
}

type CartAction =
  | { type: 'ADD'; item: ItemCarrito }
  | { type: 'ADD_MANY'; items: ItemCarrito[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; cantidad: number }
  | { type: 'UPDATE_WEIGHT'; id: string; pesoKg: number }
  | { type: 'REPLACE'; items: ItemCarrito[] }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  const now = Date.now();
  switch (action.type) {
    case 'ADD':
      return { items: [...state.items, action.item], updatedAt: now };
    case 'ADD_MANY':
      return { items: [...state.items, ...action.items], updatedAt: now };
    case 'REMOVE':
      return { items: state.items.filter((i) => i.id !== action.id), updatedAt: now };
    case 'UPDATE_QTY':
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, cantidad: action.cantidad } : i
        ),
        updatedAt: now,
      };
    case 'UPDATE_WEIGHT':
      if (!Number.isFinite(action.pesoKg) || action.pesoKg <= 0) return state;
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, peso_kg: action.pesoKg } : i
        ),
        updatedAt: now,
      };
    case 'REPLACE':
      return { items: action.items, updatedAt: now };
    case 'CLEAR':
      return { items: [], updatedAt: now };
    default:
      return state;
  }
}

interface CartContextValue {
  items: ItemCarrito[];
  addItem: (item: Omit<ItemCarrito, 'id'>) => void;
  addMany: (items: Omit<ItemCarrito, 'id'>[]) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, cantidad: number) => void;
  updateWeight: (id: string, pesoKg: number) => void;
  replaceItems: (items: ItemCarrito[]) => void;
  clearCart: () => void;
  totalItems: number;
  pagoTotal: boolean;
  setPagoTotal: (value: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children, storageKey = CART_KEY }: { children: React.ReactNode; storageKey?: string }) {
  const [pagoTotal, setPagoTotal] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(`${storageKey}-pago-total`) === 'true'
  );
  useEffect(() => {
    localStorage.setItem(`${storageKey}-pago-total`, String(pagoTotal));
  }, [storageKey, pagoTotal]);
  const timestampKey = storageKey === CART_KEY ? CART_TS_KEY : `${storageKey}-updated`;
  const [state, dispatch] = useReducer(cartReducer, { items: [], updatedAt: 0 }, (init) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const items: ItemCarrito[] = JSON.parse(saved);
          const ts = localStorage.getItem(timestampKey);
          const updatedAt = ts ? Number(ts) : Date.now();
          // Si ya pasaron 24 horas desde la última actualización, se vacía el carrito.
          if (Date.now() - updatedAt > CART_TTL_MS) {
            return { items: [], updatedAt: Date.now() };
          }
          return { items, updatedAt };
        } catch {}
      }
    }
    return { ...init, updatedAt: Date.now() };
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state.items));
    localStorage.setItem(timestampKey, String(state.updatedAt));
  }, [state.items, state.updatedAt, storageKey, timestampKey]);

  // Vacía el carrito cuando se cumplen las 24 horas, incluso con la pestaña abierta.
  useEffect(() => {
    function checkExpiry() {
      if (state.items.length > 0 && Date.now() - state.updatedAt > CART_TTL_MS) {
        dispatch({ type: 'CLEAR' });
      }
    }
    checkExpiry();
    const interval = setInterval(checkExpiry, 60 * 1000);
    window.addEventListener('focus', checkExpiry);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkExpiry);
    };
  }, [state.items, state.updatedAt, storageKey, timestampKey]);

  function addItem(item: Omit<ItemCarrito, 'id'>) {
    dispatch({
      type: 'ADD',
      item: { ...item, id: crypto.randomUUID() },
    });
  }

  function addMany(items: Omit<ItemCarrito, 'id'>[]) {
    dispatch({
      type: 'ADD_MANY',
      items: items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    });
  }

  function removeItem(id: string) {
    dispatch({ type: 'REMOVE', id });
  }

  function updateQty(id: string, cantidad: number) {
    dispatch({ type: 'UPDATE_QTY', id, cantidad });
  }

  function updateWeight(id: string, pesoKg: number) {
    dispatch({ type: 'UPDATE_WEIGHT', id, pesoKg });
  }

  function replaceItems(items: ItemCarrito[]) {
    dispatch({ type: 'REPLACE', items });
  }

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const totalItems = state.items.reduce((acc: number, i: ItemCarrito) => acc + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items: state.items, addItem, addMany, removeItem, updateQty, updateWeight, replaceItems, clearCart, totalItems, pagoTotal, setPagoTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
