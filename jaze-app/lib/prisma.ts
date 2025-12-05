import { PrismaClient } from "@prisma/client";
import { databaseUrlWithTls } from "./env";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrlWithTls } },
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    // Connection pool configuration
    // See: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-pool
    // For serverless environments, use smaller pool sizes
    // For traditional servers, adjust based on your needs
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
