import { prisma } from "@/lib/prisma";
import { Prisma, MenuItem, MenuCategory } from "@prisma/client";
import { z } from "zod";

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  sortOrder: z.number().min(0).default(0),
  image: z.string().url().optional(),
});

export const updateCategorySchema = createCategorySchema.omit({
  restaurantId: true,
});

export const createMenuItemSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  images: z.array(z.string().url()).max(5).default([]),
  tags: z.array(z.string().max(30)).max(10).default([]),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  preparationTime: z.number().min(1).max(120).optional(),
  calories: z.number().min(0).optional(),
  allergens: z.array(z.string().max(30)).default([]),
  nutritionalInfo: z
    .object({
      protein: z.number().min(0).optional(),
      carbs: z.number().min(0).optional(),
      fat: z.number().min(0).optional(),
      fiber: z.number().min(0).optional(),
    })
    .optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.omit({
  restaurantId: true,
});

export const createVariantSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string().min(1).max(50),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        priceAdjustment: z.number().default(0),
        isDefault: z.boolean().default(false),
      })
    )
    .min(1),
  required: z.boolean().default(true),
  maxSelections: z.number().min(1).optional(),
});

export const createAddOnSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(50),
  price: z.number().min(0),
  isAvailable: z.boolean().default(true),
  maxQuantity: z.number().min(1).max(10).default(1),
  category: z.string().max(30).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;

export type MenuItemWithRelations = MenuItem & {
  category: { id: string; name: string } | null;
  variants: Array<{
    id: string;
    name: string;
    required: boolean;
    maxSelections: number | null;
    options: Prisma.JsonValue;
  }>;
  addOns: Array<{
    id: string;
    name: string;
    price: number;
    isAvailable: boolean;
  }>;
  _count: { orderItems: number };
};

