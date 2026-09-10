import { z } from "zod";
import { getAIProvider, type ChatMessage } from "../ai/provider";

// --- Types ----------------------------------------------------------------

export interface DriverProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  vehicleType: VehicleType;
  vehicleInfo: VehicleInfo;
  licenseNumber: string;
  insurancePolicy: string;
  documentsVerified: boolean;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  joinDate: Date;
  status: DriverStatus;
  backgroundCheckStatus: "pending" | "approved" | "rejected";
  verificationNotes?: string;
}

export type VehicleType = "bicycle" | "motorcycle" | "scooter" | "car" | "van";

export interface VehicleInfo {
  type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
}

export type DriverStatus = "offline" | "online" | "on_delivery" | "paused";

export interface DriverAvailability {
  driverId: string;
  isAvailable: boolean;
  currentZone: string;
  schedule: AvailabilitySlot[];
  totalHoursThisWeek: number;
  maxHoursPerWeek: number;
  breaksTaken: BreakRecord[];
  lastActiveAt: Date;
}

export interface AvailabilitySlot {
  day: number;
  startHour: number;
  endHour: number;
  isRecurring: boolean;
}

export interface BreakRecord {
  startTime: Date;
  endTime?: Date;
  type: "rest" | "meal" | "personal";
}

export interface DriverEarnings {
  driverId: string;
  period: EarningPeriod;
  totalEarnings: number;
  basePay: number;
  distancePay: number;
  timePay: number;
  surgeBonus: number;
  tipTotal: number;
  bonusTotal: number;
  deductions: number;
  netEarnings: number;
  tripsCompleted: number;
  averagePerTrip: number;
  averagePerHour: number;
  topEarningDays: Array<{ date: string; earnings: number; trips: number }>;
  earningsByCategory: { delivery: number; tips: number; bonuses: number; surge: number };
}

export type EarningPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface DriverPerformance {
  driverId: string;
  rating: number;
  acceptanceRate: number;
  completionRate: number;
  avgDeliveryTime: number;
  onTimeRate: number;
  totalTrips: number;
  totalDistance: number;
  customerCompliments: number;
  customerComplaints: number;
  rank: number;
  tier: DriverTier;
}

export type DriverTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  driverId: string;
  restaurantLocation: { latitude: number; longitude: number };
  deliveryLocation: { latitude: number; longitude: number };
  distanceKm: number;
  estimatedTime: number;
  status: AssignmentStatus;
  offeredAt: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  estimatedPayout: number;
  actualPayout?: number;
}

export type AssignmentStatus = "offered" | "accepted" | "arriving" | "picked_up" | "in_transit" | "delivered" | "cancelled";

export interface DriverStats {
  totalDrivers: number;
  onlineDrivers: number;
  activeDeliveries: number;
  averageRating: number;
  averageDeliveryTime: number;
  topPerformers: Array<{ driverId: string; name: string; rating: number; trips: number }>;
  zoneDistribution: Record<string, number>;
}

// --- Validation -----------------------------------------------------------

const driverProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(10),
  vehicleType: z.enum(["bicycle", "motorcycle", "scooter", "car", "van"]),
  licenseNumber: z.string().min(5),
  insurancePolicy: z.string().min(5),
});

// --- Constants ------------------------------------------------------------

const TIER_THRESHOLDS: Record<DriverTier, { minRating: number; minTrips: number }> = {
  bronze: { minRating: 0, minTrips: 0 },
  silver: { minRating: 4.2, minTrips: 50 },
  gold: { minRating: 4.5, minTrips: 200 },
  platinum: { minRating: 4.7, minTrips: 500 },
  diamond: { minRating: 4.9, minTrips: 1000 },
};

const TIER_MULTIPLIERS: Record<DriverTier, number> = {
  bronze: 1.0,
  silver: 1.05,
  gold: 1.1,
  platinum: 1.15,
  diamond: 1.2,
};

// --- Driver Service -------------------------------------------------------

export class DriverService {
  private provider = getAIProvider();
  private drivers = new Map<string, DriverProfile>();
  private availability = new Map<string, DriverAvailability>();
  private earnings = new Map<string, DriverEarnings>();
  private assignments = new Map<string, DeliveryAssignment[]>();
  private performance = new Map<string, DriverPerformance>();

  async createProfile(data: z.infer<typeof driverProfileSchema>): Promise<DriverProfile> {
    const validated = driverProfileSchema.parse(data);
    const profile: DriverProfile = {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      ...validated,
      avatarUrl: undefined,
      vehicleInfo: { type: validated.vehicleType },
      documentsVerified: false,
      rating: 5.0,
      totalTrips: 0,
      totalEarnings: 0,
      joinDate: new Date(),
      status: "offline",
      backgroundCheckStatus: "pending",
    };
    this.drivers.set(profile.id, profile);

    this.availability.set(profile.id, {
      driverId: profile.id,
      isAvailable: false,
      currentZone: "default",
      schedule: [],
      totalHoursThisWeek: 0,
      maxHoursPerWeek: 60,
      breaksTaken: [],
      lastActiveAt: new Date(),
    });

    this.performance.set(profile.id, {
      driverId: profile.id,
      rating: 5.0,
      acceptanceRate: 100,
      completionRate: 100,
      avgDeliveryTime: 0,
      onTimeRate: 100,
      totalTrips: 0,
      totalDistance: 0,
      customerCompliments: 0,
      customerComplaints: 0,
      rank: 0,
      tier: "bronze",
    });

    return profile;
  }

