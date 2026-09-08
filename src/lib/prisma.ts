import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. In dev, Next.js hot-reload would otherwise create
 * many connections; we cache one instance on globalThis.
 *
 * We widen the connection pool and timeout because Neon serverless can be slow
 * on cold start, and pages issue several queries in parallel.
 */
function tunedUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=21&pool_timeout=30`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = tunedUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
