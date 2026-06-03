import { controlPrisma, type Tenant } from "@operate/db-control";

/**
 * Tenant registry — looks up tenant config from the control plane.
 *
 * Cached in-process for the lifetime of the server process. In Phase 14
 * we'll add a TTL + revalidation hook so live tenant config changes
 * (suspended, archived) propagate without a restart.
 */

const tenantBySlug = new Map<string, Tenant | null>();

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  if (tenantBySlug.has(slug)) {
    return tenantBySlug.get(slug) ?? null;
  }
  const tenant = await controlPrisma.tenant.findUnique({ where: { slug } });
  tenantBySlug.set(slug, tenant);
  return tenant;
}

/** Test/dev hook: clear the cache (used by the provisioning CLI). */
export function clearTenantCache(slug?: string): void {
  if (slug) tenantBySlug.delete(slug);
  else tenantBySlug.clear();
}
