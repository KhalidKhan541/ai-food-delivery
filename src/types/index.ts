import {
  User,
  Account,
  Session,
  Restaurant,
  RestaurantImage,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  MenuItemVariant,
  MenuItemAddon,
  Order,
  OrderItem,
  OrderItemAddOn,
  Driver,
  DriverLocation,
  Delivery,
  DeliveryTracking,
  Customer,
  CustomerAddress,
  CustomerFavorite,
  Cart,
  CartItem,
  CartItemAddOn,
  Payment,
  PaymentRefund,
  PromoCode,
  PromoCodeUsage,
  Review,
  ReviewReply,
  Notification,
  NotificationPreference,
  Coupon,
  CouponUsage,
  LoyaltyProgram,
  LoyaltyPoints,
  LoyaltyReward,
  RestaurantHours,
  Cuisine,
  Tag,
  SearchHistory,
  OrderStatusHistory,
  Address,
  UserRole,
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  RestaurantStatus,
  DriverStatus,
  CuisineType,
  PromoType,
  LoyaltyTier,
} from "@prisma/client";

export type {
  User,
  Account,
  Session,
  Restaurant,
  RestaurantImage,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  MenuItemVariant,
  MenuItemAddon,
  Order,
  OrderItem,
  OrderItemAddOn,
  Driver,
  DriverLocation,
  Delivery,
  DeliveryTracking,
  Customer,
  CustomerAddress,
  CustomerFavorite,
  Cart,
  CartItem,
  CartItemAddOn,
  Payment,
  PaymentRefund,
  PromoCode,
  PromoCodeUsage,
  Review,
  ReviewReply,
  Notification,
  NotificationPreference,
  Coupon,
  CouponUsage,
  LoyaltyProgram,
  LoyaltyPoints,
  LoyaltyReward,
  RestaurantHours,
  Cuisine,
  Tag,
  SearchHistory,
  OrderStatusHistory,
  Address,
  UserRole,
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  RestaurantStatus,
  DriverStatus,
  CuisineType,
  PromoType,
  LoyaltyTier,
};

export type UserWithRelations = User & {
  accounts: Account[];
  sessions: Session[];
  customer: Customer | null;
  driver: Driver | null;
  restaurant: Restaurant | null;
  notifications: Notification[];
  notificationPreferences: NotificationPreference[];
};

export type CustomerWithRelations = Customer & {
  user: User;
  addresses: CustomerAddress[];
  favorites: CustomerFavorite[];
  orders: Order[];
  loyaltyProgram: LoyaltyProgram | null;
};

export type DriverWithRelations = Driver & {
  user: User;
  locations: DriverLocation[];
  deliveries: Delivery[];
};

export type RestaurantWithRelations = Restaurant & {
  owner: User;
  images: RestaurantImage[];
  menuCategories: MenuCategoryWithRelations[];
  orders: Order[];
  reviews: Review[];
  hours: RestaurantHours[];
  cuisines: Cuisine[];
  tags: Tag[];
};

export type MenuCategoryWithRelations = MenuCategory & {
  restaurant: Restaurant;
  items: MenuItemWithRelations[];
};

export type MenuItemWithRelations = MenuItem & {
  category: MenuCategory;
  restaurant: Restaurant;
  images: MenuItemImage[];
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
  orderItems: OrderItem[];
};

export type OrderWithRelations = Order & {
  customer: Customer;
  restaurant: Restaurant;
  items: OrderItemWithRelations[];
  delivery: Delivery | null;
  payments: Payment[];
  statusHistory: OrderStatusHistory[];
  review: Review | null;
  promoCode: PromoCode | null;
};

export type OrderItemWithRelations = OrderItem & {
  order: Order;
  menuItem: MenuItem;
  variant: MenuItemVariant | null;
  addOns: OrderItemAddOn[];
};

export type DeliveryWithRelations = Delivery & {
  order: Order;
  driver: Driver;
  tracking: DeliveryTracking[];
};

export type ReviewWithRelations = Review & {
  customer: Customer;
  restaurant: Restaurant;
  order: Order | null;
  reply: ReviewReply | null;
};

export type CartWithRelations = Cart & {
  customer: Customer;
  restaurant: Restaurant;
  items: CartItemWithRelations[];
};

export type CartItemWithRelations = CartItem & {
  cart: Cart;
  menuItem: MenuItem;
  variant: MenuItemVariant | null;
  addOns: CartItemAddOn[];
};

export type PaymentWithRelations = Payment & {
  order: Order;
  refund: PaymentRefund | null;
};

export type PromoCodeWithRelations = PromoCode & {
  restaurant: Restaurant | null;
  usages: PromoCodeUsage[];
};

export type LoyaltyProgramWithRelations = LoyaltyProgram & {
  customer: Customer;
  points: LoyaltyPoints[];
  rewards: LoyaltyReward[];
};

