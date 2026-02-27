import { Prisma, PrismaClient } from "@prisma/client";

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

export interface PrismaRlsContext {
  userId: string;
  role?: string | null;
  tenantId?: string | null;
}

// Applies JWT claim context so Postgres RLS helpers can evaluate permissions for the request user.
export async function withPrismaRls<T>(
  context: PrismaRlsContext,
  execute: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${context.userId}, true)`;

    if (context.role) {
      await tx.$executeRaw`SELECT set_config('request.jwt.claim.role', ${context.role}, true)`;
    }

    if (context.tenantId) {
      await tx.$executeRaw`SELECT set_config('request.jwt.claim.tenant_id', ${context.tenantId}, true)`;
    }

    return execute(tx);
  });
}
