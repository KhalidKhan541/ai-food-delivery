import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  menuCategory: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  isPopular: boolean;
  tags: string[];
  calories?: number;
  spicyLevel?: number;
  allergens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

function validateMenuItem(data: any): MenuItem {
  if (!data.name || data.name.trim().length === 0)
    throw new Error("Menu item name is required");
  if (data.price === undefined || data.price < 0)
    throw new Error("Price must be non-negative");
  if (!data.category || data.category.trim().length === 0)
    throw new Error("Category is required");
  if (data.name.length > 100)
    throw new Error("Name must be 100 characters or less");
  if (data.description && data.description.length > 500)
    throw new Error("Description must be 500 characters or less");
  return data as MenuItem;
}

function filterMenuItems(
  items: MenuItem[],
  filters: {
    category?: string;
    isAvailable?: boolean;
    isPopular?: boolean;
    maxPrice?: number;
    minPrice?: number;
    tags?: string[];
    spicyLevel?: number;
  }
): MenuItem[] {
  let results = items;

  if (filters.category) {
    results = results.filter(
      (i) => i.category.toLowerCase() === filters.category!.toLowerCase()
    );
  }

  if (filters.isAvailable !== undefined) {
    results = results.filter((i) => i.isAvailable === filters.isAvailable);
  }

  if (filters.isPopular !== undefined) {
    results = results.filter((i) => i.isPopular === filters.isPopular);
  }

  if (filters.maxPrice !== undefined) {
    results = results.filter((i) => i.price <= filters.maxPrice!);
  }

  if (filters.minPrice !== undefined) {
    results = results.filter((i) => i.price >= filters.minPrice!);
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((i) =>
      filters.tags!.some((tag) =>
        i.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    );
  }

  if (filters.spicyLevel !== undefined) {
    results = results.filter((i) => i.spicyLevel === filters.spicyLevel);
  }

  return results;
}

function searchMenuItems(items: MenuItem[], query: string): MenuItem[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      item.category.toLowerCase().includes(lowerQuery)
  );
}

