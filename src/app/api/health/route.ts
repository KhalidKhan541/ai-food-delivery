import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const checks: Record<string, { status: string; latencyMs: number; detail?: string }> = {};

    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "healthy",
        latencyMs: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        latencyMs: Date.now() - dbStart,
        detail: error instanceof Error ? error.message : "Connection failed",
      };
    }

    checks.application = {
      status: "healthy",
      latencyMs: 0,
      detail: `v${config.app.version}`,
    };

    checks.environment = {
      status: process.env.NODE_ENV === "production" ? "healthy" : "degraded",
      latencyMs: 0,
      detail: process.env.NODE_ENV,
    };

    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
    const anyUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");

    const overallStatus = allHealthy ? "healthy" : anyUnhealthy ? "unhealthy" : "degraded";

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config.app.version,
        environment: process.env.NODE_ENV,
        checks,
        totalLatencyMs: Date.now() - startTime,
      },
      {
        status: allHealthy ? 200 : anyUnhealthy ? 503 : 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        totalLatencyMs: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
