import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  REDIS_URL: z.string().optional(),
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }

  _env = parsed.data;
  return _env;
}

export const config = {
  app: {
    name: "AI Food Delivery",
    description: "AI-powered food delivery platform",
    url: getEnv().NEXTAUTH_URL,
    version: "0.1.0",
  },
  auth: {
    secret: getEnv().NEXTAUTH_SECRET,
    sessionMaxAge: 30 * 24 * 60 * 60,
  },
  database: {
    url: getEnv().DATABASE_URL,
    directUrl: getEnv().DIRECT_URL,
  },
  stripe: {
    secretKey: getEnv().STRIPE_SECRET_KEY,
    publishableKey: getEnv().STRIPE_PUBLISHABLE_KEY,
    webhookSecret: getEnv().STRIPE_WEBHOOK_SECRET,
  },
  email: {
    host: getEnv().SMTP_HOST,
    port: getEnv().SMTP_PORT,
    user: getEnv().SMTP_USER,
    pass: getEnv().SMTP_PASS,
    from: getEnv().SMTP_FROM,
  },
  uploadthing: {
    secret: getEnv().UPLOADTHING_SECRET,
    appId: getEnv().UPLOADTHING_APP_ID,
  },
  upload: {
    maxFileSize: 4 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFiles: 10,
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  delivery: {
    defaultRadiusKm: 10,
    maxRadiusKm: 50,
    estimatedPrepTimeMin: 15,
    estimatedDeliveryTimeMin: 30,
    freeDeliveryThreshold: 25,
    deliveryFee: 3.99,
  },
  loyalty: {
    pointsPerDollar: 10,
    tiers: {
      BRONZE: 0,
      SILVER: 500,
      GOLD: 1500,
      PLATINUM: 5000,
    },
  },
  promo: {
    maxDiscountPercent: 50,
    maxDiscountAmount: 20,
    minOrderAmount: 10,
  },
  ai: {
    recommendationsEnabled: true,
    maxRecommendations: 10,
    searchDebounceMs: 300,
  },
} as const;
