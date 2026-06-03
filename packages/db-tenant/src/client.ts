// Re-export the generated PrismaClient *class* (not an instance).
//
// The class is instantiated per-tenant by the tenant-router's
// getOrCreateTenantClient() factory, with the tenant's specific
// connection URL. There is NEVER a singleton instance here — every
// tenant gets its own client pointed at its own database.

export { PrismaClient as TenantPrismaClient } from "../generated/prisma";
