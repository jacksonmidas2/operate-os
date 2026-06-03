/**
 * Per-tenant Prisma client factory.
 *
 * Each tenant has its OWN Postgres database. We instantiate one PrismaClient
 * per (databaseUrl, schema-version) pair, cached for the lifetime of the
 * server process. The actual TenantPrismaClient class lands in Phase 2
 * (@operate/db-tenant); this module exports the cache + factory shape so
 * Phase 1 routes can already wire it up.
 */

export interface TenantPrismaLike {
  $disconnect(): Promise<void>;
}

type TenantClientConstructor<T extends TenantPrismaLike> = new (config: {
  datasources: { db: { url: string } };
  log?: Array<"query" | "error" | "warn" | "info">;
}) => T;

const clientCache = new Map<string, TenantPrismaLike>();

/**
 * Phase 2 will wire @operate/db-tenant's generated PrismaClient as the
 * constructor. Until then, this factory accepts any constructor that
 * implements the shape above.
 */
export function getOrCreateTenantClient<T extends TenantPrismaLike>(
  databaseUrl: string,
  ctor: TenantClientConstructor<T>,
): T {
  const existing = clientCache.get(databaseUrl);
  if (existing) return existing as T;

  const client = new ctor({
    datasources: { db: { url: databaseUrl } },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
  clientCache.set(databaseUrl, client);
  return client;
}

/** Disconnect and evict a cached client (used on tenant suspension/archive). */
export async function evictTenantClient(databaseUrl: string): Promise<void> {
  const client = clientCache.get(databaseUrl);
  if (!client) return;
  await client.$disconnect();
  clientCache.delete(databaseUrl);
}