export type NotificationWithRelations = Notification & {
  user: User;
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressInput {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface TimeRange {
  open: string;
  close: string;
}

export interface OrderSummary {
  id: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  restaurantName: string;
  itemCount: number;
}

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  deliveryTime: number;
  deliveryFee: number;
  distance?: number;
  image?: string;
  cuisines: string[];
  isOpen: boolean;
}

export interface DriverLocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface DeliveryEstimate {
  estimatedTime: number;
  estimatedFee: number;
  distance: number;
  isEligible: boolean;
  message?: string;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalCustomers: number;
  activeDrivers: number;
  pendingOrders: number;
  completedToday: number;
  averageRating: number;
}

export interface CustomerDashboardStats {
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  favoriteRestaurants: number;
  activeOrders: number;
}

export interface DriverDashboardStats {
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  todayDeliveries: number;
  todayEarnings: number;
  acceptanceRate: number;
  completionRate: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RestaurantFilter extends PaginationQuery {
  cuisine?: string;
  priceRange?: string;
  minRating?: number;
  maxDeliveryFee?: number;
  maxDeliveryTime?: number;
  isFeatured?: boolean;
  search?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface OrderFilter extends PaginationQuery {
  status?: OrderStatus[];
  restaurantId?: string;
  customerId?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface MenuItemFilter extends PaginationQuery {
  categoryId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  allergens?: string[];
  search?: string;
}

export interface ReviewFilter extends PaginationQuery {
  restaurantId?: string;
  customerId?: string;
  minRating?: number;
  maxRating?: number;
  hasImages?: boolean;
  hasReply?: boolean;
}

export interface NotificationFilter extends PaginationQuery {
  type?: string;
  isRead?: boolean;
}

export type OrderStatusTransition = {
  from: OrderStatus[];
  to: OrderStatus;
  roles: UserRole[];
};

export const ORDER_STATUS_TRANSITIONS: OrderStatusTransition[] = [
  { from: ["PENDING"], to: "CONFIRMED", roles: ["RESTAURANT_OWNER", "ADMIN"] },
  { from: ["CONFIRMED"], to: "PREPARING", roles: ["RESTAURANT_OWNER", "ADMIN"] },
  { from: ["PREPARING"], to: "READY", roles: ["RESTAURANT_OWNER", "ADMIN"] },
  { from: ["READY"], to: "OUT_FOR_DELIVERY", roles: ["DRIVER", "ADMIN"] },
  { from: ["OUT_FOR_DELIVERY"], to: "DELIVERED", roles: ["DRIVER", "ADMIN"] },
  {
    from: ["PENDING", "CONFIRMED", "PREPARING"],
    to: "CANCELLED",
    roles: ["CUSTOMER", "RESTAURANT_OWNER", "ADMIN"],
  },
];

export const DELIVERY_STATUS_TRANSITIONS: OrderStatusTransition[] = [
  { from: ["PENDING"], to: "ASSIGNED", roles: ["ADMIN"] },
  { from: ["ASSIGNED"], to: "PICKING_UP", roles: ["DRIVER"] },
  { from: ["PICKING_UP"], to: "IN_TRANSIT", roles: ["DRIVER"] },
  { from: ["IN_TRANSIT"], to: "DELIVERED", roles: ["DRIVER"] },
  { from: ["ASSIGNED", "PICKING_UP", "IN_TRANSIT"], to: "FAILED", roles: ["DRIVER", "ADMIN"] },
];

export type AppNotificationType =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "ORDER_PREPARING"
  | "ORDER_READY"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "REFUND_PROCESSED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ARRIVING"
  | "REVIEW_RECEIVED"
  | "REVIEW_REPLIED"
  | "PROMO_AVAILABLE"
  | "LOYALTY_POINTS_EARNED"
  | "LOYALTY_REWARD_AVAILABLE"
  | "ACCOUNT_UPDATED"
  | "SYSTEM Announcement";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image?: string;
  badge?: number;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: Coordinates;
  radius: number;
  type: "delivery" | "restriction" | "promo";
}

export interface AIRecommendation {
  id: string;
  type: "restaurant" | "menu_item" | "promo";
  score: number;
  reason: string;
  data: Record<string, unknown>;
}

export interface SearchSuggestion {
  text: string;
  type: "restaurant" | "cuisine" | "dish" | "recent";
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}

export interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  dateRange?: { start: Date; end: Date };
  filters?: Record<string, unknown>;
}

export type Theme = "light" | "dark" | "system";

export interface AppSettings {
  theme: Theme;
  language: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    showProfile: boolean;
    showOrders: boolean;
  };
}

export type SortOption<T extends string> = {
  field: T;
  order: "asc" | "desc";
  label: string;
};

export interface BulkAction<T> {
  ids: string[];
  action: string;
  data?: Partial<T>;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export interface ExportResult {
  url: string;
  filename: string;
  size: number;
  expiresAt: Date;
}

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  services: {
    database: "up" | "down";
    cache: "up" | "down";
    storage: "up" | "down";
    email: "up" | "down";
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
