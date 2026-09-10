"use client";

import { useState, useCallback, useMemo } from "react";
import type { CartItem, MenuItem } from "@/types";
import { generateId } from "@/lib/utils";

interface UseCartReturn {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number, specialInstructions?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  getItemsByRestaurant: (restaurantId: string) => CartItem[];
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (menuItem: MenuItem, quantity = 1, specialInstructions?: string) => {
      setItems((prev) => {
        const existing = prev.find(
          (item) =>
            item.menuItem.id === menuItem.id &&
            item.specialInstructions === specialInstructions
        );
        if (existing) {
          return prev.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [
          ...prev,
          {
            id: generateId(),
            menuItem,
            quantity,
            specialInstructions,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const getItemsByRestaurant = useCallback(
    (restaurantId: string) =>
      items.filter((item) => item.menuItem.restaurantId === restaurantId),
    [items]
  );

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    getItemsByRestaurant,
  };
}
