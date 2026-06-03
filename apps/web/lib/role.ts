import { cookies } from "next/headers";
import type { TenantRole } from "@operate/db-control";

const COOKIE_PREFIX = "operate.impersonate-role.";

const ROLES = ["OWNER", "MANAGER", "EMPLOYEE", "CUSTOMER"] as const;
type Role = (typeof ROLES)[number];

export interface ImpersonationState {
  role: TenantRole;
  /** Employee id when role=EMPLOYEE; Customer id when role=CUSTOMER; null otherwise. */
  entityId: string | null;
}

/**
 * Cookie format: "ROLE" or "ROLE:entityId".
 *   OWNER, MANAGER → no entity
 *   EMPLOYEE:<empId> → impersonate that specific employee
 *   CUSTOMER:<custId> → impersonate that specific customer
 */
export async function getImpersonation(
  tenantSlug: string,
): Promise<ImpersonationState | null> {
  const store = await cookies();
  const raw = store.get(`${COOKIE_PREFIX}${tenantSlug}`)?.value;
  if (!raw) return null;
  const [roleRaw, entityId] = raw.split(":");
  if (!roleRaw || !(ROLES as readonly string[]).includes(roleRaw)) return null;
  return { role: roleRaw as Role, entityId: entityId || null };
}

/**
 * Resolve the EFFECTIVE role + (optional) entity for a tenant. Real members
 * always get their actual role; only super-admins without a membership can
 * use the impersonation override.
 */
export async function getEffectiveRole({
  tenantSlug,
  membershipRole,
  isSuperAdmin,
}: {
  tenantSlug: string;
  membershipRole: TenantRole | null;
  isSuperAdmin: boolean;
}): Promise<{
  role: TenantRole;
  entityId: string | null;
  impersonated: boolean;
}> {
  if (membershipRole) {
    return { role: membershipRole, entityId: null, impersonated: false };
  }
  if (isSuperAdmin) {
    const override = await getImpersonation(tenantSlug);
    if (override) {
      return { ...override, impersonated: true };
    }
    return { role: "OWNER", entityId: null, impersonated: false };
  }
  return { role: "CUSTOMER", entityId: null, impersonated: false };
}

export async function setImpersonation(
  tenantSlug: string,
  state: ImpersonationState | null,
): Promise<void> {
  const store = await cookies();
  const key = `${COOKIE_PREFIX}${tenantSlug}`;
  if (state === null) {
    store.delete(key);
    return;
  }
  const value = state.entityId ? `${state.role}:${state.entityId}` : state.role;
  store.set(key, value, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
