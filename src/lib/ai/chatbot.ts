import { z } from "zod";
import { getAIProvider, type ChatMessage, type CompletionResponse } from "./provider";

// --- Types ----------------------------------------------------------------

export type IntentType =
  | "order_status"
  | "place_order"
  | "modify_order"
  | "cancel_order"
  | "track_delivery"
  | "get_recommendation"
  | "complaint"
  | "refund_request"
  | "menu_inquiry"
  | "pricing_question"
  | "general_help"
  | "greeting"
  | "unknown";

export interface ChatContext {
  userId: string;
  sessionId: string;
  currentOrder?: { id: string; status: string; items: string[]; restaurant: string };
  userPreferences?: { favoriteCuisines: string[]; dietaryRestrictions: string[] };
  recentOrders?: Array<{ id: string; date: string; total: number; items: string[] }>;
  location?: { latitude: number; longitude: number };
}

export interface ChatMessage2 {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: IntentType;
    confidence?: number;
    entities?: Record<string, string>;
    actionTaken?: string;
    responseTimeMs?: number;
  };
}

export interface ChatRequest {
  userId: string;
  sessionId: string;
  message: string;
  context: ChatContext;
  history: ChatMessage2[];
}

export interface ChatResponse {
  reply: string;
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
  suggestedActions: string[];
  requiresHumanAgent: boolean;
  responseTimeMs: number;
  metadata: {
    model: string;
    tokensUsed: number;
    estimatedCost: number;
  };
}

export interface OrderTrackingInfo {
  orderId: string;
  status: "placed" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  estimatedDelivery: Date;
  driverName?: string;
  driverLocation?: { latitude: number; longitude: number };
  currentStep: number;
  totalSteps: number;
  updates: Array<{ status: string; timestamp: Date; message: string }>;
}

// --- Intent Classification ------------------------------------------------

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  order_status: [/order\s*status/i, /where.*order/i, /track.*order/i, /order\s*\d+/i, /my\s*order/i],
  place_order: [/order\s*food/i, /place.*order/i, /want.*order/i, /buy.*food/i, /get.*food/i, /hungry/i],
  modify_order: [/change.*order/i, /modify.*order/i, /update.*order/i, /add.*item/i, /remove.*item/i],
  cancel_order: [/cancel.*order/i, /stop.*order/i, /don'?t.*want/i],
  track_delivery: [/where.*driver/i, /track.*delivery/i, /driver.*location/i, /how.*long/i],
  get_recommendation: [/recommend/i, /suggest/i, /what.*eat/i, /what.*good/i, /best.*food/i, /craving/i],
  complaint: [/complaint/i, /unhappy/i, /terrible/i, /worst/i, /bad.*experience/i, /disappointed/i],
  refund_request: [/refund/i, /money.*back/i, /reimburse/i],
  menu_inquiry: [/menu/i, /what.*serving/i, /ingredients/i, /allergen/i, /vegan/i, /vegetarian/i],
  pricing_question: [/how.*much/i, /price/i, /cost/i, /expensive/i, /cheap/i, /delivery.*fee/i],
  general_help: [/help/i, /support/i, /assist/i, /how.*use/i, /what.*can.*you/i],
  greeting: [/^hi\b/i, /^hello/i, /^hey/i, /good\s*(morning|afternoon|evening)/i, /howdy/i],
  unknown: [],
};

function classifyIntent(message: string): { intent: IntentType; confidence: number } {
  const results: Array<{ intent: IntentType; score: number }> = [];
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        score += 1;
      }
    }
    if (score > 0) results.push({ intent: intent as IntentType, score });
  }
  if (!results.length) return { intent: "unknown", confidence: 0.3 };
  results.sort((a, b) => b.score - a.score);
  const best = results[0];
  const confidence = Math.min(0.5 + best.score * 0.2 + (results.length === 1 ? 0.2 : 0), 0.95);
  return { intent: best.intent, confidence: Math.round(confidence * 100) / 100 };
}

