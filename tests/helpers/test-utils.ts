import { jest, expect } from "@jest/globals";
import bcrypt from "bcryptjs";

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5432/ai_food_delivery_test";

export const TEST_ENV = {
  NODE_ENV: "test" as const,
  NEXTAUTH_SECRET: "test-secret-key-for-testing",
  NEXTAUTH_URL: "http://localhost:3000",
  DATABASE_URL: TEST_DB_URL,
  DIRECT_URL: TEST_DB_URL,
  STRIPE_SECRET_KEY: "sk_test_fake",
  STRIPE_PUBLISHABLE_KEY: "pk_test_fake",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
};

export const mockUser = {
  id: "user-test-1",
  email: "test@example.com",
  name: "Test User",
  role: "CUSTOMER" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockRestaurant = {
  id: "rest-test-1",
  name: "Test Restaurant",
  slug: "test-restaurant",
  description: "A test restaurant",
  cuisine: ["Italian"],
  address: "123 Test St",
  phone: "+1-555-0100",
  imageUrl: "/images/test.jpg",
  rating: 4.5,
  totalReviews: 100,
  isOpen: true,
  opensAt: "09:00",
  closesAt: "22:00",
  minimumOrder: 10,
  deliveryFee: 2.99,
  estimatedDeliveryTimeMin: 30,
  ownerId: "owner-test-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockMenuItem = {
  id: "menu-test-1",
  restaurantId: "rest-test-1",
  name: "Test Pizza",
  description: "A test pizza",
  price: 12.99,
  category: "Pizza",
  imageUrl: "/images/test-pizza.jpg",
  isAvailable: true,
  isPopular: true,
  tags: ["vegetarian"],
  calories: 800,
  spicyLevel: 0,
  allergens: ["gluten", "dairy"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockOrder = {
  id: "order-test-1",
  customerId: "user-test-1",
  restaurantId: "rest-test-1",
  status: "PENDING" as const,
  items: [
    {
      id: "item-test-1",
      menuItemId: "menu-test-1",
      name: "Test Pizza",
      quantity: 2,
      unitPrice: 12.99,
      totalPrice: 25.98,
    },
  ],
  subtotal: 25.98,
  tax: 2.08,
  deliveryFee: 0,
  tip: 0,
  total: 28.06,
  deliveryAddress: "123 Test St",
  estimatedDeliveryTime: new Date(Date.now() + 45 * 60000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDelivery = {
  id: "del-test-1",
  orderId: "order-test-1",
  driverId: "driver-test-1",
  status: "ASSIGNED",
  pickupAddress: "456 Restaurant Ave",
  deliveryAddress: "123 Test St",
  estimatedArrival: new Date(Date.now() + 30 * 60000),
  distanceKm: 3.5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDriver = {
  id: "driver-test-1",
  userId: "user-driver-1",
  isAvailable: true,
  currentLat: 40.7128,
  currentLng: -74.006,
  vehicleType: "car",
  rating: 4.8,
  totalDeliveries: 342,
  currentDeliveryId: undefined as string | undefined,
};

export const mockPayment = {
  id: "pay-test-1",
  orderId: "order-test-1",
  userId: "user-test-1",
  amount: 28.06,
  currency: "usd",
  status: "COMPLETED",
  method: "CREDIT_CARD",
  stripePaymentIntentId: "pi_test_123",
  stripeChargeId: "ch_test_123",
  refundAmount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    menuItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    delivery: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    deliveryDriver: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fns: any[]) => Promise.all(fns)),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function generateId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function expectToBeWithinRange(
  actual: number,
  min: number,
  max: number
): void {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

export function resetAllMocks(mocks: Record<string, jest.Mock>): void {
  Object.values(mocks).forEach((mock) => mock.mockReset());
}
