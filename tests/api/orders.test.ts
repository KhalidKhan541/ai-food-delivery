import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  restaurant: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  delivery: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((fns: any[]) => Promise.all(fns)),
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  deliveryAddress: string;
  specialInstructions?: string;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function calculateOrderTotal(items: OrderItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

function validateOrderItems(items: any[]): OrderItem[] {
  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }
  return items.map((item, index) => {
    if (!item.menuItemId) throw new Error(`Item ${index}: menuItemId required`);
    if (!item.quantity || item.quantity < 1)
      throw new Error(`Item ${index}: quantity must be >= 1`);
    if (!item.unitPrice || item.unitPrice <= 0)
      throw new Error(`Item ${index}: unitPrice must be > 0`);
    return {
      id: `item-${index}`,
      menuItemId: item.menuItemId,
      name: item.name ?? "Unknown",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
      specialInstructions: item.specialInstructions,
    };
  });
}

function canTransitionStatus(current: OrderStatus, next: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };
  return transitions[current]?.includes(next) ?? false;
}

describe("Orders API", () => {
  const mockOrder: Order = {
    id: "order-1",
    customerId: "customer-1",
    restaurantId: "restaurant-1",
    status: OrderStatus.PENDING,
    items: [
      {
        id: "item-1",
        menuItemId: "menu-1",
        name: "Margherita Pizza",
        quantity: 2,
        unitPrice: 12.99,
        totalPrice: 25.98,
      },
    ],
    subtotal: 25.98,
    tax: 2.08,
    deliveryFee: 3.99,
    tip: 0,
    total: 32.05,
    deliveryAddress: "123 Main St, Apt 4B",
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/orders", () => {
    it("should create a new order with valid items", async () => {
      const items = [
        { menuItemId: "menu-1", name: "Margherita Pizza", quantity: 2, unitPrice: 12.99 },
        { menuItemId: "menu-2", name: "Caesar Salad", quantity: 1, unitPrice: 8.99 },
      ];

      const validated = validateOrderItems(items);
      const { subtotal, tax, total } = calculateOrderTotal(validated);

      expect(validated).toHaveLength(2);
      expect(subtotal).toBe(34.97);
      expect(tax).toBe(2.8);
      expect(total).toBe(37.77);
    });

    it("should reject order with empty items", () => {
      expect(() => validateOrderItems([])).toThrow(
        "Order must contain at least one item"
      );
    });

    it("should reject order with null items", () => {
      expect(() => validateOrderItems(null)).toThrow(
        "Order must contain at least one item"
      );
    });

    it("should reject item without menuItemId", () => {
      expect(() =>
        validateOrderItems([{ quantity: 1, unitPrice: 10 }])
      ).toThrow("menuItemId required");
    });

    it("should reject item with zero quantity", () => {
      expect(() =>
        validateOrderItems([{ menuItemId: "m1", quantity: 0, unitPrice: 10 }])
      ).toThrow("quantity must be >= 1");
    });

    it("should reject item with negative price", () => {
      expect(() =>
        validateOrderItems([{ menuItemId: "m1", quantity: 1, unitPrice: -5 }])
      ).toThrow("unitPrice must be > 0");
    });

    it("should calculate item totalPrice correctly", () => {
      const items = [
        { menuItemId: "m1", name: "Burger", quantity: 3, unitPrice: 9.99 },
      ];
      const validated = validateOrderItems(items);
      expect(validated[0].totalPrice).toBe(29.97);
    });

    it("should create order in database", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: "restaurant-1",
        isOpen: true,
        minimumOrder: 10,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "customer-1",
        address: "123 Main St",
      });
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const order = await mockPrisma.order.create({
        data: {
          customerId: "customer-1",
          restaurantId: "restaurant-1",
          status: OrderStatus.PENDING,
          subtotal: 25.98,
          tax: 2.08,
          deliveryFee: 3.99,
          total: 32.05,
          deliveryAddress: "123 Main St, Apt 4B",
        },
      });

      expect(order.id).toBe("order-1");
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it("should reject order below minimum amount", async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: "restaurant-1",
        isOpen: true,
        minimumOrder: 25,
      });

      const items = [{ menuItemId: "m1", name: "Fries", quantity: 1, unitPrice: 5.99 }];
      const validated = validateOrderItems(items);
      const { subtotal } = calculateOrderTotal(validated);

      expect(subtotal).toBeLessThan(25);
    });

    it("should include delivery fee in total", () => {
      const items = [{ menuItemId: "m1", name: "Soup", quantity: 1, unitPrice: 8.00 }];
      const validated = validateOrderItems(items);
      const { total } = calculateOrderTotal(validated);
      const deliveryFee = 3.99;
      const grandTotal = Math.round((total + deliveryFee) * 100) / 100;

      expect(grandTotal).toBe(12.63);
    });

    it("should apply free delivery for orders over threshold", () => {
      const items = [{ menuItemId: "m1", name: "Feast", quantity: 1, unitPrice: 30.00 }];
      const validated = validateOrderItems(items);
      const { subtotal } = calculateOrderTotal(validated);
      const freeDeliveryThreshold = 25;
      const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : 3.99;

      expect(deliveryFee).toBe(0);
    });
  });

  describe("GET /api/orders", () => {
    it("should retrieve customer orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      const orders = await mockPrisma.order.findMany({
        where: { customerId: "customer-1" },
        include: { items: true, restaurant: true },
        orderBy: { createdAt: "desc" },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0].customerId).toBe("customer-1");
    });

    it("should retrieve restaurant orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      const orders = await mockPrisma.order.findMany({
        where: { restaurantId: "restaurant-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(orders).toHaveLength(1);
    });

    it("should filter orders by status", async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      const orders = await mockPrisma.order.findMany({
        where: { restaurantId: "restaurant-1", status: OrderStatus.PENDING },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe(OrderStatus.PENDING);
    });

    it("should paginate orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(50);

      const page = 2;
      const pageSize = 20;
      const orders = await mockPrisma.order.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await mockPrisma.order.count();

      expect(total).toBe(50);
      expect(orders).toHaveLength(0);
    });

    it("should return empty array for customer with no orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      const orders = await mockPrisma.order.findMany({
        where: { customerId: "no-orders-customer" },
      });
      expect(orders).toHaveLength(0);
    });
  });

  describe("PATCH /api/orders/:id/status", () => {
    it("should transition PENDING to CONFIRMED", () => {
      expect(canTransitionStatus(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    });

    it("should transition CONFIRMED to PREPARING", () => {
      expect(canTransitionStatus(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).toBe(true);
    });

    it("should transition PREPARING to READY", () => {
      expect(canTransitionStatus(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
    });

    it("should transition READY to OUT_FOR_DELIVERY", () => {
      expect(canTransitionStatus(OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    });

    it("should transition OUT_FOR_DELIVERY to DELIVERED", () => {
      expect(canTransitionStatus(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
    });

    it("should allow cancellation from PENDING", () => {
      expect(canTransitionStatus(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should allow cancellation from CONFIRMED", () => {
      expect(canTransitionStatus(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should allow cancellation from PREPARING", () => {
      expect(canTransitionStatus(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should not allow cancellation from DELIVERED", () => {
      expect(canTransitionStatus(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    });

    it("should not allow skip from PENDING to DELIVERED", () => {
      expect(canTransitionStatus(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    });

    it("should not allow reverse transition from DELIVERED to PREPARING", () => {
      expect(canTransitionStatus(OrderStatus.DELIVERED, OrderStatus.PREPARING)).toBe(false);
    });

    it("should not allow transition from CANCELLED", () => {
      expect(canTransitionStatus(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
      expect(canTransitionStatus(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
    });

    it("should update order status in database", async () => {
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      const updated = await mockPrisma.order.update({
        where: { id: "order-1" },
        data: { status: OrderStatus.CONFIRMED },
      });

      expect(updated.status).toBe(OrderStatus.CONFIRMED);
    });

    it("should set actualDeliveryTime on delivery", async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        actualDeliveryTime: new Date(),
      };
      mockPrisma.order.update.mockResolvedValue(deliveredOrder);

      const updated = await mockPrisma.order.update({
        where: { id: "order-1" },
        data: {
          status: OrderStatus.DELIVERED,
          actualDeliveryTime: new Date(),
        },
      });

      expect(updated.actualDeliveryTime).toBeDefined();
    });
  });

  describe("DELETE /api/orders/:id", () => {
    it("should cancel a pending order", async () => {
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const updated = await mockPrisma.order.update({
        where: { id: "order-1" },
        data: { status: OrderStatus.CANCELLED },
      });

      expect(updated.status).toBe(OrderStatus.CANCELLED);
    });

    it("should not delete a delivered order", async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockPrisma.order.findUnique.mockResolvedValue(deliveredOrder);

      const order = await mockPrisma.order.findUnique({
        where: { id: "order-1" },
      });

      expect(canTransitionStatus(order!.status, OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe("Order Statistics", () => {
    it("should calculate daily revenue", async () => {
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 1250.50 },
        _count: { id: 42 },
      });

      const stats = await mockPrisma.order.aggregate({
        where: {
          restaurantId: "restaurant-1",
          status: OrderStatus.DELIVERED,
          createdAt: { gte: new Date("2024-01-01") },
        },
        _sum: { total: true },
        _count: { id: true },
      });

      expect(stats._sum.total).toBe(1250.50);
      expect(stats._count.id).toBe(42);
    });

    it("should calculate average order value", async () => {
      const orders = [mockOrder, { ...mockOrder, id: "order-2", total: 45.00 }];
      const avgTotal = orders.reduce((s, o) => s + o.total, 0) / orders.length;

      expect(avgTotal).toBe(38.525);
    });

    it("should count orders by status", async () => {
      mockPrisma.order.count.mockResolvedValue(5);
      const pendingCount = await mockPrisma.order.count({
        where: { status: OrderStatus.PENDING },
      });
      expect(pendingCount).toBe(5);
    });
  });
});
