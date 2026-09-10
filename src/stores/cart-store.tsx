"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import type { CartItem, MenuItem } from "@/types";
import { generateId } from "@/lib/utils";

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: { menuItem: MenuItem; quantity: number; specialInstructions?: string } }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_RESTAURANT"; payload: { id: string; name: string } };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const { menuItem, quantity, specialInstructions } = action.payload;
      if (state.restaurantId && state.restaurantId !== menuItem.restaurantId) {
        return {
          items: [
            {
              id: generateId(),
              menuItem,
              quantity,
              specialInstructions,
            },
          ],
          restaurantId: menuItem.restaurantId,
          restaurantName: null,
        };
      }
      const existing = state.items.find(
        (item) =>
          item.menuItem.id === menuItem.id &&
          item.specialInstructions === specialInstructions
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
          restaurantId: state.restaurantId || menuItem.restaurantId,
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: generateId(),
            menuItem,
            quantity,
            specialInstructions,
          },
        ],
        restaurantId: state.restaurantId || menuItem.restaurantId,
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case "UPDATE_QUANTITY":
      if (action.payload.quantity < 1) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case "CLEAR_CART":
      return { items: [], restaurantId: null, restaurantName: null };
    case "SET_RESTAURANT":
      return { ...state, restaurantId: action.payload.id, restaurantName: action.payload.name };
    default:
      return state;
  }
};

interface CartContextValue extends CartState {
  addItem: (menuItem: MenuItem, quantity?: number, specialInstructions?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    restaurantId: null,
    restaurantName: null,
  });

  const addItem = useCallback(
    (menuItem: MenuItem, quantity = 1, specialInstructions?: string) =>
      dispatch({ type: "ADD_ITEM", payload: { menuItem, quantity, specialInstructions } }),
    []
  );

  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", payload: { id } }),
    []
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } }),
    []
  );

  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const total = useMemo(
    () => state.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
    [state.items]
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  const value = useMemo(
    () => ({ ...state, addItem, removeItem, updateQuantity, clearCart, total, itemCount }),
    [state, addItem, removeItem, updateQuantity, clearCart, total, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartStore() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartStore must be used within a CartProvider");
  }
  return context;
}
