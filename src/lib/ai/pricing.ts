import { z } from "zod";
import { getAIProvider, type ChatMessage } from "./provider";

// --- Types ----------------------------------------------------------------

export interface SurgeConditions {
  timestamp: Date;
  demandMultiplier: number;
  supplyMultiplier: number;
  weatherImpact: number;
  eventImpact: number;
  trafficImpact: number;
  isSurge: boolean;
  surgeLevel: "none" | "low" | "medium" | "high" | "extreme";
  estimatedDuration: number;
  affectedZones: string[];
}

export interface DynamicPriceRequest {
  orderId: string;
  restaurantId: string;
  restaurantLocation: { latitude: number; longitude: number };
  deliveryLocation: { latitude: number; longitude: number };
  distanceKm: number;
  basePrice: number;
  itemCount: number;
  timeOfDay: Date;
  zoneId?: string;
  userId?: string;
  isPriority?: boolean;
}

export interface PriceBreakdown {
  baseDeliveryFee: number;
  distanceFee: number;
  surgeFee: number;
  weatherSurcharge: number;
  timeSurcharge: number;
  platformFee: number;
  taxEstimate: number;
  discount: number;
  totalDeliveryFee: number;
  serviceFee: number;
  tip: number;
  grandTotal: number;
  surge: SurgeConditions;
  savings: string[];
  promoCode?: string;
}

export interface PromoCode {
  code: string;
  type: "percentage" | "fixed" | "free_delivery" | "bogo";
  value: number;
  minOrder: number;
  maxDiscount: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  applicableCuisines: string[];
  isActive: boolean;
}

export interface DriverPayout {
  driverId: string;
  basePay: number;
  distancePay: number;
  timePay: number;
  surgeBonus: number;
  tipTotal: number;
  totalPayout: number;
  period: { start: Date; end: Date };
  trips: number;
  avgRating: number;
}

export interface ZonePricing {
  zoneId: string;
  baseFee: number;
  perKmRate: number;
  surgeMultiplier: number;
  isActive: boolean;
}

// --- Validation -----------------------------------------------------------

const dynamicPriceRequestSchema = z.object({
  orderId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  distanceKm: z.number().min(0).max(100),
  basePrice: z.number().min(0),
  itemCount: z.number().int().min(1),
  isPriority: z.boolean().optional(),
});

// --- Constants ------------------------------------------------------------

const BASE_DELIVERY_FEE = 2.99;
const PER_KM_RATE = 0.50;
const PLATFORM_FEE_PERCENT = 0.15;
const SERVICE_FEE = 1.49;
const TAX_RATE = 0.08;
const PRIORITY_MULTIPLIER = 1.5;
const FREE_DELIVERY_THRESHOLD = 25;

// --- Surge Detection Engine -----------------------------------------------

export class SurgeDetector {
  private provider = getAIProvider();
  private surgeHistory: SurgeConditions[] = [];

  async detectSurge(zoneId: string): Promise<SurgeConditions> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    let demandScore = this.calculateDemandScore(hour, dayOfWeek);
    let supplyScore = this.calculateSupplyScore(hour);
    let weatherScore = await this.getWeatherImpact();
    let eventScore = await this.getEventImpact();
    let trafficScore = this.getTrafficImpact(hour, dayOfWeek);

    const demandMultiplier = 1 + (demandScore - 0.5) * 0.8;
    const supplyMultiplier = Math.max(0.5, 1 - (1 - supplyScore) * 0.6);
    const combinedMultiplier = demandMultiplier * supplyMultiplier;
    const weatherImpact = weatherScore * 0.3;
    const eventImpact = eventScore * 0.4;
    const trafficImpact = trafficScore * 0.2;

    const totalMultiplier = combinedMultiplier + weatherImpact + eventImpact + trafficImpact;

    let surgeLevel: SurgeConditions["surgeLevel"] = "none";
    if (totalMultiplier > 2.5) surgeLevel = "extreme";
    else if (totalMultiplier > 1.8) surgeLevel = "high";
    else if (totalMultiplier > 1.3) surgeLevel = "medium";
    else if (totalMultiplier > 1.1) surgeLevel = "low";

    const conditions: SurgeConditions = {
      timestamp: now,
      demandMultiplier: Math.round(demandMultiplier * 100) / 100,
      supplyMultiplier: Math.round(supplyMultiplier * 100) / 100,
      weatherImpact: Math.round(weatherImpact * 100) / 100,
      eventImpact: Math.round(eventImpact * 100) / 100,
      trafficImpact: Math.round(trafficImpact * 100) / 100,
      isSurge: totalMultiplier > 1.1,
      surgeLevel,
      estimatedDuration: this.estimateSurgeDuration(hour, dayOfWeek),
      affectedZones: [zoneId],
    };

