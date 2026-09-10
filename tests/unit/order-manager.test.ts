import { describe, it, expect, beforeEach, jest } from "@jest/globals";

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
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

function validateTransition(current: OrderStatus, next: OrderStatus): boolean {
  return transitions[current]?.includes(next) ?? false;
}

function createOrder(
  customerId: string,
  restaurantId: string,
  items: { name: string; quantity: number; unitPrice: number }[],
  specialInstructions?: string
): Order {
  if (!items || items.length === 0) {
    throw new Error("Order must have at least one item");
  }
  if (!customerId) throw new Error("Customer ID is required");
  if (!restaurantId) throw new Error("Restaurant ID is required");

  const orderItems: OrderItem[] = items.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const deliveryFee = subtotal >= 25 ? 0 : 3.99;
  const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

  return {
    id: `order-${Date.now()}`,
    customerId,
    restaurantId,
    status: OrderStatus.PENDING,
    items: orderItems,
    subtotal,
    tax,
    deliveryFee,
    tip: 0,
    total,
    specialInstructions,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function updateOrderStatus(
  order: Order,
  newStatus: OrderStatus
): Order {
  if (!validateTransition(order.status, newStatus)) {
    throw new Error(
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }
  return {
    ...order,
    status: newStatus,
    updatedAt: new Date(),
  };
}

function cancelOrder(order: Order, reason?: string): Order {
  if (!validateTransition(order.status, OrderStatus.CANCELLED)) {
    throw new Error(`Cannot cancel order in ${order.status} status`);
  }
  return {
    ...order,
    status: OrderStatus.CANCELLED,
    updatedAt: new Date(),
    specialInstructions: reason
      ? `CANCELLED: ${reason}`
      : order.specialInstructions,
  };
}

function getOrderTimeline(order: Order): { status: OrderStatus; timestamp: Date }[] {
  const timeline: { status: OrderStatus; timestamp: Date }[] = [];
  let currentStatus = OrderStatus.PENDING;
  let time = order.createdAt.getTime();

  timeline.push({ status: currentStatus, timestamp: new Date(time) });

  while (currentStatus !== order.status && currentStatus !== OrderStatus.CANCELLED) {
    const possibleNext = transitions[currentStatus];
    const next = possibleNext.find((s) => {
      if (order.status === OrderStatus.CANCELLED) {
        return s === OrderStatus.CANCELLED;
      }
      return true;
    });

    if (!next) break;
    time += 5 * 60 * 1000;
    currentStatus = next;
    timeline.push({ status: currentStatus, timestamp: new Date(time) });
  }

  return timeline;
}

function calculateOrderMetrics(orders: Order[]): {
  totalOrders: number;
  averageOrderValue: number;
  cancellationRate: number;
  averageItemsPerOrder: number;
} {
  const totalOrders = orders.length;
  if (totalOrders === 0) {
    return {
      totalOrders: 0,
      averageOrderValue: 0,
      cancellationRate: 0,
      averageItemsPerOrder: 0,
    };
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = Math.round((totalRevenue / totalOrders) * 100) / 100;
  const cancelled = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;
  const cancellationRate = Math.round((cancelled / totalOrders) * 10000) / 100;
  const totalItems = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const averageItemsPerOrder = Math.round((totalItems / totalOrders) * 100) / 100;

  return { totalOrders, averageOrderValue, cancellationRate, averageItemsPerOrder };
}

describe("Order Manager Unit Tests", () => {
  describe("Order Creation", () => {
    it("should create an order with valid data", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 2, unitPrice: 12.99 },
      ]);
      expect(order.customerId).toBe("cust-1");
      expect(order.restaurantId).toBe("rest-1");
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it("should calculate item total price", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 3, unitPrice: 10 },
      ]);
      expect(order.items[0].totalPrice).toBe(30);
    });

    it("should calculate subtotal", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 2, unitPrice: 12.99 },
        { name: "Salad", quantity: 1, unitPrice: 8.99 },
      ]);
      expect(order.subtotal).toBe(34.97);
    });

    it("should apply 8% tax", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Item", quantity: 1, unitPrice: 100 },
      ]);
      expect(order.tax).toBe(8);
    });

    it("should waive delivery fee above $25", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Feast", quantity: 1, unitPrice: 30 },
      ]);
      expect(order.deliveryFee).toBe(0);
    });

    it("should charge delivery fee below $25", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Snack", quantity: 1, unitPrice: 10 },
      ]);
      expect(order.deliveryFee).toBe(3.99);
    });

    it("should reject empty items", () => {
      expect(() => createOrder("cust-1", "rest-1", [])).toThrow(
        "Order must have at least one item"
      );
    });

    it("should reject missing customer ID", () => {
      expect(() =>
        createOrder("", "rest-1", [{ name: "Item", quantity: 1, unitPrice: 10 }])
      ).toThrow("Customer ID is required");
    });

    it("should reject missing restaurant ID", () => {
      expect(() =>
        createOrder("cust-1", "", [{ name: "Item", quantity: 1, unitPrice: 10 }])
      ).toThrow("Restaurant ID is required");
    });

    it("should include special instructions", () => {
      const order = createOrder(
        "cust-1",
        "rest-1",
        [{ name: "Pizza", quantity: 1, unitPrice: 12.99 }],
        "No onions"
      );
      expect(order.specialInstructions).toBe("No onions");
    });
  });

  describe("Status Transitions", () => {
    it("should transition through full delivery lifecycle", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);

      order = updateOrderStatus(order, OrderStatus.CONFIRMED);
      expect(order.status).toBe(OrderStatus.CONFIRMED);

      order = updateOrderStatus(order, OrderStatus.PREPARING);
      expect(order.status).toBe(OrderStatus.PREPARING);

      order = updateOrderStatus(order, OrderStatus.READY);
      expect(order.status).toBe(OrderStatus.READY);

      order = updateOrderStatus(order, OrderStatus.OUT_FOR_DELIVERY);
      expect(order.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

      order = updateOrderStatus(order, OrderStatus.DELIVERED);
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it("should allow cancellation from PENDING", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = cancelOrder(order, "Changed mind");
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it("should allow cancellation from PREPARING", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = updateOrderStatus(order, OrderStatus.CONFIRMED);
      order = updateOrderStatus(order, OrderStatus.PREPARING);
      order = cancelOrder(order, "Restaurant too slow");
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it("should not allow cancellation from DELIVERED", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = updateOrderStatus(order, OrderStatus.CONFIRMED);
      order = updateOrderStatus(order, OrderStatus.PREPARING);
      order = updateOrderStatus(order, OrderStatus.READY);
      order = updateOrderStatus(order, OrderStatus.OUT_FOR_DELIVERY);
      order = updateOrderStatus(order, OrderStatus.DELIVERED);

      expect(() => cancelOrder(order)).toThrow("Cannot cancel order");
    });

    it("should not allow skipping statuses", () => {
      const order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      expect(() =>
        updateOrderStatus(order, OrderStatus.DELIVERED)
      ).toThrow("Cannot transition");
    });

    it("should not allow reverse transitions", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = updateOrderStatus(order, OrderStatus.CONFIRMED);

      expect(() =>
        updateOrderStatus(order, OrderStatus.PENDING)
      ).toThrow("Cannot transition");
    });

    it("should not allow transitions from CANCELLED", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = cancelOrder(order);

      expect(() =>
        updateOrderStatus(order, OrderStatus.PENDING)
      ).toThrow("Cannot transition");
    });

    it("should update timestamp on status change", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      const beforeUpdate = order.updatedAt;
      order = updateOrderStatus(order, OrderStatus.CONFIRMED);
      expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
    });
  });

  describe("Order Timeline", () => {
    it("should generate timeline for delivered order", () => {
      let order = createOrder("cust-1", "rest-1", [
        { name: "Pizza", quantity: 1, unitPrice: 12.99 },
      ]);
      order = updateOrderStatus(order, OrderStatus.CONFIRMED);
      order = updateOrderStatus(order, OrderStatus.PREPARING);
      order = updateOrderStatus(order, OrderStatus.READY);
      order = updateOrderStatus(order, OrderStatus.OUT_FOR_DELIVERY);
      order = updateOrderStatus(order, OrderStatus.DELIVERED);

      const timeline = getOrderTimeline(order);
      expect(timeline.length).toBeGreaterThanOrEqual(2);
      expect(timeline[0].status).toBe(OrderStatus.PENDING);
    });
  });

  describe("Order Metrics", () => {
    it("should calculate metrics for multiple orders", () => {
      const orders = [
        createOrder("c1", "r1", [{ name: "A", quantity: 1, unitPrice: 20 }]),
        createOrder("c2", "r1", [{ name: "B", quantity: 2, unitPrice: 15 }]),
        createOrder("c3", "r1", [{ name: "C", quantity: 1, unitPrice: 30 }]),
      ];
      orders[1] = cancelOrder(orders[1]);

      const metrics = calculateOrderMetrics(orders);
      expect(metrics.totalOrders).toBe(3);
      expect(metrics.cancellationRate).toBeCloseTo(33.33, 0);
    });

    it("should handle empty orders array", () => {
      const metrics = calculateOrderMetrics([]);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
    });

    it("should calculate average items per order", () => {
      const orders = [
        createOrder("c1", "r1", [
          { name: "A", quantity: 1, unitPrice: 10 },
          { name: "B", quantity: 2, unitPrice: 5 },
        ]),
        createOrder("c2", "r1", [
          { name: "C", quantity: 3, unitPrice: 8 },
        ]),
      ];

      const metrics = calculateOrderMetrics(orders);
      expect(metrics.averageItemsPerOrder).toBe(3);
    });
  });
});