// --- Entity Extraction ----------------------------------------------------

interface ExtractedEntities {
  orderId?: string;
  itemName?: string;
  restaurantName?: string;
  cuisineType?: string;
  priceRange?: string;
  issue?: string;
  quantity?: number;
  action?: string;
}

function extractEntities(message: string, context: ChatContext): ExtractedEntities {
  const entities: ExtractedEntities = {};
  const orderMatch = message.match(/order\s*#?(\w{6,})/i);
  if (orderMatch) entities.orderId = orderMatch[1];
  if (context.currentOrder) entities.orderId = context.currentOrder.id;
  const foodPatterns = [/(?:a|an|the|some|one)\s+([\w\s]+?)(?:\s+please|\s*,|\s*\?|$)/i, /(?:order|get|want|have)\s+(?:a\s+)?([\w\s]+?)(?:\s+please|\s*,|\s*\?|$)/i];
  for (const p of foodPatterns) {
    const m = message.match(p);
    if (m) { entities.itemName = m[1].trim(); break; }
  }
  const cuisinePatterns = [/([\w]+)\s*(?:food|cuisine|restaurant)/i, /(chinese|italian|mexican|indian|thai|japanese|korean|american|mediterranean|vietnamese)/i];
  for (const p of cuisinePatterns) {
    const m = message.match(p);
    if (m) { entities.cuisineType = m[1].trim().toLowerCase(); break; }
  }
  const restaurantPatterns = [/(?:from|at|restaurant)\s+([\w\s']+?)(?:\s*,|\s*please|\s*\?|$)/i];
  for (const p of restaurantPatterns) {
    const m = message.match(p);
    if (m) { entities.restaurantName = m[1].trim(); break; }
  }
  const priceMatch = message.match(/(cheap|affordable|budget|expensive|premium|pricey)/i);
  if (priceMatch) entities.priceRange = priceMatch[1].toLowerCase();
  const quantityMatch = message.match(/(\d+)\s*(?:x\s*)?([\w\s]+?)(?:\s*,|\s*please|\s*\?|$)/);
  if (quantityMatch) { entities.quantity = parseInt(quantityMatch[1]); entities.itemName = quantityMatch[2].trim(); }
  const issuePatterns = [/(?:missing|wrong|late|damaged|cold|incorrect)\s*(item|order|food|delivery)?/i, /(food|order)\s*(?:was|is)\s*(?:missing|wrong|late|damaged|cold|incorrect)/i];
  for (const p of issuePatterns) {
    const m = message.match(p);
    if (m) { entities.issue = m[0].trim().toLowerCase(); break; }
  }
  return entities;
}

// --- Response Generation --------------------------------------------------

interface ResponseTemplate {
  intent: IntentType;
  templates: string[];
  actions: string[];
  requiresHuman: boolean;
}

const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    intent: "greeting",
    templates: [
      "Hi there! I'm your food delivery assistant. What can I help you with today?",
      "Hello! Hungry and need help? I'm here for you!",
      "Hey! Ready to help you with orders, tracking, or recommendations!",
    ],
    actions: ["show_menu", "show_recommendations"],
    requiresHuman: false,
  },
  {
    intent: "order_status",
    templates: [
      "Let me check your order status. {orderDetails}",
      "Here's the latest on your order: {orderDetails}",
      "Your order update: {orderDetails}",
    ],
    actions: ["view_order", "track_delivery"],
    requiresHuman: false,
  },
  {
    intent: "place_order",
    templates: [
      "Great choice! I'd love to help you place an order. {recommendation}",
      "Let's get you some food! {recommendation}",
    ],
    actions: ["show_menu", "add_to_cart", "checkout"],
    requiresHuman: false,
  },
  {
    intent: "track_delivery",
    templates: [
      "Your driver {driverName} is on the way! Estimated arrival: {eta}",
      "Tracking your delivery... Your food should arrive in about {eta}",
    ],
    actions: ["track_on_map", "contact_driver"],
    requiresHuman: false,
  },
  {
    intent: "complaint",
    templates: [
      "I'm sorry to hear that. Let me look into this right away.",
      "That's not the experience we want for you. Let me help resolve this.",
    ],
    actions: ["escalate_to_support", "offer_refund"],
    requiresHuman: true,
  },
  {
    intent: "refund_request",
    templates: [
      "I understand you'd like a refund. Let me review the details of your order.",
      "Let me check your refund eligibility for order {orderId}.",
    ],
    actions: ["process_refund", "check_eligibility"],
    requiresHuman: true,
  },
  {
    intent: "get_recommendation",
    templates: [
      "Based on your preferences, here's what I think you'd enjoy: {recommendations}",
      "Great timing! Here are some top picks for you: {recommendations}",
    ],
    actions: ["show_recommendations", "show_menu"],
    requiresHuman: false,
  },
  {
    intent: "pricing_question",
    templates: [
      "Here's the pricing breakdown: {pricingDetails}",
      "Let me explain the costs: {pricingDetails}",
    ],
    actions: ["show_pricing", "apply_promo"],
    requiresHuman: false,
  },
  {
    intent: "general_help",
    templates: [
      "I can help you with:\n• Placing orders\n• Tracking deliveries\n• Getting recommendations\n• Checking order status\n• Refunds and support\n\nWhat would you like to do?",
    ],
    actions: ["show_menu", "show_recommendations", "show_orders"],
    requiresHuman: false,
  },
  {
    intent: "unknown",
    templates: [
      "I'm not sure I understood that. Could you rephrase?",
      "I didn't quite get that. Can you tell me more about what you need?",
    ],
    actions: [],
    requiresHuman: false,
  },
];

// --- Chatbot Service ------------------------------------------------------

export class ChatbotService {
  private provider = getAIProvider();
  private sessionHistories = new Map<string, ChatMessage[]>();

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    const { intent, confidence } = classifyIntent(request.message);
    const entities = extractEntities(request.message, request.context);

    const systemPrompt = this.buildSystemPrompt(request.context, intent);
    const messages = this.buildMessages(systemPrompt, request);

    const response = await this.provider.complete({
      messages,
      temperature: 0.6,
      maxTokens: 500,
    });

    const template = RESPONSE_TEMPLATES.find((t) => t.intent === intent) ?? RESPONSE_TEMPLATES.find((t) => t.intent === "unknown")!;
    let reply = this.fillTemplate(template.templates[0], request.context, entities);
    reply = response.content || reply;

    const suggestedActions = template.actions;
    const requiresHumanAgent = template.requiresHuman || (intent === "complaint" && confidence > 0.7) || (intent === "refund_request");

    this.updateSessionHistory(request.sessionId, messages, response);

    return {
      reply,
      intent,
      confidence,
      entities: entities as Record<string, string>,
      suggestedActions,
      requiresHumanAgent,
      responseTimeMs: Date.now() - startTime,
      metadata: {
        model: response.provider,
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.usage.estimatedCostUsd,
      },
    };
  }

  async getOrderTrackingInfo(orderId: string): Promise<OrderTrackingInfo> {
    const statuses: OrderTrackingInfo["status"][] = ["placed", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered"];
    const currentIdx = Math.floor(Math.random() * 6);
    const status = statuses[currentIdx];
    const estimatedDelivery = new Date(Date.now() + (6 - currentIdx) * 10 * 60000);

    return {
      orderId,
      status,
      estimatedDelivery,
      driverName: currentIdx >= 4 ? "Alex M." : undefined,
      driverLocation: currentIdx >= 4 ? { latitude: 40.7128 + Math.random() * 0.01, longitude: -74.006 + Math.random() * 0.01 } : undefined,
      currentStep: currentIdx + 1,
      totalSteps: statuses.length,
      updates: statuses.slice(0, currentIdx + 1).map((s, i) => ({
        status: s,
        timestamp: new Date(Date.now() - (currentIdx - i) * 8 * 60000),
        message: this.getStatusMessage(s),
      })),
    };
  }

  async getQuickReply(context: ChatContext): Promise<string> {
    if (context.currentOrder) {
      return `Your order from ${context.currentOrder.restaurant} is ${context.currentOrder.status}. Need anything else?`;
    }
    if (context.recentOrders?.length) {
      return `Last time you ordered from ${context.recentOrders[0].items[0]}... Want something similar?`;
    }
    return "Hungry? I can recommend something great nearby!";
  }

  private buildSystemPrompt(context: ChatContext, intent: IntentType): string {
    let prompt = `You are a friendly AI food delivery assistant. Be concise, helpful, and conversational.
Current time: ${new Date().toISOString()}.
`;
    if (context.currentOrder) {
      prompt += `\nUser has an active order #${context.currentOrder.id} (${context.currentOrder.status}) from ${context.currentOrder.restaurant}. Items: ${context.currentOrder.items.join(", ")}.`;
    }
    if (context.userPreferences) {
      prompt += `\nUser prefers: ${context.userPreferences.favoriteCuisines.join(", ")}. Dietary restrictions: ${context.userPreferences.dietaryRestrictions.join(", ") || "none"}.`;
    }
    if (intent === "complaint" || intent === "refund_request") {
      prompt += "\nBe empathetic. Acknowledge the issue. Offer concrete resolution steps. Escalate to human agent if needed.";
    }
    if (intent === "place_order" || intent === "get_recommendation") {
      prompt += "\nSuggest specific items. Be enthusiastic but not pushy. Mention prices when relevant.";
    }
    return prompt;
  }

  private buildMessages(systemPrompt: string, request: ChatRequest): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];
    const recentHistory = request.history.slice(-10);
    for (const h of recentHistory) {
      messages.push({ role: h.role === "user" ? "user" : "assistant", content: h.content });
    }
    messages.push({ role: "user", content: request.message });
    return messages;
  }

  private fillTemplate(template: string, context: ChatContext, entities: ExtractedEntities): string {
    let result = template;
    if (context.currentOrder) {
      result = result.replace("{orderDetails}", `Order #${context.currentOrder.id} from ${context.currentOrder.restaurant} is currently ${context.currentOrder.status}.`);
    }
    if (entities.orderId) result = result.replace("{orderId}", entities.orderId);
    result = result.replace("{eta}", "about 15-20 minutes");
    result = result.replace("{driverName}", "Your driver");
    result = result.replace("{recommendations}", "I'd recommend checking out today's specials!");
    result = result.replace("{pricingDetails}", "Delivery fees start at $2.99. Free delivery on orders over $25!");
    return result;
  }

  private getStatusMessage(status: OrderTrackingInfo["status"]): string {
    switch (status) {
      case "placed": return "Your order has been placed successfully.";
      case "confirmed": return "Restaurant has confirmed your order.";
      case "preparing": return "Your food is being prepared.";
      case "ready": return "Your order is ready for pickup.";
      case "picked_up": return "Driver has picked up your order.";
      case "in_transit": return "Your food is on its way!";
      case "delivered": return "Your order has been delivered. Enjoy!";
      case "cancelled": return "Your order has been cancelled.";
    }
  }

  private updateSessionHistory(sessionId: string, messages: ChatMessage[], _response: CompletionResponse): void {
    const existing = this.sessionHistories.get(sessionId) ?? [];
    const userMsg = messages.filter((m) => m.role !== "system").slice(-1)[0];
    if (userMsg) existing.push(userMsg);
    if (existing.length > 50) existing.splice(0, existing.length - 50);
    this.sessionHistories.set(sessionId, existing);
  }

  getSessionHistory(sessionId: string): ChatMessage[] {
    return this.sessionHistories.get(sessionId) ?? [];
  }

  clearSession(sessionId: string): void {
    this.sessionHistories.delete(sessionId);
  }
}

export const chatbotService = new ChatbotService();