    this.surgeHistory.push(conditions);
    if (this.surgeHistory.length > 100) this.surgeHistory.shift();
    return conditions;
  }

  private calculateDemandScore(hour: number, dayOfWeek: number): number {
    let score = 0.3;
    if (hour >= 11 && hour <= 13) score = 0.9;
    else if (hour >= 17 && hour <= 20) score = 0.95;
    else if (hour >= 21 && hour <= 23) score = 0.7;
    else if (hour >= 14 && hour <= 16) score = 0.5;
    if (dayOfWeek === 5 || dayOfWeek === 6) score = Math.min(score * 1.3, 1);
    if (dayOfWeek === 0) score *= 1.1;
    return Math.min(score, 1);
  }

  private calculateSupplyScore(hour: number): number {
    if (hour >= 10 && hour <= 14) return 0.8;
    if (hour >= 17 && hour <= 21) return 0.7;
    if (hour >= 22 || hour <= 6) return 0.3;
    return 0.6;
  }

  private async getWeatherImpact(): Promise<number> {
    try {
      const res = await this.provider.complete({
        messages: [
          { role: "system", content: "Return ONLY a JSON object { \"impact\": 0.0-1.0, \"reason\": \"...\" }" },
          { role: "user", content: "Current conditions for food delivery surge: moderate rain, 15°C, evening rush hour. Rate weather impact on delivery difficulty." },
        ],
        temperature: 0.2,
        maxTokens: 100,
        responseFormat: { type: "json_object" },
      });
      const data = JSON.parse(res.content) as { impact?: number };
      return data.impact ?? 0.2;
    } catch {
      return 0.2;
    }
  }

  private async getEventImpact(): Promise<number> {
    try {
      const res = await this.provider.complete({
        messages: [
          { role: "system", content: "Return ONLY a JSON object { \"impact\": 0.0-1.0, \"reason\": \"...\" }" },
          { role: "user", content: "Assess event impact on food delivery demand: Friday evening in a city center. No major holidays." },
        ],
        temperature: 0.2,
        maxTokens: 100,
        responseFormat: { type: "json_object" },
      });
      const data = JSON.parse(res.content) as { impact?: number };
      return data.impact ?? 0.1;
    } catch {
      return 0.1;
    }
  }

  private getTrafficImpact(hour: number, dayOfWeek: number): number {
    let base = 0.1;
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) base = 0.6;
    if (dayOfWeek === 5) base *= 1.3;
    return Math.min(base, 1);
  }

  private estimateSurgeDuration(hour: number, dayOfWeek: number): number {
    if (hour >= 11 && hour <= 13) return 30;
    if (hour >= 17 && hour <= 20) return 45;
    if (dayOfWeek === 5 || dayOfWeek === 6) return 60;
    return 20;
  }

  getSurgeHistory(): SurgeConditions[] {
    return [...this.surgeHistory];
  }
}

// --- Dynamic Pricing Engine -----------------------------------------------

export class DynamicPricingService {
  private surgeDetector = new SurgeDetector();
  private provider = getAIProvider();
  private promoCodes = new Map<string, PromoCode>();
  private zonePricing = new Map<string, ZonePricing>();

  async calculatePrice(req: DynamicPriceRequest): Promise<PriceBreakdown> {
    const validated = dynamicPriceRequestSchema.parse(req);

    const surge = await this.surgeDetector.detectSurge(req.zoneId ?? "default");

    const baseDeliveryFee = BASE_DELIVERY_FEE;
    const distanceFee = Math.round(validated.distanceKm * PER_KM_RATE * 100) / 100;
    const surgeFee = surge.isSurge ? Math.round((baseDeliveryFee + distanceFee) * (surge.demandMultiplier - 1) * 100) / 100 : 0;
    const weatherSurcharge = Math.round((baseDeliveryFee + distanceFee) * surge.weatherImpact * 100) / 100;
    const timeSurcharge = this.calculateTimeSurcharge(req.timeOfDay);
    const platformFee = Math.round(validated.basePrice * PLATFORM_FEE_PERCENT * 100) / 100;
    const serviceFee = SERVICE_FEE;
    const taxEstimate = Math.round(validated.basePrice * TAX_RATE * 100) / 100;

    const priorityMultiplier = req.isPriority ? PRIORITY_MULTIPLIER : 1;
    let totalDeliveryFee = Math.round((baseDeliveryFee + distanceFee + surgeFee + weatherSurcharge + timeSurcharge) * priorityMultiplier * 100) / 100;

    const savings: string[] = [];
    let discount = 0;
    if (validated.basePrice >= FREE_DELIVERY_THRESHOLD) {
      savings.push("Free delivery on orders over $25");
      totalDeliveryFee = 0;
    }

    const grandTotal = Math.round((validated.basePrice + totalDeliveryFee + serviceFee + taxEstimate - discount) * 100) / 100;

    return {
      baseDeliveryFee,
      distanceFee,
      surgeFee,
      weatherSurcharge,
      timeSurcharge,
      platformFee,
      taxEstimate,
      discount,
      totalDeliveryFee,
      serviceFee,
      tip: 0,
      grandTotal,
      surge,
      savings,
    };
  }

