import { UserRole } from "@prisma/client";

type Permission =
  | "restaurant:create"
  | "restaurant:read"
  | "restaurant:update"
  | "restaurant:delete"
  | "restaurant:manage"
  | "menu:create"
  | "menu:read"
  | "menu:update"
  | "menu:delete"
  | "order:create"
  | "order:read"
  | "order:update"
  | "order:cancel"
  | "order:manage"
  | "driver:apply"
  | "driver:read"
  | "driver:update"
  | "driver:manage"
  | "delivery:read"
  | "delivery:update"
  | "payment:read"
  | "payment:refund"
  | "review:create"
  | "review:read"
  | "review:reply"
  | "review:delete"
  | "promo:create"
  | "promo:read"
  | "promo:update"
  | "promo:delete"
  | "loyalty:read"
  | "loyalty:manage"
  | "notification:read"
  | "notification:manage"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:manage"
  | "analytics:read"
  | "settings:read"
  | "settings:update"
  | "admin:access";

const rolePermissions: Record<UserRole, Permission[]> = {
  CUSTOMER: [
    "restaurant:read",
    "menu:read",
    "order:create",
    "order:read",
    "order:cancel",
    "payment:read",
    "review:create",
    "review:read",
    "loyalty:read",
    "notification:read",
    "user:read",
    "user:update",
  ],
  RESTAURANT_OWNER: [
    "restaurant:create",
    "restaurant:read",
    "restaurant:update",
    "restaurant:manage",
    "menu:create",
    "menu:read",
    "menu:update",
    "menu:delete",
    "order:read",
    "order:update",
    "order:manage",
    "payment:read",
    "payment:refund",
    "review:read",
    "review:reply",
    "promo:create",
    "promo:read",
    "promo:update",
    "loyalty:read",
    "loyalty:manage",
    "notification:read",
    "user:read",
    "user:update",
    "analytics:read",
    "settings:read",
    "settings:update",
  ],
  DRIVER: [
    "restaurant:read",
    "menu:read",
    "order:read",
    "delivery:read",
    "delivery:update",
    "driver:read",
    "driver:update",
    "payment:read",
    "notification:read",
    "user:read",
    "user:update",
  ],
  ADMIN: [
    "restaurant:create",
    "restaurant:read",
    "restaurant:update",
    "restaurant:delete",
    "restaurant:manage",
    "menu:create",
    "menu:read",
    "menu:update",
    "menu:delete",
    "order:create",
    "order:read",
    "order:update",
    "order:cancel",
    "order:manage",
    "driver:apply",
    "driver:read",
    "driver:update",
    "driver:manage",
    "delivery:read",
    "delivery:update",
    "payment:read",
    "payment:refund",
    "review:create",
    "review:read",
    "review:reply",
    "review:delete",
    "promo:create",
    "promo:read",
    "promo:update",
    "promo:delete",
    "loyalty:read",
    "loyalty:manage",
    "notification:read",
    "notification:manage",
    "user:read",
    "user:update",
    "user:delete",
    "user:manage",
    "analytics:read",
    "settings:read",
    "settings:update",
    "admin:access",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}

export function canAccessRestaurant(
  role: UserRole,
  restaurantOwnerId: string,
  userId: string
): boolean {
  if (role === "ADMIN") return true;
  if (role === "RESTAURANT_OWNER" && restaurantOwnerId === userId) return true;
  return false;
}

export function canManageOrder(
  role: UserRole,
  orderUserId: string,
  userId: string
): boolean {
  if (role === "ADMIN") return true;
  if (role === "RESTAURANT_OWNER") return true;
  if (orderUserId === userId) return true;
  return false;
}