export type MenuWithCategories = {
  categories: Array<
    MenuCategory & {
      items: MenuItemWithRelations[];
    }
  >;
  featuredItems: MenuItemWithRelations[];
  totalItems: number;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class MenuService {
  // ── Categories ──────────────────────────────────────────────────────────────

  /**
   * Create a new menu category.
   */
  static async createCategory(input: CreateCategoryInput): Promise<MenuCategory> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");

    return prisma.menuCategory.create({
      data: {
        restaurantId: input.restaurantId,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        image: input.image,
      },
    });
  }

  /**
   * Update a menu category.
   */
  static async updateCategory(
    id: string,
    restaurantId: string,
    input: UpdateCategoryInput
  ): Promise<MenuCategory> {
    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new Error("Category not found");
    if (existing.restaurantId !== restaurantId) throw new Error("Unauthorized");

    return prisma.menuCategory.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.image !== undefined && { image: input.image }),
      },
    });
  }

  /**
   * Delete a menu category. Menu items in the category are unlinked, not deleted.
   */
  static async deleteCategory(id: string, restaurantId: string): Promise<void> {
    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new Error("Category not found");
    if (existing.restaurantId !== restaurantId) throw new Error("Unauthorized");

    await prisma.$transaction([
      prisma.menuItem.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      prisma.menuCategory.delete({ where: { id } }),
    ]);
  }

  /**
   * Get all categories for a restaurant with item counts.
   */
  static async getCategories(restaurantId: string): Promise<
    Array<MenuCategory & { _count: { items: number } }>
  > {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * Reorder categories by providing sorted IDs.
   */
  static async reorderCategories(
    restaurantId: string,
    categoryIds: string[]
  ): Promise<void> {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      select: { id: true },
    });

    const validIds = new Set(categories.map((c) => c.id));
    const invalidIds = categoryIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid category IDs: ${invalidIds.join(", ")}`);
    }

    await prisma.$transaction(
      categoryIds.map((id, index) =>
        prisma.menuCategory.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
  }

  // ── Menu Items ──────────────────────────────────────────────────────────────

  /**
   * Create a new menu item with optional variants and add-ons.
   */
  static async createMenuItem(input: CreateMenuItemInput): Promise<MenuItemWithRelations> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");

    if (input.categoryId) {
      const category = await prisma.menuCategory.findUnique({
        where: { id: input.categoryId },
      });
      if (!category || category.restaurantId !== input.restaurantId) {
        throw new Error("Invalid category for this restaurant");
      }
    }

    return prisma.menuItem.create({
      data: {
        restaurantId: input.restaurantId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        price: input.price,
        discountPrice: input.discountPrice,
        images: input.images,
        tags: input.tags,
        isAvailable: input.isAvailable,
        isFeatured: input.isFeatured,
        preparationTime: input.preparationTime,
        calories: input.calories,
        allergens: input.allergens,
        nutritionalInfo: input.nutritionalInfo ?? Prisma.JsonNull,
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        addOns: { where: { isAvailable: true } },
        _count: { select: { orderItems: true } },
      },
    });
  }

  /**
   * Update a menu item.
   */
  static async updateMenuItem(
    id: string,
    restaurantId: string,
    input: UpdateMenuItemInput
  ): Promise<MenuItemWithRelations> {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Menu item not found");
    if (existing.restaurantId !== restaurantId) throw new Error("Unauthorized");

    if (input.categoryId) {
      const category = await prisma.menuCategory.findUnique({
        where: { id: input.categoryId },
      });
      if (!category || category.restaurantId !== restaurantId) {
        throw new Error("Invalid category for this restaurant");
      }
    }

    return prisma.menuItem.update({
      where: { id },
      data: {
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.discountPrice !== undefined && { discountPrice: input.discountPrice }),
        ...(input.images && { images: input.images }),
        ...(input.tags && { tags: input.tags }),
        ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
        ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
        ...(input.preparationTime !== undefined && { preparationTime: input.preparationTime }),
        ...(input.calories !== undefined && { calories: input.calories }),
        ...(input.allergens && { allergens: input.allergens }),
        ...(input.nutritionalInfo !== undefined && {
          nutritionalInfo: input.nutritionalInfo ?? Prisma.JsonNull,
        }),
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        addOns: { where: { isAvailable: true } },
        _count: { select: { orderItems: true } },
      },
    });
  }

  /**
   * Delete a menu item and all its variants/add-ons.
   */
  static async deleteMenuItem(id: string, restaurantId: string): Promise<void> {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Menu item not found");
    if (existing.restaurantId !== restaurantId) throw new Error("Unauthorized");

    const hasOrders = await prisma.orderItem.findFirst({
      where: { menuItemId: id },
    });
    if (hasOrders) {
      throw new Error("Cannot delete item with existing orders. Mark as unavailable instead.");
    }

    await prisma.$transaction([
      prisma.menuVariant.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItemAddOn.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItem.delete({ where: { id } }),
    ]);
  }

  /**
   * Get a single menu item by ID with all relations.
   */
  static async getMenuItem(id: string): Promise<MenuItemWithRelations | null> {
    return prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        addOns: { where: { isAvailable: true } },
        _count: { select: { orderItems: true } },
      },
    });
  }

  /**
   * Toggle item availability.
   */
  static async toggleAvailability(id: string, restaurantId: string): Promise<boolean> {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Menu item not found");
    if (existing.restaurantId !== restaurantId) throw new Error("Unauthorized");

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
      select: { isAvailable: true },
    });

    return updated.isAvailable;
  }

  /**
   * Bulk update availability for multiple items.
   */
  static async bulkUpdateAvailability(
    restaurantId: string,
    itemIds: string[],
    isAvailable: boolean
  ): Promise<number> {
    const result = await prisma.menuItem.updateMany({
      where: {
        id: { in: itemIds },
        restaurantId,
      },
      data: { isAvailable },
    });

    return result.count;
  }

  // ── Variants ────────────────────────────────────────────────────────────────

  /**
   * Add a variant (e.g., "Size", "Spice Level") to a menu item.
   */
  static async createVariant(input: CreateVariantInput): Promise<void> {
    const item = await prisma.menuItem.findUnique({
      where: { id: input.menuItemId },
    });
    if (!item) throw new Error("Menu item not found");

    const existingVariant = await prisma.menuVariant.findFirst({
      where: { menuItemId: input.menuItemId, name: input.name },
    });
    if (existingVariant) {
      throw new Error(`Variant "${input.name}" already exists for this item`);
    }

    await prisma.menuVariant.create({
      data: {
        menuItemId: input.menuItemId,
        name: input.name,
        options: input.options,
        required: input.required,
        maxSelections: input.maxSelections,
      },
    });
  }

  /**
   * Update a variant's options.
   */
  static async updateVariant(
    id: string,
    restaurantId: string,
    data: {
      name?: string;
      options?: Array<{ label: string; priceAdjustment: number; isDefault?: boolean }>;
      required?: boolean;
      maxSelections?: number | null;
    }
  ): Promise<void> {
    const variant = await prisma.menuVariant.findUnique({
      where: { id },
      include: { menuItem: { select: { restaurantId: true } } },
    });
    if (!variant) throw new Error("Variant not found");
    if (variant.menuItem.restaurantId !== restaurantId) throw new Error("Unauthorized");

    await prisma.menuVariant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.options && { options: data.options }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.maxSelections !== undefined && { maxSelections: data.maxSelections }),
      },
    });
  }

  /**
   * Delete a variant.
   */
  static async deleteVariant(id: string, restaurantId: string): Promise<void> {
    const variant = await prisma.menuVariant.findUnique({
      where: { id },
      include: { menuItem: { select: { restaurantId: true } } },
    });
    if (!variant) throw new Error("Variant not found");
    if (variant.menuItem.restaurantId !== restaurantId) throw new Error("Unauthorized");

    await prisma.menuVariant.delete({ where: { id } });
  }

  // ── Add-ons ─────────────────────────────────────────────────────────────────

  /**
   * Create a shared add-on for a restaurant (e.g., extra cheese, drinks).
   */
  static async createAddOn(input: CreateAddOnInput): Promise<void> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");

    await prisma.menuItemAddOn.create({
      data: {
        restaurantId: input.restaurantId,
        name: input.name,
        price: input.price,
        isAvailable: input.isAvailable,
        maxQuantity: input.maxQuantity,
        category: input.category,
      },
    });
  }

  /**
   * Update a restaurant add-on.
   */
  static async updateAddOn(
    id: string,
    restaurantId: string,
    data: Partial<Omit<CreateAddOnInput, "restaurantId">>
  ): Promise<void> {
    const addOn = await prisma.menuItemAddOn.findUnique({ where: { id } });
    if (!addOn) throw new Error("Add-on not found");
    if (addOn.restaurantId !== restaurantId) throw new Error("Unauthorized");

    await prisma.menuItemAddOn.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an add-on.
   */
  static async deleteAddOn(id: string, restaurantId: string): Promise<void> {
    const addOn = await prisma.menuItemAddOn.findUnique({ where: { id } });
    if (!addOn) throw new Error("Add-on not found");
    if (addOn.restaurantId !== restaurantId) throw new Error("Unauthorized");

    await prisma.menuItemAddOn.delete({ where: { id } });
  }

  /**
   * Get all add-ons for a restaurant.
   */
  static async getAddOns(
    restaurantId: string,
    category?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      price: number;
      isAvailable: boolean;
      maxQuantity: number;
      category: string | null;
    }>
  > {
    return prisma.menuItemAddOn.findMany({
      where: {
        restaurantId,
        ...(category && { category }),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  // ── Full Menu Retrieval ─────────────────────────────────────────────────────

  /**
   * Get the full menu for a restaurant, grouped by category.
   */
  static async getFullMenu(
    restaurantId: string,
    options?: { includeUnavailable?: boolean }
  ): Promise<MenuWithCategories> {
    const whereClause = options?.includeUnavailable
      ? {}
      : { isAvailable: true };

    const [categories, featuredItems, totalItems] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { restaurantId },
        include: {
          items: {
            where: whereClause,
            include: {
              category: { select: { id: true, name: true } },
              variants: true,
              addOns: { where: { isAvailable: true } },
              _count: { select: { orderItems: true } },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.menuItem.findMany({
        where: {
          restaurantId,
          isFeatured: true,
          isAvailable: true,
        },
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
          addOns: { where: { isAvailable: true } },
          _count: { select: { orderItems: true } },
        },
      }),
      prisma.menuItem.count({ where: { restaurantId, ...whereClause } }),
    ]);

    return { categories, featuredItems, totalItems };
  }

  /**
   * Search menu items across a restaurant's menu.
   */
  static async searchItems(
    restaurantId: string,
    query: string,
    options?: { limit?: number; availableOnly?: boolean }
  ): Promise<MenuItemWithRelations[]> {
    const limit = Math.min(options?.limit ?? 20, 50);

    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        ...(options?.availableOnly !== false && { isAvailable: true }),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        addOns: { where: { isAvailable: true } },
        _count: { select: { orderItems: true } },
      },
      take: limit,
    });
  }

  /**
   * Get popular items by order count.
   */
  static async getPopularItems(
    restaurantId: string,
    limit: number = 10
  ): Promise<MenuItemWithRelations[]> {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        addOns: { where: { isAvailable: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: "desc" } },
      take: limit,
    });
  }

  /**
   * Validate a cart item's selections (variants + add-ons) and calculate price.
   */
  static async validateAndPriceItem(
    itemId: string,
    selections: {
      variantOptions?: Array<{ variantId: string; optionLabels: string[] }>;
      addOns?: Array<{ addOnId: string; quantity: number }>;
    }
  ): Promise<{
    valid: boolean;
    unitPrice: number;
    variantAdjustments: number;
    addOnTotal: number;
    totalPrice: number;
    errors: string[];
  }> {
    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { variants: true, addOns: true },
    });

    if (!item) return { valid: false, unitPrice: 0, variantAdjustments: 0, addOnTotal: 0, totalPrice: 0, errors: ["Item not found"] };
    if (!item.isAvailable) return { valid: false, unitPrice: 0, variantAdjustments: 0, addOnTotal: 0, totalPrice: 0, errors: ["Item is not available"] };

    const errors: string[] = [];
    let variantAdjustments = 0;

    if (selections.variantOptions) {
      for (const vo of selections.variantOptions) {
        const variant = item.variants.find((v) => v.id === vo.variantId);
        if (!variant) {
          errors.push(`Variant not found: ${vo.variantId}`);
          continue;
        }

        const options = variant.options as Array<{
          label: string;
          priceAdjustment: number;
          isDefault: boolean;
        }>;

        for (const label of vo.optionLabels) {
          const option = options.find((o) => o.label === label);
          if (!option) {
            errors.push(`Invalid option "${label}" for variant "${variant.name}"`);
          } else {
            variantAdjustments += option.priceAdjustment;
          }
        }

        if (variant.required && vo.optionLabels.length === 0) {
          errors.push(`Variant "${variant.name}" is required`);
        }

        if (variant.maxSelections && vo.optionLabels.length > variant.maxSelections) {
          errors.push(
            `Variant "${variant.name}" allows max ${variant.maxSelections} selections`
          );
        }
      }
    }

    let addOnTotal = 0;
    if (selections.addOns) {
      for (const ao of selections.addOns) {
        const addOn = item.addOns.find((a) => a.id === ao.addOnId);
        if (!addOn) {
          errors.push(`Add-on not found: ${ao.addOnId}`);
          continue;
        }
        if (!addOn.isAvailable) {
          errors.push(`Add-on "${addOn.name}" is not available`);
          continue;
        }
        if (ao.quantity > addOn.maxQuantity) {
          errors.push(`Add-on "${addOn.name}" max quantity is ${addOn.maxQuantity}`);
        }
        addOnTotal += addOn.price * ao.quantity;
      }
    }

    const unitPrice = item.discountPrice ?? item.price;

    return {
      valid: errors.length === 0,
      unitPrice,
      variantAdjustments,
      addOnTotal,
      totalPrice: unitPrice + variantAdjustments + addOnTotal,
      errors,
    };
  }
}
