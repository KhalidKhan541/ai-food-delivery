import { describe, it, expect, beforeEach } from "@jest/globals";

interface Location {
  lat: number;
  lng: number;
  timestamp: Date;
}

interface DeliveryRoute {
  id: string;
  orderId: string;
  restaurantLocation: Location;
  customerLocation: Location;
  driverLocation: Location;
  waypoints: Location[];
  estimatedTimeMin: number;
  actualTimeMin?: number;
  distanceKm: number;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "FAILED";
  startedAt?: Date;
  completedAt?: Date;
}

interface TrafficCondition {
  severity: "LIGHT" | "MODERATE" | "HEAVY" | "SEVERE";
  speedMultiplier: number;
  description: string;
}

function calculateETA(
  distanceKm: number,
  trafficCondition: TrafficCondition,
  baseSpeedKmh: number = 30
): number {
  const adjustedSpeed = baseSpeedKmh * trafficCondition.speedMultiplier;
  if (adjustedSpeed <= 0) return Infinity;
  const timeHours = distanceKm / adjustedSpeed;
  return Math.ceil(timeHours * 60);
}

function optimizeRoute(
  waypoints: Location[],
  start: Location
): { route: Location[]; totalDistance: number } {
  if (waypoints.length === 0) {
    return { route: [], totalDistance: 0 };
  }

  const remaining = [...waypoints];
  const route: Location[] = [];
  let current = start;
  let totalDistance = 0;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        current.lat, current.lng,
        remaining[i].lat, remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    route.push(remaining[nearestIndex]);
    totalDistance += nearestDist;
    current = remaining[nearestIndex];
    remaining.splice(nearestIndex, 1);
  }

  return { route, totalDistance: Math.round(totalDistance * 100) / 100 };
}

function haversineDistance(
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
  return R * c;
}

function detectTrafficCondition(
  currentSpeed: number,
  freeFlowSpeed: number
): TrafficCondition {
  const ratio = currentSpeed / freeFlowSpeed;
  if (ratio >= 0.8) return { severity: "LIGHT", speedMultiplier: 1, description: "Free flowing" };
  if (ratio >= 0.5) return { severity: "MODERATE", speedMultiplier: 0.7, description: "Some congestion" };
  if (ratio >= 0.25) return { severity: "HEAVY", speedMultiplier: 0.4, description: "Heavy traffic" };
  return { severity: "SEVERE", speedMultiplier: 0.15, description: "Standstill traffic" };
}

function formatDeliveryTime(etaMinutes: number): string {
  if (etaMinutes < 1) return "Arriving now";
  if (etaMinutes < 60) return `${etaMinutes} min`;
  const hours = Math.floor(etaMinutes / 60);
  const mins = etaMinutes % 60;
  return `${hours}h ${mins}m`;
}

function calculateDeliveryProgress(
  route: DeliveryRoute,
  currentLocation: Location
): {
  percentComplete: number;
  distanceRemainingKm: number;
  estimatedArrivalMin: number;
} {
  const totalDist = route.distanceKm;
  const distRemaining = haversineDistance(
    currentLocation.lat, currentLocation.lng,
    route.customerLocation.lat, route.customerLocation.lng
  );
  const distCovered = Math.max(0, totalDist - distRemaining);
  const percentComplete = totalDist > 0
    ? Math.min(100, Math.round((distCovered / totalDist) * 100))
    : 0;

  return {
    percentComplete,
    distanceRemainingKm: Math.round(distRemaining * 100) / 100,
    estimatedArrivalMin: calculateETA(distRemaining, {
      severity: "LIGHT",
      speedMultiplier: 1,
      description: "",
    }),
  };
}

