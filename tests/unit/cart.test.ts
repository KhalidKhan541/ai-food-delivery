import { describe, it, expect, beforeEach, jest } from "@jest/globals";

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  addedAt: Date;
}

interface Cart {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  promoCode?: string;
  tip: number;
  createdAt: Date;
  updatedAt: Date;
}

function createCart(userId: string, restaurantId: string, restaurantName: string): Cart {
  return {
    id: `cart-${Date.now()}`,
    userId,
    restaurantId,
    restaurantName,
    items: [],
    tip: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function addToCart(
  cart: Cart,
  item: Omit<CartItem, "id" | "addedAt">
): Cart {
  const existingIndex = cart.items.findIndex(
    (i) => i.menuItemId === item.menuItemId
  );

  const updatedItems = [...cart.items];

  if (existingIndex >= 0) {
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + item.quantity,
    };
  } else {
    updatedItems.push({
      ...item,
      id: `item-${Date.now()}-${Math.random()}`,
      addedAt: new Date(),
    });
  }

  return { ...cart, items: updatedItems, updatedAt: new Date() };
}

function removeFromCart(cart: Cart, itemId: string): Cart {
  return {
    ...cart,
    items: cart.items.filter((i) => i.id !== itemId),
    updatedAt: new Date(),
  };
}

function updateCartItemQuantity(
  cart: Cart,
  itemId: string,
  quantity: number
): Cart {
  if (quantity < 0) throw new Error("Quantity cannot be negative");
  if (quantity === 0) return removeFromCart(cart, itemId);

  return {
    ...cart,
    items: cart.items.map((i) =>
      i.id === itemId ? { ...i, quantity } : i
    ),
    updatedAt: new Date(),
  };
}

function getCartTotal(cart: Cart): {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
} {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const freeDeliveryThreshold = 25;
  const defaultDeliveryFee = 3.99;
  const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : defaultDeliveryFee;
  const tip = cart.tip;
  const total = Math.round((subtotal + tax + deliveryFee + tip) * 100) / 100;

  return { subtotal, tax, deliveryFee, tip, total };
}

function getCartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

function validateCart(cart: Cart): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (cart.items.length === 0) {
    errors.push("Cart is empty");
  }

  for (const item of cart.items) {
    if (item.quantity <= 0) {
      errors.push(`Item "${item.name}" has invalid quantity`);
    }
    if (item.price < 0) {
      errors.push(`Item "${item.name}" has negative price`);
    }
  }

  return { valid: errors.length === 0, errors };
}

