export const PACKAGE_NAME = "@operate/tenant-router" as const;

export {
  resolveTenantFromHost,
  resolveTenantFromPath,
  resolveSlugFromDomainMap,
  resolveTenantFromCustomDomain,
  type ResolvedTenant,
  type ResolveOptions,
  type TenantSource,
} from "./resolve";

export {
  getTenantBySlug,
  getTenantByCustomDomain,
  clearTenantCache,
} from "./registry";

export {
  getOrCreateTenantClient,
  evictTenantClient,
  type TenantPrismaLike,
} from "./tenant-client-factory";
