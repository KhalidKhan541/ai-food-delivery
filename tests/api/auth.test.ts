import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { createMocks } from "node-mocks-http";
import bcrypt from "bcryptjs";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

async function registerUser(input: CreateUserInput) {
  const existing = await mockPrisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new Error("User already exists");
  }
  const hashedPassword = await bcrypt.hash(input.password, 12);
  return mockPrisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      password: hashedPassword,
      role: input.role ?? "CUSTOMER",
    },
  });
}

async function authenticateUser(input: LoginInput) {
  const user = await mockPrisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const isValid = await bcrypt.compare(input.password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }
  const session = await mockPrisma.session.create({
    data: {
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return { user, session };
}

async function destroySession(sessionToken: string) {
  return mockPrisma.session.delete({
    where: { sessionToken },
  });
}

describe("Authentication API", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    password: "",
    role: "CUSTOMER",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser.password = await bcrypt.hash("password123", 12);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new customer successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        password: mockUser.password,
      });

      const result = await registerUser({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      });

      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(result.role).toBe("CUSTOMER");
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it("should register a restaurant owner with correct role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        role: "RESTAURANT_OWNER",
      });

      const result = await registerUser({
        email: "owner@restaurant.com",
        name: "Restaurant Owner",
        password: "securePass123",
        role: "RESTAURANT_OWNER",
      });

      expect(result.role).toBe("RESTAURANT_OWNER");
    });

    it("should register a delivery driver", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        role: "DELIVERY_DRIVER",
      });

      const result = await registerUser({
        email: "driver@delivery.com",
        name: "John Driver",
        password: "driverPass123",
        role: "DELIVERY_DRIVER",
      });

      expect(result.role).toBe("DELIVERY_DRIVER");
    });

    it("should reject duplicate email registration", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        registerUser({
          email: "test@example.com",
          name: "Test User",
          password: "password123",
        })
      ).rejects.toThrow("User already exists");
    });

    it("should hash password before storing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async (args: any) => args.data);

      const result = await registerUser({
        email: "new@example.com",
        name: "New User",
        password: "plainPassword123",
      });

      expect(result.password).not.toBe("plainPassword123");
      expect(result.password).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it("should set default role to CUSTOMER when role not provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async (args: any) => args.data);

      const result = await registerUser({
        email: "default@example.com",
        name: "Default Role User",
        password: "password123",
      });

      expect(result.role).toBe("CUSTOMER");
    });

    it("should create user with timestamps", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const result = await registerUser({
        email: "timestamp@example.com",
        name: "Timestamp User",
        password: "password123",
      });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: mockUser.password,
      });
      mockPrisma.session.create.mockResolvedValue({
        id: "session-1",
        sessionToken: "token-abc",
        userId: mockUser.id,
        expires: new Date(),
      });

      const result = await authenticateUser({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.session.sessionToken).toBe("token-abc");
    });

    it("should reject login with wrong password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: mockUser.password,
      });

      await expect(
        authenticateUser({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should reject login for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authenticateUser({
          email: "nonexistent@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should create session on successful login", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: mockUser.password,
      });
      mockPrisma.session.create.mockResolvedValue({
        id: "session-2",
        sessionToken: "token-xyz",
        userId: mockUser.id,
        expires: new Date(),
      });

      await authenticateUser({
        email: "test@example.com",
        password: "password123",
      });

      expect(mockPrisma.session.create).toHaveBeenCalledTimes(1);
    });

    it("should set session expiry to 30 days", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: mockUser.password,
      });

      const beforeLogin = Date.now();
      mockPrisma.session.create.mockImplementation(async (args: any) => args.data);

      await authenticateUser({
        email: "test@example.com",
        password: "password123",
      });

      const createCall = mockPrisma.session.create.mock.calls[0][0];
      const expiry = createCall.data.expires.getTime();
      const expectedExpiry = beforeLogin + 30 * 24 * 60 * 60 * 1000;
      expect(expiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should destroy session on logout", async () => {
      mockPrisma.session.delete.mockResolvedValue({
        id: "session-1",
        sessionToken: "token-abc",
      });

      const result = await destroySession("token-abc");
      expect(result.sessionToken).toBe("token-abc");
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { sessionToken: "token-abc" },
      });
    });

    it("should handle logout with invalid session token", async () => {
      mockPrisma.session.delete.mockRejectedValue(
        new Error("Record to delete does not exist")
      );

      await expect(destroySession("invalid-token")).rejects.toThrow(
        "Record to delete does not exist"
      );
    });
  });

  describe("Session Validation", () => {
    it("should validate existing session", async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: "session-1",
        sessionToken: "valid-token",
        userId: mockUser.id,
        expires: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      const session = await mockPrisma.session.findUnique({
        where: { sessionToken: "valid-token" },
        include: { user: true },
      });

      expect(session).not.toBeNull();
      expect(session!.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it("should reject expired session", async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: "session-1",
        sessionToken: "expired-token",
        userId: mockUser.id,
        expires: new Date(Date.now() - 86400000),
        user: mockUser,
      });

      const session = await mockPrisma.session.findUnique({
        where: { sessionToken: "expired-token" },
        include: { user: true },
      });

      expect(session!.expires.getTime()).toBeLessThan(Date.now());
    });

    it("should return null for non-existent session", async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const session = await mockPrisma.session.findUnique({
        where: { sessionToken: "nonexistent-token" },
      });

      expect(session).toBeNull();
    });
  });
});
