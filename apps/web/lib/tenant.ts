import { headers } from "next/headers";
import { getTenantBySlug, type ResolvedTenant } from "@operate/tenant-router";
import type { Tenant } from "@operate/db-control";

export type Surface = "admin" | "book" | "tenant" | "apex";

export interface RequestContext {
  surface: Surface;
  tenantSlug: string | null;
  tenant: Tenant | null;
}

/**
 * Read the surface + tenant the middleware resolved for this request.
 * Use this in Server Components and route handlers.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const surface = (h.get("x-surface") ?? "apex") as Surface;
  const tenantSlug = h.get("x-tenant-slug");

  let tenant: Tenant | null = null;
  if (tenantSlug) {
    try {
      tenant = await getTenantBySlug(tenantSlug);
    } catch (err) {
      // Control DB unreachable (Phase 0 → before migrations). Render apex.
      tenant = null;
    }
  }

  return { surface, tenantSlug, tenant };
}

export function describeResolved(r: ResolvedTenant): string {
  if (r.reserved) return `reserved:${r.reserved}`;
  if (r.slug) return `tenant:${r.slug} (${r.source})`;
  return "apex";
}