  async applyPromoCode(code: string, currentPrice: PriceBreakdown, orderTotal: number, cuisine?: string): Promise<PriceBreakdown> {
    const promo = this.promoCodes.get(code.toUpperCase());
    if (!promo || !promo.isActive) return currentPrice;
    if (new Date() < promo.validFrom || new Date() > promo.validUntil) return currentPrice;
    if (promo.usedCount >= promo.usageLimit) return currentPrice;
    if (orderTotal < promo.minOrder) return currentPrice;
    if (promo.applicableCuisines.length && cuisine && !promo.applicableCuisines.includes(cuisine)) return currentPrice;

    let discount = 0;
    const updated = { ...currentPrice, promoCode: code.toUpperCase() };

    switch (promo.type) {
      case "percentage":
        discount = Math.min((orderTotal * promo.value) / 100, promo.maxDiscount);
        break;
      case "fixed":
        discount = Math.min(promo.value, promo.maxDiscount);
        break;
      case "free_delivery":
        discount = currentPrice.totalDeliveryFee;
        updated.totalDeliveryFee = 0;
        break;
      case "bogo":
        discount = currentPrice.platformFee;
        break;
    }

    updated.discount = Math.round(discount * 100) / 100;
    updated.grandTotal = Math.round((currentPrice.grandTotal - discount) * 100) / 100;
    updated.savings.push(`Promo ${code.toUpperCase()}: -$${discount.toFixed(2)}`);
    promo.usedCount++;
    return updated;
  }

  async calculateDriverPayout(driverId: string, trips: Array<{ distanceKm: number; durationMinutes: number; baseFare: number; tip: number; surgeActive: boolean }>, period: { start: Date; end: Date }): Promise<DriverPayout> {
    let basePay = 0;
    let distancePay = 0;
    let timePay = 0;
    let surgeBonus = 0;
    let tipTotal = 0;

    for (const trip of trips) {
      basePay += 3.00;
      distancePay += trip.distanceKm * 0.60;
      timePay += trip.durationMinutes * 0.25;
      if (trip.surgeActive) surgeBonus += trip.baseFare * 0.3;
      tipTotal += trip.tip;
    }

    const totalPayout = Math.round((basePay + distancePay + timePay + surgeBonus + tipTotal) * 100) / 100;

    return {
      driverId,
      basePay: Math.round(basePay * 100) / 100,
      distancePay: Math.round(distancePay * 100) / 100,
      timePay: Math.round(timePay * 100) / 100,
      surgeBonus: Math.round(surgeBonus * 100) / 100,
      tipTotal: Math.round(tipTotal * 100) / 100,
      totalPayout,
      period,
      trips: trips.length,
      avgRating: 0,
    };
  }

  async getAIPricingAdvice(context: { currentSurge: SurgeConditions; revenue: number; activeDrivers: number; avgWaitTime: number }): Promise<string> {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a pricing strategist for a food delivery platform. Provide concise, actionable advice on pricing adjustments. 2-3 sentences max." },
      {
        role: "user",
        content: JSON.stringify({
          surgeLevel: context.currentSurge.surgeLevel,
          demandMultiplier: context.currentSurge.demandMultiplier,
          supplyMultiplier: context.currentSurge.supplyMultiplier,
          weatherImpact: context.currentSurge.weatherImpact,
          revenue24h: context.revenue,
          activeDrivers: context.activeDrivers,
          avgWaitTime: context.avgWaitTime,
        }),
      },
    ];
    const res = await this.provider.complete({ messages, temperature: 0.4, maxTokens: 200 });
    return res.content;
  }

  registerPromo(promo: PromoCode): void {
    this.promoCodes.set(promo.code.toUpperCase(), promo);
  }

  getActivePromos(): PromoCode[] {
    const now = new Date();
    return [...this.promoCodes.values()].filter((p) => p.isActive && now >= p.validFrom && now <= p.validUntil && p.usedCount < p.usageLimit);
  }

  setZonePricing(zone: ZonePricing): void {
    this.zonePricing.set(zone.zoneId, zone);
  }

  getZonePricing(zoneId: string): ZonePricing | undefined {
    return this.zonePricing.get(zoneId);
  }

  private calculateTimeSurcharge(time: Date): number {
    const hour = time.getHours();
    if (hour >= 22 || hour <= 5) return 1.50;
    if (hour >= 11 && hour <= 13) return 0;
    if (hour >= 17 && hour <= 20) return 0.50;
    return 0;
  }
}

export const dynamicPricingService = new DynamicPricingService();
