import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type HealthStatus = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      latencyMs?: number;
      error?: string;
    };
    memory: {
      usedMB: number;
      totalMB: number;
      percentUsed: number;
    };
  };
};

export async function GET() {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: { status: "up" },
      memory: {
        usedMB: 0,
        totalMB: 0,
        percentUsed: 0,
      },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.checks.database.latencyMs = Date.now() - dbStart;
  } catch (error) {
    healthStatus.checks.database.status = "down";
    healthStatus.checks.database.error =
      error instanceof Error ? error.message : "Database connection failed";
    healthStatus.status = "unhealthy";
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  healthStatus.checks.memory = {
    usedMB,
    totalMB,
    percentUsed: Math.round((usedMB / totalMB) * 100),
  };

  // Mark as degraded if memory usage is high
  if (healthStatus.checks.memory.percentUsed > 90) {
    healthStatus.status =
      healthStatus.status === "unhealthy" ? "unhealthy" : "degraded";
  }

  // Return appropriate HTTP status
  const httpStatus =
    healthStatus.status === "healthy"
      ? 200
      : healthStatus.status === "degraded"
        ? 200
        : 503;

  return NextResponse.json(healthStatus, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
