import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  restaurant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisine: string[];
  address: string;
  phone: string;
  imageUrl: string;
  rating: number;
  totalReviews: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  minimumOrder: number;
  deliveryFee: number;
  estimatedDeliveryTimeMin: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
}

function validateRestaurant(data: any): Restaurant {
  if (!data.name || data.name.trim().length === 0)
    throw new Error("Restaurant name is required");
  if (!data.address || data.address.trim().length === 0)
    throw new Error("Restaurant address is required");
  if (!data.cuisine || data.cuisine.length === 0)
    throw new Error("At least one cuisine type is required");
  if (data.minimumOrder < 0) throw new Error("Minimum order cannot be negative");
  if (data.deliveryFee < 0) throw new Error("Delivery fee cannot be negative");
  return data as Restaurant;
}

function searchRestaurants(
  restaurants: Restaurant[],
  query: string,
  filters?: { cuisine?: string; minRating?: number; isOpen?: boolean }
): Restaurant[] {
  let results = restaurants;

  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery) ||
        r.cuisine.some((c) => c.toLowerCase().includes(lowerQuery))
    );
  }

  if (filters?.cuisine) {
    results = results.filter((r) =>
      r.cuisine.some((c) => c.toLowerCase() === filters.cuisine!.toLowerCase())
    );
  }

  if (filters?.minRating) {
    results = results.filter((r) => r.rating >= filters.minRating!);
  }

  if (filters?.isOpen !== undefined) {
    results = results.filter((r) => r.isOpen === filters.isOpen);
  }

  return results;
}

function sortRestaurants(
  restaurants: Restaurant[],
  sortBy: "rating" | "deliveryTime" | "deliveryFee" | "minimumOrder",
  order: "asc" | "desc" = "asc"
): Restaurant[] {
  const sorted = [...restaurants].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return order === "asc" ? a.rating - b.rating : b.rating - a.rating;
      case "deliveryTime":
        return order === "asc"
          ? a.estimatedDeliveryTimeMin - b.estimatedDeliveryTimeMin
          : b.estimatedDeliveryTimeMin - a.estimatedDeliveryTimeMin;
      case "deliveryFee":
        return order === "asc"
          ? a.deliveryFee - b.deliveryFee
          : b.deliveryFee - a.deliveryFee;
      case "minimumOrder":
        return order === "asc"
          ? a.minimumOrder - b.minimumOrder
          : b.minimumOrder - a.minimumOrder;
      default:
        return 0;
    }
  });
  return sorted;
}

