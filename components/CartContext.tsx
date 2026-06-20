'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ItemCarrito } from '@/types';

interface CartState {
  items: ItemCarrito[];
}

type CartAction =
  | { type: 'ADD'; item: ItemCarrito }
  | { type: 'ADD_MANY'; items: ItemCarrito[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_QTY'; id: string; cantidad: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD':
      return { items: [...state.items, action.item] };
    case 'ADD_MANY':
      return { items: [...state.items, ...action.items] };
    case 'REMOVE':
      return { items: state.items.filter((i) => i.id !== action.id) };
    case 'UPDATE_QTY':
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, cantidad: action.cantidad } : i
        ),
      };
    case 'CLEAR':
      return { items: [] };
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
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, (init) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pedidos-shein-cart');
      if (saved) {
        try {
          return { items: JSON.parse(saved) };
        } catch {}
      }
    }
    return init;
  });

  useEffect(() => {
    localStorage.setItem('pedidos-shein-cart', JSON.stringify(state.items));
  }, [state.items]);

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

  function clearCart() {
    dispatch({ type: 'CLEAR' });
  }

  const totalItems = state.items.reduce((acc: number, i: ItemCarrito) => acc + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items: state.items, addItem, addMany, removeItem, updateQty, clearCart, totalItems }}
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
