import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters");
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters");
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]{7,15}$/, "Invalid phone number");
export const urlSchema = z.string().url("Invalid URL");
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");
export const uuidSchema = z.string().uuid("Invalid ID");
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().min(0);
export const priceSchema = z.number().int().min(0);
export const percentageSchema = z.number().min(0).max(100);
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);

export const authSchema = {
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
  register: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "DRIVER"]).default("CUSTOMER"),
    phone: phoneSchema.optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
  forgotPassword: z.object({
    email: emailSchema,
  }),
  resetPassword: z.object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
};

export const userSchema = {
  update: z.object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    image: urlSchema.optional(),
  }),
  updateRole: z.object({
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "DRIVER", "ADMIN"]),
  }),
};

export const restaurantSchema = {
  create: z.object({
    name: nameSchema,
    slug: slugSchema,
    description: z.string().max(2000).optional(),
    phone: phoneSchema,
    email: emailSchema,
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().default("US"),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    cuisineTypes: z.array(z.string()).min(1),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).default("$$"),
    minOrderAmount: priceSchema.default(0),
    deliveryFee: priceSchema.default(0),
    estimatedDeliveryTime: positiveIntSchema.default(30),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  }),
  update: z.object({
    name: nameSchema.optional(),
    description: z.string().max(2000).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    zipCode: z.string().min(1).optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
    minOrderAmount: priceSchema.optional(),
    deliveryFee: priceSchema.optional(),
    estimatedDeliveryTime: positiveIntSchema.optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
  updateStatus: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"]),
  }),
};

export const restaurantHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean().default(false),
});

export const menuCategorySchema = {
  create: z.object({
    name: nameSchema,
    description: z.string().max(500).optional(),
    sortOrder: nonNegativeIntSchema.default(0),
    isActive: z.boolean().default(true),
  }),
  update: z.object({
    name: nameSchema.optional(),
    description: z.string().max(500).optional(),
    sortOrder: nonNegativeIntSchema.optional(),
    isActive: z.boolean().optional(),
  }),
  reorder: z.object({
    ids: z.array(uuidSchema),
  }),
};

export const menuItemSchema = {
  create: z.object({
    name: nameSchema,
    slug: slugSchema,
    description: z.string().max(2000).optional(),
    price: priceSchema,
    compareAtPrice: priceSchema.optional(),
    categoryId: uuidSchema,
    isAvailable: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    spiceLevel: z.number().int().min(0).max(5).default(0),
    calories: nonNegativeIntSchema.optional(),
    preparationTime: positiveIntSchema.optional(),
    tags: z.array(z.string()).default([]),
    allergens: z.array(z.string()).default([]),
    sortOrder: nonNegativeIntSchema.default(0),
  }),
  update: z.object({
    name: nameSchema.optional(),
    description: z.string().max(2000).optional(),
    price: priceSchema.optional(),
    compareAtPrice: priceSchema.optional(),
    categoryId: uuidSchema.optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    spiceLevel: z.number().int().min(0).max(5).optional(),
    calories: nonNegativeIntSchema.optional(),
    preparationTime: positiveIntSchema.optional(),
    tags: z.array(z.string()).optional(),
    allergens: z.array(z.string()).optional(),
    sortOrder: nonNegativeIntSchema.optional(),
  }),
  updateAvailability: z.object({
    isAvailable: z.boolean(),
  }),
  bulkUpdate: z.object({
    ids: z.array(uuidSchema),
    data: z.object({
      isAvailable: z.boolean().optional(),
      price: priceSchema.optional(),
    }),
  }),
};

export const menuItemVariantSchema = {
  create: z.object({
    name: nameSchema,
    price: priceSchema,
    sku: z.string().optional(),
    isAvailable: z.boolean().default(true),
    sortOrder: nonNegativeIntSchema.default(0),
  }),
  update: z.object({
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    sku: z.string().optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: nonNegativeIntSchema.optional(),
  }),
};

export const menuItemAddonSchema = {
  create: z.object({
    name: nameSchema,
    price: priceSchema,
    isAvailable: z.boolean().default(true),
    sortOrder: nonNegativeIntSchema.default(0),
  }),
  update: z.object({
    name: nameSchema.optional(),
    price: priceSchema.optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: nonNegativeIntSchema.optional(),
  }),
};

export const cartSchema = {
  addItem: z.object({
    menuItemId: uuidSchema,
    quantity: positiveIntSchema.default(1),
    variantId: uuidSchema.optional(),
    addonIds: z.array(uuidSchema).default([]),
    specialInstructions: z.string().max(500).optional(),
  }),
  updateItem: z.object({
    cartItemId: uuidSchema,
    quantity: z.number().int().min(0),
  }),
  clear: z.object({}),
};

export const orderSchema = {
  create: z.object({
    restaurantId: uuidSchema,
    deliveryAddressId: uuidSchema,
    items: z
      .array(
        z.object({
          menuItemId: uuidSchema,
          quantity: positiveIntSchema,
          variantId: uuidSchema.optional(),
          addonIds: z.array(uuidSchema).default([]),
          specialInstructions: z.string().max(500).optional(),
        })
      )
      .min(1),
    promoCode: z.string().optional(),
    tip: nonNegativeIntSchema.default(0),
    specialInstructions: z.string().max(1000).optional(),
    scheduledAt: z.coerce.date().optional(),
  }),
  updateStatus: z.object({
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ]),
    note: z.string().max(500).optional(),
  }),
  cancel: z.object({
    reason: z.string().max(500).optional(),
  }),
  rate: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    foodRating: z.number().int().min(1).max(5).optional(),
    deliveryRating: z.number().int().min(1).max(5).optional(),
  }),
};

