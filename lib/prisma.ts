import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  schemaVersion?: string;
};

const CURRENT_SCHEMA_VERSION = "v7_promo_codes";

if (globalForPrisma.schemaVersion !== CURRENT_SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    try {
      void (globalForPrisma.prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect();
    } catch {}
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.schemaVersion = CURRENT_SCHEMA_VERSION;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