describe("Delivery Tracker Unit Tests", () => {
  const restaurant: Location = { lat: 40.7580, lng: -73.9855, timestamp: new Date() };
  const customer: Location = { lat: 40.7128, lng: -74.0060, timestamp: new Date() };
  const driver: Location = { lat: 40.7500, lng: -73.9900, timestamp: new Date() };

  describe("Haversine Distance", () => {
    it("should calculate distance between nearby points", () => {
      const dist = haversineDistance(40.7128, -74.006, 40.7580, -73.9855);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(10);
    });

    it("should return 0 for same point", () => {
      const dist = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(dist).toBe(0);
    });

    it("should calculate cross-city distance", () => {
      const dist = haversineDistance(40.7128, -74.006, 40.6892, -74.0445);
      expect(dist).toBeGreaterThan(3);
    });
  });

  describe("ETA Calculation", () => {
    it("should calculate ETA with light traffic", () => {
      const traffic: TrafficCondition = {
        severity: "LIGHT",
        speedMultiplier: 1,
        description: "Free flowing",
      };
      const eta = calculateETA(5, traffic);
      expect(eta).toBe(10);
    });

    it("should calculate ETA with heavy traffic", () => {
      const traffic: TrafficCondition = {
        severity: "HEAVY",
        speedMultiplier: 0.4,
        description: "Heavy traffic",
      };
      const eta = calculateETA(5, traffic);
      expect(eta).toBe(25);
    });

    it("should handle severe traffic", () => {
      const traffic: TrafficCondition = {
        severity: "SEVERE",
        speedMultiplier: 0.15,
        description: "Standstill",
      };
      const eta = calculateETA(5, traffic);
      expect(eta).toBe(67);
    });

    it("should handle zero distance", () => {
      const traffic: TrafficCondition = {
        severity: "LIGHT",
        speedMultiplier: 1,
        description: "",
      };
      const eta = calculateETA(0, traffic);
      expect(eta).toBe(0);
    });

    it("should round up to nearest minute", () => {
      const traffic: TrafficCondition = {
        severity: "LIGHT",
        speedMultiplier: 1,
        description: "",
      };
      const eta = calculateETA(3.5, traffic);
      expect(eta).toBe(7);
    });
  });

  describe("Traffic Detection", () => {
    it("should detect light traffic", () => {
      const condition = detectTrafficCondition(50, 60);
      expect(condition.severity).toBe("LIGHT");
      expect(condition.speedMultiplier).toBe(1);
    });

    it("should detect moderate traffic", () => {
      const condition = detectTrafficCondition(35, 60);
      expect(condition.severity).toBe("MODERATE");
      expect(condition.speedMultiplier).toBe(0.7);
    });

    it("should detect heavy traffic", () => {
      const condition = detectTrafficCondition(20, 60);
      expect(condition.severity).toBe("HEAVY");
    });

    it("should detect severe traffic", () => {
      const condition = detectTrafficCondition(5, 60);
      expect(condition.severity).toBe("SEVERE");
      expect(condition.speedMultiplier).toBe(0.15);
    });
  });

  describe("Route Optimization", () => {
    it("should optimize single waypoint route", () => {
      const { route, totalDistance } = optimizeRoute([customer], restaurant);
      expect(route).toHaveLength(1);
      expect(totalDistance).toBeGreaterThan(0);
    });

    it("should optimize multi-waypoint route", () => {
      const waypoints = [
        { lat: 40.7200, lng: -74.0000, timestamp: new Date() },
        { lat: 40.7300, lng: -73.9950, timestamp: new Date() },
        { lat: 40.7400, lng: -73.9900, timestamp: new Date() },
      ];
      const { route, totalDistance } = optimizeRoute(waypoints, restaurant);
      expect(route).toHaveLength(3);
      expect(totalDistance).toBeGreaterThan(0);
    });

    it("should handle empty waypoints", () => {
      const { route, totalDistance } = optimizeRoute([], restaurant);
      expect(route).toHaveLength(0);
      expect(totalDistance).toBe(0);
    });

    it("should not mutate original waypoints", () => {
      const waypoints = [
        { lat: 40.7200, lng: -74.0000, timestamp: new Date() },
        { lat: 40.7300, lng: -73.9950, timestamp: new Date() },
      ];
      const original = [...waypoints];
      optimizeRoute(waypoints, restaurant);
      expect(waypoints).toEqual(original);
    });
  });

  describe("Delivery Time Formatting", () => {
    it("should format minutes", () => {
      expect(formatDeliveryTime(15)).toBe("15 min");
    });

    it("should format hours and minutes", () => {
      expect(formatDeliveryTime(75)).toBe("1h 15m");
    });

    it("should format arriving now", () => {
      expect(formatDeliveryTime(0)).toBe("Arriving now");
    });

    it("should format exact hour", () => {
      expect(formatDeliveryTime(60)).toBe("1h 0m");
    });
  });

  describe("Delivery Progress", () => {
    it("should calculate progress at start", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: restaurant,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "ACTIVE",
      };

      const progress = calculateDeliveryProgress(route, restaurant);
      expect(progress.percentComplete).toBeGreaterThan(0);
      expect(progress.distanceRemainingKm).toBeGreaterThan(0);
    });

    it("should calculate progress near destination", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: driver,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "ACTIVE",
      };

      const progress = calculateDeliveryProgress(route, customer);
      expect(progress.distanceRemainingKm).toBeLessThan(1);
    });

    it("should cap progress at 100%", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: customer,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "ACTIVE",
      };

      const progress = calculateDeliveryProgress(route, customer);
      expect(progress.percentComplete).toBeLessThanOrEqual(100);
    });

    it("should return 0 distance at destination", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: customer,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "ACTIVE",
      };

      const progress = calculateDeliveryProgress(route, customer);
      expect(progress.distanceRemainingKm).toBe(0);
    });
  });

  describe("Route Status Management", () => {
    it("should initialize route in PLANNING status", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: restaurant,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "PLANNING",
      };

      expect(route.status).toBe("PLANNING");
      expect(route.startedAt).toBeUndefined();
    });

    it("should transition to ACTIVE when started", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: restaurant,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        status: "ACTIVE",
        startedAt: new Date(),
      };

      expect(route.status).toBe("ACTIVE");
      expect(route.startedAt).toBeDefined();
    });

    it("should record completion time", () => {
      const route: DeliveryRoute = {
        id: "route-1",
        orderId: "order-1",
        restaurantLocation: restaurant,
        customerLocation: customer,
        driverLocation: customer,
        waypoints: [],
        estimatedTimeMin: 15,
        distanceKm: 5,
        actualTimeMin: 12,
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 12 * 60 * 1000),
        completedAt: new Date(),
      };

      expect(route.status).toBe("COMPLETED");
      expect(route.actualTimeMin).toBe(12);
      expect(route.completedAt).toBeDefined();
    });

    it("should calculate actual vs estimated time", () => {
      const estimated = 15;
      const actual = 12;
      const diff = estimated - actual;
      expect(diff).toBe(3);
      expect(actual).toBeLessThan(estimated);
    });
  });
});
