import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { CartItem, Product } from '../types';

interface CartItemWithProduct extends CartItem {
  products: Product;
}

interface CartContextType {
  items: CartItemWithProduct[];
  loading: boolean;
  addItem: (product: Product | string, quantity?: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_CART_STORAGE_KEY = 'nestobi:guest-cart:v1';

function readGuestCart() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItemWithProduct[]).filter(item => item.product_id && item.products) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(nextItems: CartItemWithProduct[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextItems));
}

function clearGuestCart() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

function createGuestCartItem(product: Product, quantity: number): CartItemWithProduct {
  return {
    id: `guest-${product.id}`,
    user_id: 'guest',
    product_id: product.id,
    quantity,
    created_at: new Date().toISOString(),
    products: product,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems(readGuestCart());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('tbl_mn5uxems')
      .select('*, products(*)')
      .eq('user_id', user.id);
    setItems((data as CartItemWithProduct[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const migrateGuestCart = async () => {
      if (!user) return;

      const guestItems = readGuestCart();
      if (guestItems.length === 0) return;

      const productIds = guestItems.map(item => item.product_id);
      const { data: existingItems } = await supabase
        .from('tbl_mn5uxems')
        .select('id, product_id, quantity')
        .eq('user_id', user.id)
        .in('product_id', productIds);

      const existingByProduct = new Map(
        ((existingItems as Pick<CartItemWithProduct, 'id' | 'product_id' | 'quantity'>[]) || []).map(item => [item.product_id, item]),
      );

      const results = await Promise.all(guestItems.map(item => {
        const existing = existingByProduct.get(item.product_id);
        if (existing) {
          return supabase
            .from('tbl_mn5uxems')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
        }

        return supabase
          .from('tbl_mn5uxems')
          .insert({ user_id: user.id, product_id: item.product_id, quantity: item.quantity });
      }));

      if (!results.some(result => result.error)) clearGuestCart();
    };

    const loadCart = async () => {
      await migrateGuestCart();
      await fetchCart();
    };

    loadCart();
  }, [fetchCart, user]);

  const addItem = async (product: Product | string, quantity = 1) => {
    const productId = typeof product === 'string' ? product : product.id;

    if (!user) {
      const productData = typeof product === 'string'
        ? items.find(item => item.product_id === productId)?.products || (await supabase.from('products').select('*').eq('id', productId).maybeSingle()).data as Product | null
        : product;

      if (!productData) return;

      setItems(prev => {
        const existing = prev.find(item => item.product_id === productId);
        const next = existing
          ? prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + quantity } : item)
          : [...prev, createGuestCartItem(productData, quantity)];
        writeGuestCart(next);
        return next;
      });
      return;
    }

    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      await supabase
        .from('tbl_mn5uxems')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('tbl_mn5uxems')
        .insert({ user_id: user.id, product_id: productId, quantity });
    }
    await fetchCart();
  };

  const removeItem = async (cartItemId: string) => {
    if (!user) {
      setItems(prev => {
        const next = prev.filter(i => i.id !== cartItemId);
        writeGuestCart(next);
        return next;
      });
      return;
    }

    await supabase.from('tbl_mn5uxems').delete().eq('id', cartItemId);
    setItems(prev => prev.filter(i => i.id !== cartItemId));
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) { await removeItem(cartItemId); return; }
    if (!user) {
      setItems(prev => {
        const next = prev.map(i => i.id === cartItemId ? { ...i, quantity } : i);
        writeGuestCart(next);
        return next;
      });
      return;
    }

    await supabase.from('tbl_mn5uxems').update({ quantity }).eq('id', cartItemId);
    setItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity } : i));
  };

  const clearCart = async () => {
    if (!user) {
      clearGuestCart();
      setItems([]);
      return;
    }
    await supabase.from('tbl_mn5uxems').delete().eq('user_id', user.id);
    setItems([]);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.products?.price ?? 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, loading, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalPrice, refresh: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
