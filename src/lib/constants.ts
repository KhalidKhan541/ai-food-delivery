export const APP_NAME = "AI Food Delivery";
export const APP_DESCRIPTION = "AI-powered food delivery at your fingertips";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  restaurants: "/restaurants",
  restaurant: (id: string) => `/restaurants/${id}`,
  cart: "/cart",
  checkout: "/checkout",
  orders: "/orders",
  order: (id: string) => `/orders/${id}`,
  profile: "/profile",
  settings: "/settings",
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  READY: "READY",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Being Prepared",
  READY: "Ready for Pickup",
  OUT_FOR_DELIVERY: "On the Way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const CUISINE_TYPES = [
  "Italian",
  "Japanese",
  "Mexican",
  "Indian",
  "Chinese",
  "Thai",
  "Mediterranean",
  "American",
  "Korean",
  "Vietnamese",
  "Ethiopian",
  "Greek",
] as const;

export const LOYALTY_TIERS = {
  BRONZE: { name: "Bronze", minPoints: 0, multiplier: 1 },
  SILVER: { name: "Silver", minPoints: 500, multiplier: 1.5 },
  GOLD: { name: "Gold", minPoints: 1500, multiplier: 2 },
  PLATINUM: { name: "Platinum", minPoints: 5000, multiplier: 3 },
} as const;