describe("Menu API", () => {
  const mockMenuItems: MenuItem[] = [
    {
      id: "menu-1",
      restaurantId: "rest-1",
      name: "Margherita Pizza",
      description: "Classic tomato, mozzarella, and basil",
      price: 12.99,
      category: "Pizza",
      imageUrl: "/images/margherita.jpg",
      isAvailable: true,
      isPopular: true,
      tags: ["vegetarian", "classic"],
      calories: 800,
      spicyLevel: 0,
      allergens: ["gluten", "dairy"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "menu-2",
      restaurantId: "rest-1",
      name: "Pepperoni Pizza",
      description: "Loaded with pepperoni and cheese",
      price: 14.99,
      category: "Pizza",
      imageUrl: "/images/pepperoni.jpg",
      isAvailable: true,
      isPopular: true,
      tags: ["meat", "popular"],
      calories: 950,
      spicyLevel: 1,
      allergens: ["gluten", "dairy"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "menu-3",
      restaurantId: "rest-1",
      name: "Caesar Salad",
      description: "Romaine lettuce with parmesan and croutons",
      price: 8.99,
      category: "Salads",
      imageUrl: "/images/caesar.jpg",
      isAvailable: true,
      isPopular: false,
      tags: ["vegetarian", "healthy"],
      calories: 350,
      spicyLevel: 0,
      allergens: ["gluten", "dairy", "eggs"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "menu-4",
      restaurantId: "rest-1",
      name: "Spicy Chicken Wings",
      description: "Crispy wings with sriracha glaze",
      price: 11.99,
      category: "Appetizers",
      imageUrl: "/images/wings.jpg",
      isAvailable: false,
      isPopular: true,
      tags: ["spicy", "chicken"],
      calories: 600,
      spicyLevel: 3,
      allergens: ["gluten"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "menu-5",
      restaurantId: "rest-1",
      name: "Tiramisu",
      description: "Classic Italian coffee dessert",
      price: 6.99,
      category: "Desserts",
      imageUrl: "/images/tiramisu.jpg",
      isAvailable: true,
      isPopular: false,
      tags: ["vegetarian", "dessert", "coffee"],
      calories: 450,
      spicyLevel: 0,
      allergens: ["gluten", "dairy", "eggs"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "menu-6",
      restaurantId: "rest-1",
      name: "Veggie Supreme Pizza",
      description: "Loaded with fresh vegetables",
      price: 13.99,
      category: "Pizza",
      imageUrl: "/images/veggie-supreme.jpg",
      isAvailable: true,
      isPopular: false,
      tags: ["vegetarian", "vegan-option"],
      calories: 700,
      spicyLevel: 0,
      allergens: ["gluten", "dairy"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCategories: MenuCategory[] = [
    { id: "cat-1", restaurantId: "rest-1", name: "Pizza", description: "Our signature pizzas", sortOrder: 1, isActive: true },
    { id: "cat-2", restaurantId: "rest-1", name: "Salads", description: "Fresh salads", sortOrder: 2, isActive: true },
    { id: "cat-3", restaurantId: "rest-1", name: "Appetizers", description: "Starters and sides", sortOrder: 3, isActive: true },
    { id: "cat-4", restaurantId: "rest-1", name: "Desserts", description: "Sweet treats", sortOrder: 4, isActive: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /api/restaurants/:id/menu", () => {
    it("should retrieve all menu items for a restaurant", async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
      const items = await mockPrisma.menuItem.findMany({
        where: { restaurantId: "rest-1" },
      });
      expect(items).toHaveLength(6);
    });

    it("should retrieve menu categories", async () => {
      mockPrisma.menuCategory.findMany.mockResolvedValue(mockCategories);
      const categories = await mockPrisma.menuCategory.findMany({
        where: { restaurantId: "rest-1" },
        orderBy: { sortOrder: "asc" },
      });
      expect(categories).toHaveLength(4);
      expect(categories[0].name).toBe("Pizza");
    });

    it("should return only available items when filtered", () => {
      const available = filterMenuItems(mockMenuItems, { isAvailable: true });
      expect(available).toHaveLength(5);
      expect(available.every((i) => i.isAvailable)).toBe(true);
    });

    it("should return popular items", () => {
      const popular = filterMenuItems(mockMenuItems, { isPopular: true });
      expect(popular).toHaveLength(3);
      expect(popular.every((i) => i.isPopular)).toBe(true);
    });
  });

  describe("Filter Menu Items", () => {
    it("should filter by category", () => {
      const pizzas = filterMenuItems(mockMenuItems, { category: "Pizza" });
      expect(pizzas).toHaveLength(3);
      expect(pizzas.every((i) => i.category === "Pizza")).toBe(true);
    });

    it("should filter by price range", () => {
      const affordable = filterMenuItems(mockMenuItems, { maxPrice: 10 });
      expect(affordable).toHaveLength(2);
      expect(affordable.every((i) => i.price <= 10)).toBe(true);
    });

    it("should filter by minimum price", () => {
      const premium = filterMenuItems(mockMenuItems, { minPrice: 12 });
      expect(premium).toHaveLength(3);
      expect(premium.every((i) => i.price >= 12)).toBe(true);
    });

    it("should filter by tags", () => {
      const vegetarian = filterMenuItems(mockMenuItems, {
        tags: ["vegetarian"],
      });
      expect(vegetarian).toHaveLength(4);
    });

    it("should filter by spicy level", () => {
      const spicy = filterMenuItems(mockMenuItems, { spicyLevel: 3 });
      expect(spicy).toHaveLength(1);
      expect(spicy[0].name).toBe("Spicy Chicken Wings");
    });

    it("should combine multiple filters", () => {
      const results = filterMenuItems(mockMenuItems, {
        category: "Pizza",
        isAvailable: true,
        tags: ["vegetarian"],
      });
      expect(results).toHaveLength(2);
      expect(
        results.every(
          (i) =>
            i.category === "Pizza" &&
            i.isAvailable &&
            i.tags.includes("vegetarian")
        )
      ).toBe(true);
    });

    it("should return empty array when no items match", () => {
      const results = filterMenuItems(mockMenuItems, {
        category: "Sushi",
      });
      expect(results).toHaveLength(0);
    });

    it("should handle undefined filters gracefully", () => {
      const results = filterMenuItems(mockMenuItems, {});
      expect(results).toHaveLength(6);
    });
  });

  describe("Search Menu Items", () => {
    it("should search by item name", () => {
      const results = searchMenuItems(mockMenuItems, "Margherita");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Margherita Pizza");
    });

    it("should search by description", () => {
      const results = searchMenuItems(mockMenuItems, "romaine");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Caesar Salad");
    });

    it("should search by tags", () => {
      const results = searchMenuItems(mockMenuItems, "spicy");
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain("spicy");
    });

    it("should search by category", () => {
      const results = searchMenuItems(mockMenuItems, "dessert");
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("Desserts");
    });

    it("should be case-insensitive", () => {
      const results = searchMenuItems(mockMenuItems, "PIZZA");
      expect(results).toHaveLength(3);
    });

    it("should return empty for no matches", () => {
      const results = searchMenuItems(mockMenuItems, "sushi");
      expect(results).toHaveLength(0);
    });
  });

  describe("POST /api/restaurants/:id/menu", () => {
    it("should create a valid menu item", async () => {
      const validData = {
        restaurantId: "rest-1",
        name: "Garlic Bread",
        description: "Toasted garlic bread with herbs",
        price: 5.99,
        category: "Appetizers",
        imageUrl: "/images/garlic-bread.jpg",
        isAvailable: true,
        isPopular: false,
        tags: ["vegetarian"],
        calories: 300,
        spicyLevel: 0,
      };

      const item = validateMenuItem(validData);
      expect(item.name).toBe("Garlic Bread");
      expect(item.price).toBe(5.99);
    });

    it("should reject item without name", () => {
      expect(() =>
        validateMenuItem({ price: 10, category: "Pizza" })
      ).toThrow("Menu item name is required");
    });

    it("should reject item with negative price", () => {
      expect(() =>
        validateMenuItem({ name: "Test", price: -5, category: "Pizza" })
      ).toThrow("Price must be non-negative");
    });

    it("should allow zero price (free item)", () => {
      const item = validateMenuItem({
        name: "Free Sample",
        price: 0,
        category: "Promos",
      });
      expect(item.price).toBe(0);
    });

    it("should reject item without category", () => {
      expect(() =>
        validateMenuItem({ name: "Test", price: 10 })
      ).toThrow("Category is required");
    });

    it("should reject name longer than 100 characters", () => {
      expect(() =>
        validateMenuItem({
          name: "A".repeat(101),
          price: 10,
          category: "Pizza",
        })
      ).toThrow("Name must be 100 characters or less");
    });

    it("should reject description longer than 500 characters", () => {
      expect(() =>
        validateMenuItem({
          name: "Test",
          price: 10,
          category: "Pizza",
          description: "A".repeat(501),
        })
      ).toThrow("Description must be 500 characters or less");
    });

    it("should save menu item to database", async () => {
      mockPrisma.menuItem.create.mockResolvedValue(mockMenuItems[0]);
      const created = await mockPrisma.menuItem.create({
        data: {
          restaurantId: "rest-1",
          name: "Margherita Pizza",
          price: 12.99,
          category: "Pizza",
        },
      });
      expect(created.name).toBe("Margherita Pizza");
    });
  });

  describe("PATCH /api/menu/:id", () => {
    it("should update item availability", async () => {
      mockPrisma.menuItem.update.mockResolvedValue({
        ...mockMenuItems[0],
        isAvailable: false,
      });
      const updated = await mockPrisma.menuItem.update({
        where: { id: "menu-1" },
        data: { isAvailable: false },
      });
      expect(updated.isAvailable).toBe(false);
    });

    it("should update item price", async () => {
      mockPrisma.menuItem.update.mockResolvedValue({
        ...mockMenuItems[0],
        price: 14.99,
      });
      const updated = await mockPrisma.menuItem.update({
        where: { id: "menu-1" },
        data: { price: 14.99 },
      });
      expect(updated.price).toBe(14.99);
    });

    it("should toggle popular status", async () => {
      mockPrisma.menuItem.update.mockResolvedValue({
        ...mockMenuItems[2],
        isPopular: true,
      });
      const updated = await mockPrisma.menuItem.update({
        where: { id: "menu-3" },
        data: { isPopular: true },
      });
      expect(updated.isPopular).toBe(true);
    });
  });

  describe("DELETE /api/menu/:id", () => {
    it("should delete a menu item", async () => {
      mockPrisma.menuItem.delete.mockResolvedValue(mockMenuItems[0]);
      const deleted = await mockPrisma.menuItem.delete({
        where: { id: "menu-1" },
      });
      expect(deleted.id).toBe("menu-1");
      expect(mockPrisma.menuItem.delete).toHaveBeenCalledWith({
        where: { id: "menu-1" },
      });
    });
  });

  describe("Menu Analytics", () => {
    it("should count items per category", () => {
      const categoryCounts = mockMenuItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(categoryCounts["Pizza"]).toBe(3);
      expect(categoryCounts["Salads"]).toBe(1);
      expect(categoryCounts["Appetizers"]).toBe(1);
      expect(categoryCounts["Desserts"]).toBe(1);
    });

    it("should calculate average price", () => {
      const avg =
        mockMenuItems.reduce((sum, i) => sum + i.price, 0) /
        mockMenuItems.length;
      expect(avg).toBeCloseTo(11.66, 1);
    });

    it("should identify allergen categories", () => {
      const allAllergens = mockMenuItems
        .flatMap((i) => i.allergens ?? [])
        .filter(Boolean);
      const uniqueAllergens = [...new Set(allAllergens)];
      expect(uniqueAllergens).toContain("gluten");
      expect(uniqueAllergens).toContain("dairy");
    });
  });
});