describe("Cart Unit Tests", () => {
  let cart: Cart;

  beforeEach(() => {
    cart = createCart("user-1", "rest-1", "Pizza Palace");
  });

  describe("createCart", () => {
    it("should create an empty cart", () => {
      expect(cart.items).toHaveLength(0);
      expect(cart.userId).toBe("user-1");
      expect(cart.restaurantId).toBe("rest-1");
    });

    it("should set initial timestamp", () => {
      expect(cart.createdAt).toBeDefined();
      expect(cart.updatedAt).toBeDefined();
    });
  });

  describe("addToCart", () => {
    it("should add a new item to cart", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].name).toBe("Margherita Pizza");
    });

    it("should increment quantity for existing item", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 2,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(3);
    });

    it("should add different items separately", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      cart = addToCart(cart, {
        menuItemId: "menu-2",
        name: "Caesar Salad",
        price: 8.99,
        quantity: 1,
      });

      expect(cart.items).toHaveLength(2);
    });

    it("should preserve special instructions", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
        specialInstructions: "Extra cheese, no olives",
      });

      expect(cart.items[0].specialInstructions).toBe("Extra cheese, no olives");
    });

    it("should not mutate original cart", () => {
      const originalItems = [...cart.items];
      addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      expect(cart.items).toEqual(originalItems);
    });
  });

  describe("removeFromCart", () => {
    it("should remove item from cart", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      const itemId = cart.items[0].id;
      cart = removeFromCart(cart, itemId);

      expect(cart.items).toHaveLength(0);
    });

    it("should not affect other items", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      cart = addToCart(cart, {
        menuItemId: "menu-2",
        name: "Caesar Salad",
        price: 8.99,
        quantity: 1,
      });
      const firstItemId = cart.items[0].id;
      cart = removeFromCart(cart, firstItemId);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].name).toBe("Caesar Salad");
    });

    it("should handle removing non-existent item", () => {
      cart = removeFromCart(cart, "nonexistent-id");
      expect(cart.items).toHaveLength(0);
    });
  });

  describe("updateCartItemQuantity", () => {
    it("should update item quantity", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      const itemId = cart.items[0].id;
      cart = updateCartItemQuantity(cart, itemId, 5);

      expect(cart.items[0].quantity).toBe(5);
    });

    it("should remove item when quantity set to 0", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 3,
      });
      const itemId = cart.items[0].id;
      cart = updateCartItemQuantity(cart, itemId, 0);

      expect(cart.items).toHaveLength(0);
    });

    it("should throw error for negative quantity", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 1,
      });
      const itemId = cart.items[0].id;

      expect(() => updateCartItemQuantity(cart, itemId, -1)).toThrow(
        "Quantity cannot be negative"
      );
    });
  });

  describe("getCartTotal", () => {
    it("should calculate subtotal", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 2,
      });

      const totals = getCartTotal(cart);
      expect(totals.subtotal).toBe(25.98);
    });

    it("should calculate tax at 8%", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 2,
      });

      const totals = getCartTotal(cart);
      expect(totals.tax).toBe(2.08);
    });

    it("should apply delivery fee for orders under threshold", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 5.99,
        quantity: 1,
      });

      const totals = getCartTotal(cart);
      expect(totals.deliveryFee).toBe(3.99);
    });

    it("should offer free delivery above threshold", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Feast",
        price: 30.00,
        quantity: 1,
      });

      const totals = getCartTotal(cart);
      expect(totals.deliveryFee).toBe(0);
    });

    it("should include tip in total", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        price: 12.99,
        quantity: 2,
      });
      cart = { ...cart, tip: 5.00 };

      const totals = getCartTotal(cart);
      expect(totals.tip).toBe(5.00);
      expect(totals.total).toBeGreaterThan(totals.subtotal + totals.tax + totals.deliveryFee);
    });

    it("should return zero totals for empty cart", () => {
      const totals = getCartTotal(cart);
      expect(totals.subtotal).toBe(0);
      expect(totals.tax).toBe(0);
      expect(totals.total).toBe(0);
    });

    it("should calculate total with multiple items", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Pizza",
        price: 12.99,
        quantity: 2,
      });
      cart = addToCart(cart, {
        menuItemId: "menu-2",
        name: "Salad",
        price: 8.99,
        quantity: 1,
      });

      const totals = getCartTotal(cart);
      expect(totals.subtotal).toBe(34.97);
    });
  });

  describe("getCartItemCount", () => {
    it("should return total quantity of all items", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Pizza",
        price: 12.99,
        quantity: 3,
      });
      cart = addToCart(cart, {
        menuItemId: "menu-2",
        name: "Salad",
        price: 8.99,
        quantity: 1,
      });

      expect(getCartItemCount(cart)).toBe(4);
    });

    it("should return 0 for empty cart", () => {
      expect(getCartItemCount(cart)).toBe(0);
    });
  });

  describe("validateCart", () => {
    it("should validate a valid cart", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Pizza",
        price: 12.99,
        quantity: 1,
      });

      const result = validateCart(cart);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty cart", () => {
      const result = validateCart(cart);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Cart is empty");
    });

    it("should reject item with negative price", () => {
      cart = addToCart(cart, {
        menuItemId: "menu-1",
        name: "Pizza",
        price: -5,
        quantity: 1,
      });

      const result = validateCart(cart);
      expect(result.valid).toBe(false);
    });
  });
});
