export const PACKAGE_NAME = "@operate/tenant-router" as const;

export {
  resolveTenantFromHost,
  resolveTenantFromPath,
  type ResolvedTenant,
  type ResolveOptions,
  type TenantSource,
} from "./resolve";

export { getTenantBySlug, clearTenantCache } from "./registry";

export {
  getOrCreateTenantClient,
  evictTenantClient,
  type TenantPrismaLike,
} from "./tenant-client-factory";