  updateStatus(driverId: string, status: DriverStatus): DriverProfile | undefined {
    const driver = this.drivers.get(driverId);
    if (!driver) return undefined;
    driver.status = status;
    const avail = this.availability.get(driverId);
    if (avail) {
      avail.isAvailable = status === "online";
      avail.lastActiveAt = new Date();
    }
    return driver;
  }

  setSchedule(driverId: string, schedule: AvailabilitySlot[]): boolean {
    const avail = this.availability.get(driverId);
    if (!avail) return false;
    avail.schedule = schedule;
    return true;
  }

  startBreak(driverId: string, type: BreakRecord["type"]): boolean {
    const avail = this.availability.get(driverId);
    if (!avail) return false;
    const activeBreak = avail.breaksTaken.find((b) => !b.endTime);
    if (activeBreak) return false;
    avail.breaksTaken.push({ startTime: new Date(), type });
    this.updateStatus(driverId, "paused");
    return true;
  }

  endBreak(driverId: string): boolean {
    const avail = this.availability.get(driverId);
    if (!avail) return false;
    const activeBreak = avail.breaksTaken.find((b) => !b.endTime);
    if (!activeBreak) return false;
    activeBreak.endTime = new Date();
    this.updateStatus(driverId, "online");
    return true;
  }

  getAvailableDrivers(zoneId: string, requiredVehicleType?: VehicleType): DriverProfile[] {
    return [...this.drivers.values()].filter((d) => {
      if (d.status !== "online") return false;
      const avail = this.availability.get(d.id);
      if (!avail?.isAvailable) return false;
      if (avail.currentZone !== zoneId) return false;
      if (requiredVehicleType && d.vehicleType !== requiredVehicleType) return false;
      return true;
    });
  }