export const deliverySchema = {
  updateStatus: z.object({
    status: z.enum([
      "ASSIGNED",
      "PICKING_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "FAILED",
    ]),
    note: z.string().max(500).optional(),
  }),
  updateLocation: z.object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  }),
};

export const driverSchema = {
  apply: z.object({
    licenseNumber: z.string().min(1),
    licenseExpiry: z.coerce.date(),
    vehicleType: z.enum(["BIKE", "MOTORCYCLE", "CAR", "SCOOTER"]),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),
    vehicleYear: z.number().int().optional(),
    vehicleColor: z.string().optional(),
    insuranceNumber: z.string().optional(),
    insuranceExpiry: z.coerce.date().optional(),
  }),
  updateAvailability: z.object({
    isAvailable: z.boolean(),
  }),
  updateLocation: z.object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  }),
};

export const paymentSchema = {
  create: z.object({
    orderId: uuidSchema,
    method: z.enum(["CREDIT_CARD", "DEBIT_CARD", "CASH", "WALLET"]),
    amount: priceSchema,
    currency: z.string().default("USD"),
  }),
  refund: z.object({
    paymentId: uuidSchema,
    amount: priceSchema.optional(),
    reason: z.string().max(500),
  }),
};

export const promoCodeSchema = {
  create: z.object({
    code: z.string().min(3).max(50).toUpperCase(),
    description: z.string().max(500).optional(),
    type: z.enum(["PERCENTAGE", "FIXED", "FREE_DELIVERY"]),
    value: z.number().int().min(0),
    minOrderAmount: priceSchema.default(0),
    maxDiscountAmount: priceSchema.optional(),
    usageLimit: positiveIntSchema.optional(),
    usageLimitPerUser: positiveIntSchema.default(1),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    isActive: z.boolean().default(true),
    restaurantId: uuidSchema.optional(),
  }),
  update: z.object({
    description: z.string().max(500).optional(),
    value: z.number().int().min(0).optional(),
    minOrderAmount: priceSchema.optional(),
    maxDiscountAmount: priceSchema.optional(),
    usageLimit: positiveIntSchema.optional(),
    usageLimitPerUser: positiveIntSchema.optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  }),
  validate: z.object({
    code: z.string(),
    orderAmount: priceSchema,
    restaurantId: uuidSchema.optional(),
  }),
};

export const reviewSchema = {
  create: z.object({
    restaurantId: uuidSchema,
    orderId: uuidSchema.optional(),
    rating: z.number().int().min(1).max(5),
    foodRating: z.number().int().min(1).max(5).optional(),
    deliveryRating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
    images: z.array(urlSchema).max(5).default([]),
  }),
  reply: z.object({
    content: z.string().min(1).max(2000),
  }),
  update: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    foodRating: z.number().int().min(1).max(5).optional(),
    deliveryRating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
  }),
};

export const notificationSchema = {
  updatePreference: z.object({
    type: z.string(),
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }),
  markRead: z.object({
    ids: z.array(uuidSchema),
  }),
};

export const addressSchema = {
  create: z.object({
    label: z.string().max(50).default("Home"),
    street: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().default("US"),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    isDefault: z.boolean().default(false),
    instructions: z.string().max(500).optional(),
  }),
  update: z.object({
    label: z.string().max(50).optional(),
    street: z.string().min(1).optional(),
    street2: z.string().optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    zipCode: z.string().min(1).optional(),
    country: z.string().optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    isDefault: z.boolean().optional(),
    instructions: z.string().max(500).optional(),
  }),
};

export const customerSchema = {
  update: z.object({
    defaultAddressId: uuidSchema.optional(),
    dietaryRestrictions: z.array(z.string()).default([]),
    favoriteCuisines: z.array(z.string()).default([]),
  }),
};

export const loyaltySchema = {
  redeemReward: z.object({
    rewardId: uuidSchema,
  }),
};

export const searchSchema = {
  query: z.object({
    q: z.string().min(1).max(200),
    cuisine: z.string().optional(),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    radius: z.number().int().min(1).max(50).default(10),
    sortBy: z
      .enum(["relevance", "rating", "distance", "price", "popular"])
      .default("relevance"),
    page: positiveIntSchema.default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
};

export const paginationSchema = z.object({
  page: positiveIntSchema.default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type LoginInput = z.infer<typeof authSchema.login>;
export type RegisterInput = z.infer<typeof authSchema.register>;
export type CreateRestaurantInput = z.infer<typeof restaurantSchema.create>;
export type UpdateRestaurantInput = z.infer<typeof restaurantSchema.update>;
export type CreateMenuItemInput = z.infer<typeof menuItemSchema.create>;
export type UpdateMenuItemInput = z.infer<typeof menuItemSchema.update>;
export type CreateOrderInput = z.infer<typeof orderSchema.create>;
export type CreateReviewInput = z.infer<typeof reviewSchema.create>;
export type CreatePromoInput = z.infer<typeof promoCodeSchema.create>;
export type ValidatePromoInput = z.infer<typeof promoCodeSchema.validate>;
export type SearchQuery = z.infer<typeof searchSchema.query>;
export type PaginationParams = z.infer<typeof paginationSchema>;
