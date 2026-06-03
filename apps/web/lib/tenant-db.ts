import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import type { TenantRole } from "@operate/db-control";

/**
 * Universal helper for tenant-scoped routes.
 *   - 404 if tenant doesn't exist
 *   - Redirect to sign-in if not authenticated
 *   - 403 if user has no membership AND isn't a super-admin
 *   - Returns the tenant, session, role, and a per-tenant Prisma client
 */
export async function getTenantContext(slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await auth();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/t/${slug}`);
  }

  const membership = session.user.tenantMemberships.find(
    (m) => m.tenantSlug === slug,
  );
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";

  if (!membership && !isSuperAdmin) {
    throw new Error(`User ${session.user.email} has no access to tenant ${slug}`);
  }

  const role: TenantRole = membership?.role ?? "OWNER";
  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);

  return { tenant, session, role, db };
}
