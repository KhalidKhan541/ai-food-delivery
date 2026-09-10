import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/payments/webhook")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const isPublicApi = pathname.startsWith("/api/restaurants") &&
      !pathname.includes("/menu") &&
      !pathname.includes("/reviews") &&
      request.method === "GET";

    const isSearchApi = pathname.startsWith("/api/search") && request.method === "GET";
    const isMenuItemsApi = pathname.startsWith("/api/menu-items") && request.method === "GET";

    if (isPublicApi || isSearchApi || isMenuItemsApi) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", token.sub ?? "");
    response.headers.set("x-user-role", (token.role as string) ?? "");

    return response;
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname.startsWith("/dashboard") && !["RESTAURANT_OWNER", "ADMIN"].includes(token.role as string)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
