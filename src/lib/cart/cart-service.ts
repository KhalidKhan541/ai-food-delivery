import { prisma } from "@/lib/prisma";
import { Prisma, Cart, CartItem } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const addToCartSchema = z.object({
  userId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  quantity: z.number().min(1).max(100).default(1),
  specialInstructions: z.string().max(500).optional(),
  variantSelections: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        optionLabel: z.string(),
        priceAdjustment: z.number().default(0),
      })
    )
    .default([]),
  addOns: z
    .array(
      z.object({
        addOnId: z.string(),
        name: z.string(),
        price: z.number().min(0),
        quantity: z.number().min(1).max(10).default(1),
      })
    )
    .default([]),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().min(1).max(100),
  specialInstructions: z.string().max(500).optional(),
});

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  restaurantId: z.string().uuid(),
  subtotal: z.number().min(0),
  userId: z.string().uuid(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export type CartWithRelations = Cart & {
  items: Array<
    CartItem & {
      menuItem: {
        id: string;
        name: string;
        price: number;
        discountPrice: number | null;
        images: string[];
        isAvailable: boolean;
        preparationTime: number | null;
      };
    }
  >;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    deliveryFee: number;
    minOrderAmount: number;
    isOpen: boolean;
    estimatedDeliveryTime: number;
  } | null;
};

export type CartSummary = {
  subtotal: number;
  itemDiscounts: number;
  promoDiscount: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  itemCount: number;
  estimatedDeliveryTime: number;
};

export type AppliedPromo = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  description: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_FEE_PERCENT = 0.05;
const TAX_RATE = 0.08;
const MAX_ITEMS_PER_CART = 50;

// ─── Service ──────────────────────────────────────────────────────────────────

