import { controlPrisma, type Tenant } from "@operate/db-control";

/**
 * Tenant registry — looks up tenant config from the control plane.
 *
 * Cached in-process for the lifetime of the server process. In Phase 14
 * we'll add a TTL + revalidation hook so live tenant config changes
 * (suspended, archived) propagate without a restart.
 */

const tenantBySlug = new Map<string, Tenant | null>();
const tenantByCustomDomain = new Map<string, Tenant | null>();

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  if (tenantBySlug.has(slug)) {
    return tenantBySlug.get(slug) ?? null;
  }
  const tenant = await controlPrisma.tenant.findUnique({ where: { slug } });
  tenantBySlug.set(slug, tenant);
  if (tenant?.customDomain) {
    tenantByCustomDomain.set(tenant.customDomain.toLowerCase(), tenant);
  }
  return tenant;
}

export async function getTenantByCustomDomain(
  domain: string,
): Promise<Tenant | null> {
  const key = domain.toLowerCase();
  if (tenantByCustomDomain.has(key)) {
    return tenantByCustomDomain.get(key) ?? null;
  }
  const tenant = await controlPrisma.tenant.findUnique({
    where: { customDomain: key },
  });
  tenantByCustomDomain.set(key, tenant);
  if (tenant) tenantBySlug.set(tenant.slug, tenant);
  return tenant;
}

/** Test/dev hook: clear the cache (used by the provisioning CLI). */
export function clearTenantCache(slug?: string): void {
  if (slug) {
    const cached = tenantBySlug.get(slug);
    tenantBySlug.delete(slug);
    if (cached?.customDomain) {
      tenantByCustomDomain.delete(cached.customDomain.toLowerCase());
    }
  } else {
    tenantBySlug.clear();
    tenantByCustomDomain.clear();
  }
}