  async assignDelivery(orderId: string, restaurantLocation: { latitude: number; longitude: number }, deliveryLocation: { latitude: number; longitude: number }, distanceKm: number): Promise<DeliveryAssignment | null> {
    const available = this.getAvailableDrivers("default");
    if (!available.length) return null;

    const scored = available.map((d) => {
      const perf = this.performance.get(d.id);
      const score = (perf?.rating ?? 5) * 0.4 + (1 / Math.max(1, perf?.avgDeliveryTime ?? 30)) * 100 * 0.3 + (perf?.acceptanceRate ?? 100) * 0.3;
      return { driver: d, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const selected = scored[0].driver;
    const estimatedTime = Math.round(distanceKm * 3 + 10);
    const tier = this.performance.get(selected.id)?.tier ?? "bronze";
    const basePayout = distanceKm * 0.60 + estimatedTime * 0.25 + 3.00;
    const estimatedPayout = Math.round(basePayout * TIER_MULTIPLIERS[tier] * 100) / 100;

    const assignment: DeliveryAssignment = {
      id: crypto.randomUUID(),
      orderId,
      driverId: selected.id,
      restaurantLocation,
      deliveryLocation,
      distanceKm,
      estimatedTime,
      status: "offered",
      offeredAt: new Date(),
      estimatedPayout,
    };

    const existing = this.assignments.get(selected.id) ?? [];
    existing.push(assignment);
    this.assignments.set(selected.id, existing);

    this.updateStatus(selected.id, "on_delivery");
    return assignment;
  }

  acceptAssignment(driverId: string, assignmentId: string): DeliveryAssignment | undefined {
    const assignments = this.assignments.get(driverId) ?? [];
    const assignment = assignments.find((a) => a.id === assignmentId && a.status === "offered");
    if (!assignment) return undefined;
    assignment.status = "accepted";
    assignment.acceptedAt = new Date();
    return assignment;
  }

  updateAssignmentStatus(driverId: string, assignmentId: string, status: AssignmentStatus): DeliveryAssignment | undefined {
    const assignments = this.assignments.get(driverId) ?? [];
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return undefined;
    assignment.status = status;
    if (status === "picked_up") assignment.pickedUpAt = new Date();
    if (status === "delivered") {
      assignment.deliveredAt = new Date();
      assignment.actualPayout = assignment.estimatedPayout;
      this.updateStatus(driverId, "online");
      this.recordTrip(driverId, assignment);
    }
    return assignment;
  }

  getEarnings(driverId: string, period: EarningPeriod): DriverEarnings {
    const existing = this.earnings.get(driverId);
    if (existing && existing.period === period) return existing;

    const assignments = (this.assignments.get(driverId) ?? []).filter((a) => a.status === "delivered");
    const totalEarnings = assignments.reduce((s, a) => s + (a.actualPayout ?? 0), 0);

    const earnings: DriverEarnings = {
      driverId,
      period,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      basePay: Math.round(totalEarnings * 0.35 * 100) / 100,
      distancePay: Math.round(totalEarnings * 0.30 * 100) / 100,
      timePay: Math.round(totalEarnings * 0.15 * 100) / 100,
      surgeBonus: Math.round(totalEarnings * 0.10 * 100) / 100,
      tipTotal: Math.round(totalEarnings * 0.15 * 100) / 100,
      bonusTotal: 0,
      deductions: 0,
      netEarnings: Math.round(totalEarnings * 0.95 * 100) / 100,
      tripsCompleted: assignments.length,
      averagePerTrip: assignments.length ? Math.round((totalEarnings / assignments.length) * 100) / 100 : 0,
      averagePerHour: 0,
      topEarningDays: [],
      earningsByCategory: {
        delivery: Math.round(totalEarnings * 0.65 * 100) / 100,
        tips: Math.round(totalEarnings * 0.15 * 100) / 100,
        bonuses: Math.round(totalEarnings * 0.10 * 100) / 100,
        surge: Math.round(totalEarnings * 0.10 * 100) / 100,
      },
    };

    this.earnings.set(driverId, earnings);
    return earnings;
  }

  async getAIPerformanceInsights(driverId: string): Promise<string> {
    const perf = this.performance.get(driverId);
    const driver = this.drivers.get(driverId);
    if (!perf || !driver) return "Driver data not found.";

    const messages: ChatMessage[] = [
      { role: "system", content: "You are a performance coach for delivery drivers. Give 2-3 specific, actionable tips based on the metrics. Be encouraging." },
      {
        role: "user",
        content: JSON.stringify({
          name: `${driver.firstName} ${driver.lastName}`,
          rating: perf.rating,
          acceptanceRate: perf.acceptanceRate,
          completionRate: perf.completionRate,
          avgDeliveryTime: perf.avgDeliveryTime,
          onTimeRate: perf.onTimeRate,
          totalTrips: perf.totalTrips,
          tier: perf.tier,
          compliments: perf.customerCompliments,
          complaints: perf.customerComplaints,
        }),
      },
    ];

    try {
      const res = await this.provider.complete({ messages, temperature: 0.5, maxTokens: 300 });
      return res.content;
    } catch {
      return `Performance summary: ${perf.rating}★ rating, ${perf.completionRate}% completion, ${perf.tier} tier. Keep up the great work!`;
    }
  }

  getDriverStats(): DriverStats {
    const allDrivers = [...this.drivers.values()];
    const online = allDrivers.filter((d) => d.status === "online" || d.status === "on_delivery");
    const activeDeliveries = allDrivers.filter((d) => d.status === "on_delivery").length;

    const perfArray = [...this.performance.values()];
    const avgRating = perfArray.length ? perfArray.reduce((s, p) => s + p.rating, 0) / perfArray.length : 0;
    const avgTime = perfArray.length ? perfArray.reduce((s, p) => s + p.avgDeliveryTime, 0) / perfArray.length : 0;

    const topPerformers = perfArray.sort((a, b) => b.rating * b.totalTrips - a.rating * a.totalTrips).slice(0, 5).map((p) => {
      const d = this.drivers.get(p.driverId);
      return { driverId: p.driverId, name: d ? `${d.firstName} ${d.lastName}` : "Unknown", rating: p.rating, trips: p.totalTrips };
    });

    const zoneDistribution: Record<string, number> = {};
    for (const [, avail] of this.availability) {
      if (avail.isAvailable) zoneDistribution[avail.currentZone] = (zoneDistribution[avail.currentZone] ?? 0) + 1;
    }

    return {
      totalDrivers: allDrivers.length,
      onlineDrivers: online.length,
      activeDeliveries,
      averageRating: Math.round(avgRating * 100) / 100,
      averageDeliveryTime: Math.round(avgTime),
      topPerformers,
      zoneDistribution,
    };
  }

  calculateTier(driverId: string): DriverTier {
    const perf = this.performance.get(driverId);
    if (!perf) return "bronze";
    let tier: DriverTier = "bronze";
    for (const [t, req] of Object.entries(TIER_THRESHOLDS)) {
      if (perf.rating >= req.minRating && perf.totalTrips >= req.minTrips) tier = t as DriverTier;
    }
    perf.tier = tier;
    return tier;
  }

  private recordTrip(driverId: string, assignment: DeliveryAssignment): void {
    const perf = this.performance.get(driverId);
    if (perf) {
      perf.totalTrips++;
      perf.totalDistance += assignment.distanceKm;
      const deliveryTime = assignment.deliveredAt && assignment.acceptedAt
        ? (assignment.deliveredAt.getTime() - assignment.acceptedAt.getTime()) / 60000
        : assignment.estimatedTime;
      perf.avgDeliveryTime = (perf.avgDeliveryTime * (perf.totalTrips - 1) + deliveryTime) / perf.totalTrips;
      this.calculateTier(driverId);
    }
    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.totalTrips++;
      driver.totalEarnings += assignment.actualPayout ?? assignment.estimatedPayout;
    }
  }
}

export const driverService = new DriverService();