export class CartService {
  /**
   * Get or create a cart for a user.
   */
  static async getOrCreateCart(userId: string): Promise<CartWithRelations> {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                images: true,
                isAvailable: true,
                preparationTime: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            deliveryFee: true,
            minOrderAmount: true,
            isOpen: true,
            estimatedDeliveryTime: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  discountPrice: true,
                  images: true,
                  isAvailable: true,
                  preparationTime: true,
                },
              },
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              deliveryFee: true,
              minOrderAmount: true,
              isOpen: true,
              estimatedDeliveryTime: true,
            },
          },
        },
      });
    }

    return cart;
  }

  /**
   * Add an item to the user's cart.
   * If the cart belongs to a different restaurant, it gets cleared first.
   */
  static async addItem(input: AddToCartInput): Promise<CartWithRelations> {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: input.menuItemId },
    });
    if (!menuItem) throw new Error("Menu item not found");
    if (!menuItem.isAvailable) throw new Error("This item is currently unavailable");
    if (menuItem.restaurantId !== input.restaurantId) {
      throw new Error("Menu item does not belong to this restaurant");
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: { isOpen: true },
    });
    if (!restaurant) throw new Error("Restaurant not found");
    if (!restaurant.isOpen) throw new Error("Restaurant is currently closed");

    let cart = await prisma.cart.findUnique({ where: { userId: input.userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: input.userId } });
    }

    if (cart.restaurantId && cart.restaurantId !== input.restaurantId) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    const currentItemCount = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });
    if (currentItemCount >= MAX_ITEMS_PER_CART) {
      throw new Error(`Cart cannot exceed ${MAX_ITEMS_PER_CART} items`);
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        menuItemId: input.menuItemId,
        specialInstructions: input.specialInstructions ?? null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + input.quantity;
      if (newQuantity > 100) throw new Error("Quantity cannot exceed 100 per item");

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          variantSelections: input.variantSelections,
          addOns: input.addOns,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: input.menuItemId,
          restaurantId: input.restaurantId,
          quantity: input.quantity,
          specialInstructions: input.specialInstructions,
          variantSelections: input.variantSelections,
          addOns: input.addOns,
          unitPrice: menuItem.discountPrice ?? menuItem.price,
          totalPrice: this.calculateItemTotal(
            menuItem.discountPrice ?? menuItem.price,
            input.quantity,
            input.variantSelections,
            input.addOns
          ),
        },
      });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { restaurantId: input.restaurantId },
    });

    return this.getOrCreateCart(input.userId);
  }

  /**
   * Update a cart item's quantity or special instructions.
   */
  static async updateItem(
    cartItemId: string,
    userId: string,
    input: UpdateCartItemInput
  ): Promise<CartWithRelations> {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!item) throw new Error("Cart item not found");
    if (item.cart.userId !== userId) throw new Error("Unauthorized");

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity: input.quantity,
        ...(input.specialInstructions !== undefined && {
          specialInstructions: input.specialInstructions,
        }),
      },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * Remove a single item from the cart.
   */
  static async removeItem(cartItemId: string, userId: string): Promise<CartWithRelations> {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!item) throw new Error("Cart item not found");
    if (item.cart.userId !== userId) throw new Error("Unauthorized");

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    const remainingItems = await prisma.cartItem.count({
      where: { cartId: item.cartId },
    });

    if (remainingItems === 0) {
      await prisma.cart.update({
        where: { id: item.cartId },
        data: { restaurantId: null, promoCode: null, promoDiscount: 0 },
      });
    }

    return this.getOrCreateCart(userId);
  }

  /**
   * Clear all items from the cart.
   */
  static async clearCart(userId: string): Promise<void> {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      prisma.cart.update({
        where: { id: cart.id },
        data: { restaurantId: null, promoCode: null, promoDiscount: 0 },
      }),
    ]);
  }

  /**
   * Apply a promo code to the cart.
   */
  static async applyPromoCode(
    input: ApplyPromoCodeSchema
  ): Promise<{ promo: AppliedPromo; cart: CartWithRelations }> {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: input.code.toUpperCase(),
        isActive: true,
        OR: [
          { restaurantId: input.restaurantId },
          { restaurantId: null, isGlobal: true },
        ],
      },
    });

    if (!promo) throw new Error("Invalid promo code");
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new Error("Promo code has expired");
    }
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      throw new Error("Promo code has reached its usage limit");
    }
    if (promo.minOrderAmount && input.subtotal < promo.minOrderAmount) {
      throw new Error(`Minimum order of $${promo.minOrderAmount} required for this promo code`);
    }

    const userUsageCount = await prisma.promoCodeUsage.count({
      where: {
        promoCodeId: promo.id,
        userId: input.userId,
      },
    });
    if (promo.maxUsesPerUser && userUsageCount >= promo.maxUsesPerUser) {
      throw new Error("You have already used this promo code");
    }

    let discountAmount: number;
    if (promo.discountType === "percentage") {
      discountAmount = (input.subtotal * promo.discountValue) / 100;
      if (promo.maxDiscount) {
        discountAmount = Math.min(discountAmount, promo.maxDiscount);
      }
    } else {
      discountAmount = Math.min(promo.discountValue, input.subtotal);
    }

    await prisma.cart.update({
      where: { userId: input.userId },
      data: {
        promoCode: promo.code,
        promoDiscount: discountAmount,
      },
    });

    await prisma.promoCode.update({
      where: { id: promo.id },
      data: { currentUses: { increment: 1 } },
    });

    await prisma.promoCodeUsage.create({
      data: {
        promoCodeId: promo.id,
        userId: input.userId,
        discountAmount,
      },
    });

    const cart = await this.getOrCreateCart(input.userId);

    return {
      promo: {
        code: promo.code,
        discountType: promo.discountType as "percentage" | "fixed",
        discountValue: promo.discountValue,
        discountAmount,
        description: promo.description ?? `${promo.discountType === "percentage" ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}`,
      },
      cart,
    };
  }

  /**
   * Remove the applied promo code.
   */
  static async removePromoCode(userId: string): Promise<CartWithRelations> {
    await prisma.cart.update({
      where: { userId },
      data: { promoCode: null, promoDiscount: 0 },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * Calculate the full cart summary with all fees and taxes.
   */
  static async getSummary(userId: string): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      return {
        subtotal: 0,
        itemDiscounts: 0,
        promoDiscount: 0,
        deliveryFee: 0,
        serviceFee: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
        estimatedDeliveryTime: 0,
      };
    }

    let subtotal = 0;
    let itemDiscounts = 0;
    let maxPrepTime = 0;

    for (const item of cart.items) {
      const originalTotal = item.unitPrice * item.quantity;
      const savedTotal = item.totalPrice;
      subtotal += originalTotal;
      if (originalTotal > savedTotal) {
        itemDiscounts += originalTotal - savedTotal;
      }
      if (item.menuItem.preparationTime && item.menuItem.preparationTime > maxPrepTime) {
        maxPrepTime = item.menuItem.preparationTime;
      }
    }

    const promoDiscount = cart.promoDiscount ?? 0;
    const deliveryFee = cart.restaurant?.deliveryFee ?? 0;
    const afterDiscounts = Math.max(0, subtotal - itemDiscounts - promoDiscount);
    const serviceFee = Math.round(afterDiscounts * SERVICE_FEE_PERCENT * 100) / 100;
    const tax = Math.round(afterDiscounts * TAX_RATE * 100) / 100;
    const total = Math.round((afterDiscounts + deliveryFee + serviceFee + tax) * 100) / 100;

    const estimatedDeliveryTime = (cart.restaurant?.estimatedDeliveryTime ?? 30) + maxPrepTime;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      itemDiscounts: Math.round(itemDiscounts * 100) / 100,
      promoDiscount: Math.round(promoDiscount * 100) / 100,
      deliveryFee,
      serviceFee,
      tax,
      total,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      estimatedDeliveryTime,
    };
  }

  /**
   * Validate the cart is ready for checkout.
   */
  static async validateForCheckout(userId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const cart = await this.getOrCreateCart(userId);
    const errors: string[] = [];

    if (cart.items.length === 0) {
      errors.push("Cart is empty");
      return { valid: false, errors };
    }

    if (!cart.restaurant) {
      errors.push("No restaurant selected");
      return { valid: false, errors };
    }

    if (!cart.restaurant.isOpen) {
      errors.push("Restaurant is currently closed");
    }

    for (const item of cart.items) {
      if (!item.menuItem.isAvailable) {
        errors.push(`"${item.menuItem.name}" is no longer available`);
      }
    }

    const summary = await this.getSummary(userId);
    if (cart.restaurant.minOrderAmount > 0 && summary.subtotal < cart.restaurant.minOrderAmount) {
      errors.push(
        `Minimum order amount is $${cart.restaurant.minOrderAmount.toFixed(2)} (current: $${summary.subtotal.toFixed(2)})`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Transfer a guest cart to an authenticated user.
   */
  static async transferGuestCart(guestId: string, userId: string): Promise<CartWithRelations> {
    const guestCart = await prisma.cart.findUnique({
      where: { userId: guestId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await prisma.cart.findUnique({ where: { userId } });

    if (userCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });

      await prisma.$transaction(
        guestCart.items.map((item) =>
          prisma.cartItem.create({
            data: {
              ...item,
              id: undefined,
              cartId: userCart.id,
            },
          })
        )
      );

      await prisma.cart.update({
        where: { id: userCart.id },
        data: {
          restaurantId: guestCart.restaurantId,
          promoCode: guestCart.promoCode,
          promoDiscount: guestCart.promoDiscount,
        },
      });

      await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await prisma.cart.delete({ where: { id: guestCart.id } });
    } else {
      await prisma.cart.update({
        where: { id: guestCart.id },
        data: { userId },
      });
    }

    return this.getOrCreateCart(userId);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private static calculateItemTotal(
    unitPrice: number,
    quantity: number,
    variantSelections: Array<{ priceAdjustment: number }>,
    addOns: Array<{ price: number; quantity: number }>
  ): number {
    const variantTotal = variantSelections.reduce((sum, v) => sum + v.priceAdjustment, 0);
    const addOnTotal = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
    return (unitPrice + variantTotal + addOnTotal) * quantity;
  }
}
