import { useState, useCallback, useEffect } from 'react';

export interface CartItem {
  uid: string;           // unique key for UI (product_id + timestamp)
  product_id: string;
  product_name: string;
  category: 'cartridge' | 'device';
  product_type: string;  // 'foundation' | 'lipstick' | 'skin-device'
  shade_name?: string;
  shade_hex?: string;
  cartridge_id?: string;
  cartridge_percentage?: number;
  finish?: string;
  quantity: number;
  price: number;
  addedAt: number;
}

const CART_STORAGE_KEY = 'ss-cart-items';

function loadFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / privacy errors
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());

  // Keep in sync across tabs
  useEffect(() => {
    const handler = () => setItems(loadFromStorage());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'uid' | 'addedAt'>) => {
    setItems((prev) => {
      // Deduplicate by product_id — update quantity if already exists
      const existing = prev.findIndex((i) => i.product_id === item.product_id);
      let next: CartItem[];
      if (existing !== -1) {
        next = prev.map((i, idx) =>
          idx === existing ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      } else {
        const newItem: CartItem = {
          ...item,
          uid: `${item.product_id}-${Date.now()}`,
          addedAt: Date.now(),
        };
        next = [...prev, newItem];
      }
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((uid: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.uid !== uid);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, cartCount, addItem, removeItem, clearCart };
}
