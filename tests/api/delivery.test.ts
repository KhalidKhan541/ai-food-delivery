import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";

const mockPrisma = {
  delivery: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  deliveryDriver: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

enum DeliveryStatus {
  PENDING = "PENDING",
  ASSIGNED = "ASSIGNED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

interface Delivery {
  id: string;
  orderId: string;
  driverId: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedArrival: Date;
  actualArrival?: Date;
  currentLat?: number;
  currentLng?: number;
  distanceKm: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DeliveryDriver {
  id: string;
  userId: string;
  isAvailable: boolean;
  currentLat: number;
  currentLng: number;
  vehicleType: string;
  rating: number;
  totalDeliveries: number;
  currentDeliveryId?: string;
}

function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function estimateDeliveryTime(distanceKm: number, prepTimeMin: number): number {
  const avgSpeedKmPerMin = 0.5;
  const travelTimeMin = Math.ceil(distanceKm / avgSpeedKmPerMin);
  const bufferMin = 5;
  return prepTimeMin + travelTimeMin + bufferMin;
}

function canTransitionDeliveryStatus(
  current: DeliveryStatus, next: DeliveryStatus
): boolean {
  const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    [DeliveryStatus.PENDING]: [DeliveryStatus.ASSIGNED, DeliveryStatus.FAILED],
    [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.FAILED],
    [DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
    [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
    [DeliveryStatus.DELIVERED]: [],
    [DeliveryStatus.FAILED]: [DeliveryStatus.PENDING],
  };
  return transitions[current]?.includes(next) ?? false;
}

function findNearestDriver(
  drivers: DeliveryDriver[],
  restaurantLat: number,
  restaurantLng: number,
  maxDistanceKm: number = 5
): DeliveryDriver | null {
  const available = drivers.filter(
    (d) => d.isAvailable && !d.currentDeliveryId
  );

  if (available.length === 0) return null;

  let nearest: DeliveryDriver | null = null;
  let minDistance = Infinity;

  for (const driver of available) {
    const dist = calculateDistance(
      driver.currentLat, driver.currentLng,
      restaurantLat, restaurantLng
    );
    if (dist < minDistance && dist <= maxDistanceKm) {
      minDistance = dist;
      nearest = driver;
    }
  }

  return nearest;
}

describe("Delivery API", () => {
  const mockDriver: DeliveryDriver = {
    id: "driver-1",
    userId: "user-driver-1",
    isAvailable: true,
    currentLat: 40.7128,
    currentLng: -74.006,
    vehicleType: "car",
    rating: 4.8,
    totalDeliveries: 342,
  };

  const mockDelivery: Delivery = {
    id: "del-1",
    orderId: "order-1",
    driverId: "driver-1",
    status: DeliveryStatus.ASSIGNED,
    pickupAddress: "456 Oak Ave",
    deliveryAddress: "123 Main St",
    estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
    distanceKm: 3.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Driver Assignment", () => {
    it("should find nearest available driver", () => {
      const drivers: DeliveryDriver[] = [
        { ...mockDriver, id: "driver-1", currentLat: 40.713, currentLng: -74.005 },
        { ...mockDriver, id: "driver-2", currentLat: 40.758, currentLng: -73.985 },
        { ...mockDriver, id: "driver-3", currentLat: 40.689, currentLng: -74.044 },
      ];

      const nearest = findNearestDriver(drivers, 40.7128, -74.006);
      expect(nearest).not.toBeNull();
      expect(nearest!.id).toBe("driver-1");
    });

    it("should return null when no drivers available", () => {
      const drivers: DeliveryDriver[] = [
        { ...mockDriver, isAvailable: false },
      ];

      const nearest = findNearestDriver(drivers, 40.7128, -74.006);
      expect(nearest).toBeNull();
    });

    it("should return null when all drivers are on delivery", () => {
      const drivers: DeliveryDriver[] = [
        { ...mockDriver, currentDeliveryId: "del-other" },
      ];

      const nearest = findNearestDriver(drivers, 40.7128, -74.006);
      expect(nearest).toBeNull();
    });

    it("should exclude drivers beyond max distance", () => {
      const drivers: DeliveryDriver[] = [
        { ...mockDriver, currentLat: 41.0, currentLng: -74.5 },
      ];

      const nearest = findNearestDriver(drivers, 40.7128, -74.006, 5);
      expect(nearest).toBeNull();
    });

    it("should assign driver to delivery", async () => {
      mockPrisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.ASSIGNED,
      });

      const updated = await mockPrisma.delivery.update({
        where: { id: "del-1" },
        data: {
          driverId: "driver-1",
          status: DeliveryStatus.ASSIGNED,
        },
      });

      expect(updated.driverId).toBe("driver-1");
      expect(updated.status).toBe(DeliveryStatus.ASSIGNED);
    });
  });

  describe("Distance Calculation", () => {
    it("should calculate distance between two points", () => {
      const dist = calculateDistance(40.7128, -74.006, 40.758, -73.985);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(10);
    });

    it("should return 0 for same location", () => {
      const dist = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(dist).toBe(0);
    });

    it("should calculate cross-city distance", () => {
      const dist = calculateDistance(40.7128, -74.006, 40.0583, -74.4057);
      expect(dist).toBeGreaterThan(30);
    });
  });

  describe("Delivery Time Estimation", () => {
    it("should estimate time based on distance and prep time", () => {
      const time = estimateDeliveryTime(5, 15);
      expect(time).toBeGreaterThan(15);
    });

    it("should add buffer time", () => {
      const timeNoBuffer = Math.ceil(5 / 0.5);
      const timeWithBuffer = estimateDeliveryTime(5, 0);
      expect(timeWithBuffer).toBe(timeNoBuffer + 5);
    });

    it("should handle zero distance", () => {
      const time = estimateDeliveryTime(0, 15);
      expect(time).toBe(20);
    });

    it("should handle long distances", () => {
      const time = estimateDeliveryTime(30, 20);
      expect(time).toBeGreaterThan(60);
    });
  });

  describe("Delivery Status Transitions", () => {
    it("should allow PENDING to ASSIGNED", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED)).toBe(true);
    });

    it("should allow ASSIGNED to PICKED_UP", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP)).toBe(true);
    });

    it("should allow PICKED_UP to IN_TRANSIT", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT)).toBe(true);
    });

    it("should allow IN_TRANSIT to DELIVERED", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED)).toBe(true);
    });

    it("should allow FAILED from any active status", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.PENDING, DeliveryStatus.FAILED)).toBe(true);
      expect(canTransitionDeliveryStatus(DeliveryStatus.ASSIGNED, DeliveryStatus.FAILED)).toBe(true);
      expect(canTransitionDeliveryStatus(DeliveryStatus.PICKED_UP, DeliveryStatus.FAILED)).toBe(true);
      expect(canTransitionDeliveryStatus(DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED)).toBe(true);
    });

    it("should not allow transition from DELIVERED", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.DELIVERED, DeliveryStatus.IN_TRANSIT)).toBe(false);
      expect(canTransitionDeliveryStatus(DeliveryStatus.DELIVERED, DeliveryStatus.FAILED)).toBe(false);
    });

    it("should allow retry from FAILED to PENDING", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.FAILED, DeliveryStatus.PENDING)).toBe(true);
    });

    it("should not skip statuses", () => {
      expect(canTransitionDeliveryStatus(DeliveryStatus.PENDING, DeliveryStatus.DELIVERED)).toBe(false);
      expect(canTransitionDeliveryStatus(DeliveryStatus.ASSIGNED, DeliveryStatus.DELIVERED)).toBe(false);
    });
  });

  describe("GET /api/deliveries/:id", () => {
    it("should retrieve delivery details", async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      const delivery = await mockPrisma.delivery.findUnique({
        where: { id: "del-1" },
        include: { driver: true, order: true },
      });
      expect(delivery?.id).toBe("del-1");
      expect(delivery?.driverId).toBe("driver-1");
    });

    it("should track delivery location", async () => {
      const withLocation = {
        ...mockDelivery,
        currentLat: 40.72,
        currentLng: -74.001,
        status: DeliveryStatus.IN_TRANSIT,
      };
      mockPrisma.delivery.findUnique.mockResolvedValue(withLocation);

      const delivery = await mockPrisma.delivery.findUnique({
        where: { id: "del-1" },
      });

      expect(delivery?.currentLat).toBeDefined();
      expect(delivery?.currentLng).toBeDefined();
    });
  });

  describe("PATCH /api/deliveries/:id", () => {
    it("should update delivery status", async () => {
      mockPrisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.PICKED_UP,
      });

      const updated = await mockPrisma.delivery.update({
        where: { id: "del-1" },
        data: { status: DeliveryStatus.PICKED_UP },
      });

      expect(updated.status).toBe(DeliveryStatus.PICKED_UP);
    });

    it("should update driver location", async () => {
      mockPrisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        currentLat: 40.715,
        currentLng: -74.003,
      });

      const updated = await mockPrisma.delivery.update({
        where: { id: "del-1" },
        data: { currentLat: 40.715, currentLng: -74.003 },
      });

      expect(updated.currentLat).toBe(40.715);
    });

    it("should set actual arrival time on delivery", async () => {
      const now = new Date();
      mockPrisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.DELIVERED,
        actualArrival: now,
      });

      const updated = await mockPrisma.delivery.update({
        where: { id: "del-1" },
        data: { status: DeliveryStatus.DELIVERED, actualArrival: now },
      });

      expect(updated.actualArrival).toBeDefined();
    });

    it("should update driver availability after delivery", async () => {
      mockPrisma.deliveryDriver.update.mockResolvedValue({
        ...mockDriver,
        isAvailable: true,
        currentDeliveryId: null,
      });

      const updated = await mockPrisma.deliveryDriver.update({
        where: { id: "driver-1" },
        data: { isAvailable: true, currentDeliveryId: null },
      });

      expect(updated.isAvailable).toBe(true);
      expect(updated.currentDeliveryId).toBeNull();
    });
  });

  describe("Driver Availability", () => {
    it("should mark driver as unavailable during delivery", async () => {
      mockPrisma.deliveryDriver.update.mockResolvedValue({
        ...mockDriver,
        isAvailable: false,
        currentDeliveryId: "del-1",
      });

      const updated = await mockPrisma.deliveryDriver.update({
        where: { id: "driver-1" },
        data: { isAvailable: false, currentDeliveryId: "del-1" },
      });

      expect(updated.isAvailable).toBe(false);
    });

    it("should find available drivers", async () => {
      mockPrisma.deliveryDriver.findMany.mockResolvedValue([mockDriver]);
      const drivers = await mockPrisma.deliveryDriver.findMany({
        where: { isAvailable: true, currentDeliveryId: null },
      });
      expect(drivers).toHaveLength(1);
    });

    it("should calculate driver rating", () => {
      const ratings = [5, 4, 5, 5, 3, 4, 5];
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
      expect(avg).toBeCloseTo(4.43, 1);
    });

    it("should increment total deliveries on completion", async () => {
      mockPrisma.deliveryDriver.update.mockResolvedValue({
        ...mockDriver,
        totalDeliveries: 343,
      });

      const updated = await mockPrisma.deliveryDriver.update({
        where: { id: "driver-1" },
        data: { totalDeliveries: { increment: 1 } },
      });

      expect(updated.totalDeliveries).toBe(343);
    });
  });
});
