/**
 * REGIX Auth System — Prisma Client Singleton (v7)
 * ==================================================
 * Provides a singleton Prisma client instance using the Neon driver adapter.
 * Handles graceful shutdown on process exit.
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ?
        ["query", "warn", "error"]
      : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Initialize Prisma connection and handle graceful shutdown
 */
export async function initPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[Prisma] Connected to database successfully");

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await prisma.$disconnect();
      console.log("[Prisma] Disconnected on SIGINT");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await prisma.$disconnect();
      console.log("[Prisma] Disconnected on SIGTERM");
      process.exit(0);
    });
  } catch (error) {
    console.error("[Prisma] Failed to connect to database:", error);
    process.exit(1);
  }
}

export default prisma;