describe("Restaurants API", () => {
  const mockRestaurant: Restaurant = {
    id: "rest-1",
    name: "Pizza Palace",
    slug: "pizza-palace",
    description: "Best pizza in town",
    cuisine: ["Italian", "Pizza"],
    address: "456 Oak Ave",
    phone: "+1-555-0123",
    imageUrl: "/images/pizza-palace.jpg",
    rating: 4.5,
    totalReviews: 120,
    isOpen: true,
    opensAt: "09:00",
    closesAt: "22:00",
    minimumOrder: 15,
    deliveryFee: 2.99,
    estimatedDeliveryTimeMin: 30,
    ownerId: "owner-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRestaurants: Restaurant[] = [
    mockRestaurant,
    {
      ...mockRestaurant,
      id: "rest-2",
      name: "Burger Barn",
      slug: "burger-barn",
      cuisine: ["American", "Burgers"],
      rating: 4.2,
      totalReviews: 85,
      deliveryFee: 1.99,
      estimatedDeliveryTimeMin: 25,
    },
    {
      ...mockRestaurant,
      id: "rest-3",
      name: "Sushi Supreme",
      slug: "sushi-supreme",
      cuisine: ["Japanese", "Sushi"],
      rating: 4.8,
      totalReviews: 200,
      minimumOrder: 20,
      deliveryFee: 4.99,
      estimatedDeliveryTimeMin: 40,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /api/restaurants", () => {
    it("should retrieve all open restaurants", async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);
      const restaurants = await mockPrisma.restaurant.findMany({
        where: { isOpen: true },
      });
      expect(restaurants).toHaveLength(3);
    });

    it("should search restaurants by name", () => {
      const results = searchRestaurants(mockRestaurants, "Pizza");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Pizza Palace");
    });

    it("should search restaurants by cuisine", () => {
      const results = searchRestaurants(mockRestaurants, "Japanese");
      expect(results).toHaveLength(1);
      expect(results[0].cuisine).toContain("Japanese");
    });

    it("should search by description keyword", () => {
      const results = searchRestaurants(mockRestaurants, "burger");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Burger Barn");
    });

    it("should return all restaurants with empty query", () => {
      const results = searchRestaurants(mockRestaurants, "");
      expect(results).toHaveLength(3);
    });

    it("should filter by cuisine type", () => {
      const results = searchRestaurants(mockRestaurants, "", { cuisine: "Italian" });
      expect(results).toHaveLength(1);
      expect(results[0].cuisine).toContain("Italian");
    });

    it("should filter by minimum rating", () => {
      const results = searchRestaurants(mockRestaurants, "", { minRating: 4.5 });
      expect(results).toHaveLength(2);
    });

    it("should filter by open status", () => {
      const closedRestaurant = { ...mockRestaurant, id: "rest-closed", isOpen: false };
      const all = [...mockRestaurants, closedRestaurant];

      const openResults = searchRestaurants(all, "", { isOpen: true });
      expect(openResults).toHaveLength(3);

      const closedResults = searchRestaurants(all, "", { isOpen: false });
      expect(closedResults).toHaveLength(1);
    });

    it("should combine search and filters", () => {
      const results = searchRestaurants(mockRestaurants, "", {
        minRating: 4.3,
      });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.rating >= 4.3)).toBe(true);
    });
  });

  describe("Sort Restaurants", () => {
    it("should sort by rating descending", () => {
      const sorted = sortRestaurants(mockRestaurants, "rating", "desc");
      expect(sorted[0].rating).toBe(4.8);
      expect(sorted[2].rating).toBe(4.2);
    });

    it("should sort by delivery fee ascending", () => {
      const sorted = sortRestaurants(mockRestaurants, "deliveryFee", "asc");
      expect(sorted[0].deliveryFee).toBe(1.99);
      expect(sorted[2].deliveryFee).toBe(4.99);
    });

    it("should sort by delivery time ascending", () => {
      const sorted = sortRestaurants(mockRestaurants, "deliveryTime", "asc");
      expect(sorted[0].estimatedDeliveryTimeMin).toBe(25);
      expect(sorted[2].estimatedDeliveryTimeMin).toBe(40);
    });

    it("should sort by minimum order ascending", () => {
      const sorted = sortRestaurants(mockRestaurants, "minimumOrder", "asc");
      expect(sorted[0].minimumOrder).toBe(15);
      expect(sorted[2].minimumOrder).toBe(20);
    });

    it("should not mutate original array", () => {
      const original = [...mockRestaurants];
      sortRestaurants(mockRestaurants, "rating", "desc");
      expect(mockRestaurants).toEqual(original);
    });
  });

  describe("POST /api/restaurants", () => {
    it("should create a new restaurant with valid data", async () => {
      const validData = {
        name: "New Restaurant",
        address: "789 Pine St",
        cuisine: ["Mexican"],
        minimumOrder: 10,
        deliveryFee: 2.50,
      };

      const restaurant = validateRestaurant({
        ...validData,
        id: "rest-new",
        slug: "new-restaurant",
        rating: 0,
        totalReviews: 0,
        isOpen: true,
        estimatedDeliveryTimeMin: 30,
      });

      expect(restaurant.name).toBe("New Restaurant");
      expect(restaurant.cuisine).toContain("Mexican");
    });

    it("should reject restaurant without name", () => {
      expect(() =>
        validateRestaurant({ address: "123 St", cuisine: ["Italian"] })
      ).toThrow("Restaurant name is required");
    });

    it("should reject restaurant without address", () => {
      expect(() =>
        validateRestaurant({ name: "Test", cuisine: ["Italian"] })
      ).toThrow("Restaurant address is required");
    });

    it("should reject restaurant without cuisine", () => {
      expect(() =>
        validateRestaurant({ name: "Test", address: "123 St", cuisine: [] })
      ).toThrow("At least one cuisine type is required");
    });

    it("should reject negative minimum order", () => {
      expect(() =>
        validateRestaurant({
          name: "Test",
          address: "123 St",
          cuisine: ["Italian"],
          minimumOrder: -5,
          deliveryFee: 2,
        })
      ).toThrow("Minimum order cannot be negative");
    });

    it("should reject negative delivery fee", () => {
      expect(() =>
        validateRestaurant({
          name: "Test",
          address: "123 St",
          cuisine: ["Italian"],
          minimumOrder: 10,
          deliveryFee: -1,
        })
      ).toThrow("Delivery fee cannot be negative");
    });

    it("should allow zero minimum order", () => {
      const restaurant = validateRestaurant({
        name: "Test",
        address: "123 St",
        cuisine: ["Italian"],
        minimumOrder: 0,
        deliveryFee: 0,
      });
      expect(restaurant.minimumOrder).toBe(0);
    });

    it("should save restaurant to database", async () => {
      mockPrisma.restaurant.create.mockResolvedValue(mockRestaurant);
      const created = await mockPrisma.restaurant.create({
        data: {
          name: "Pizza Palace",
          address: "456 Oak Ave",
          cuisine: ["Italian", "Pizza"],
          ownerId: "owner-1",
        },
      });
      expect(created.id).toBe("rest-1");
      expect(mockPrisma.restaurant.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/restaurants/:id", () => {
    it("should retrieve restaurant by ID", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      const restaurant = await mockPrisma.restaurant.findUnique({
        where: { id: "rest-1" },
        include: { menuItems: true, reviews: true },
      });
      expect(restaurant?.name).toBe("Pizza Palace");
    });

    it("should return null for non-existent restaurant", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      const restaurant = await mockPrisma.restaurant.findUnique({
        where: { id: "nonexistent" },
      });
      expect(restaurant).toBeNull();
    });

    it("should include menu items in response", async () => {
      const menuItems: MenuItem[] = [
        {
          id: "menu-1",
          restaurantId: "rest-1",
          name: "Margherita Pizza",
          description: "Classic tomato and mozzarella",
          price: 12.99,
          category: "Pizza",
          imageUrl: "/images/margherita.jpg",
          isAvailable: true,
          isPopular: true,
          tags: ["vegetarian"],
          calories: 800,
          spicyLevel: 0,
          createdAt: new Date(),
        },
      ];

      mockPrisma.restaurant.findUnique.mockResolvedValue({
        ...mockRestaurant,
        menuItems,
      });

      const restaurant = await mockPrisma.restaurant.findUnique({
        where: { id: "rest-1" },
        include: { menuItems: true },
      });

      expect(restaurant?.menuItems).toHaveLength(1);
      expect(restaurant?.menuItems[0].name).toBe("Margherita Pizza");
    });
  });

  describe("PATCH /api/restaurants/:id", () => {
    it("should update restaurant details", async () => {
      mockPrisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        name: "Updated Pizza Palace",
      });

      const updated = await mockPrisma.restaurant.update({
        where: { id: "rest-1" },
        data: { name: "Updated Pizza Palace" },
      });

      expect(updated.name).toBe("Updated Pizza Palace");
    });

    it("should toggle open/closed status", async () => {
      mockPrisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        isOpen: false,
      });

      const updated = await mockPrisma.restaurant.update({
        where: { id: "rest-1" },
        data: { isOpen: false },
      });

      expect(updated.isOpen).toBe(false);
    });

    it("should update delivery settings", async () => {
      mockPrisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        deliveryFee: 0,
        minimumOrder: 20,
      });

      const updated = await mockPrisma.restaurant.update({
        where: { id: "rest-1" },
        data: { deliveryFee: 0, minimumOrder: 20 },
      });

      expect(updated.deliveryFee).toBe(0);
      expect(updated.minimumOrder).toBe(20);
    });
  });

  describe("GET /api/restaurants/:id/reviews", () => {
    it("should retrieve restaurant reviews", async () => {
      const reviews = [
        {
          id: "rev-1",
          restaurantId: "rest-1",
          customerId: "customer-1",
          rating: 5,
          comment: "Amazing pizza!",
          createdAt: new Date(),
        },
      ];
      mockPrisma.review.findMany.mockResolvedValue(reviews);

      const result = await mockPrisma.review.findMany({
        where: { restaurantId: "rest-1" },
        orderBy: { createdAt: "desc" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(5);
    });

    it("should calculate average rating", async () => {
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.3 },
        _count: { id: 85 },
      });

      const stats = await mockPrisma.review.aggregate({
        where: { restaurantId: "rest-1" },
        _avg: { rating: true },
        _count: { id: true },
      });

      expect(stats._avg.rating).toBe(4.3);
      expect(stats._count.id).toBe(85);
    });
  });
});
