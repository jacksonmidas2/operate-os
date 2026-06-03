import { PrismaClient } from "../generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __operateControlPrisma: PrismaClient | undefined;
}

export const controlPrisma: PrismaClient =
  globalThis.__operateControlPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__operateControlPrisma = controlPrisma;
}
