import { NextAuthOptions, getServerSession as getNxtSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { UnauthorizedError } from "./errors";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new UnauthorizedError("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new UnauthorizedError("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new UnauthorizedError("Invalid credentials");
        }

        if (!user.emailVerified) {
          throw new UnauthorizedError("Please verify your email");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as UserRole;
      }
      return session;
    },
  },
};

export async function getServerSession() {
  const session = await getNxtSession(authOptions);
  if (!session?.user) {
    throw new UnauthorizedError("Not authenticated");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getServerSession();
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      customer: true,
      driver: true,
      restaurant: true,
    },
  });
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const session = await getServerSession();
  const userRole = (session.user as any).role as UserRole;
  if (!roles.includes(userRole)) {
    throw new UnauthorizedError("Insufficient permissions");
  }
  return session;
}
