import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.DATABASE_URL_DIRECT === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.DATABASE_URL_DIRECT !== "production") {
  globalForPrisma.prisma = prisma;
}
