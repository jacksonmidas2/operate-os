import { revalidatePath } from "next/cache";
import { setImpersonation } from "@/lib/role";
import {
  getTenantBySlug,
  getOrCreateTenantClient,
} from "@operate/tenant-router";
import { TenantPrismaClient } from "@operate/db-tenant";
import type { TenantRole } from "@operate/db-control";

export async function RoleSwitcher({
  tenantSlug,
  currentRole,
  currentEntityId,
  impersonated,
}: {
  tenantSlug: string;
  currentRole: TenantRole;
  currentEntityId: string | null;
  impersonated: boolean;
}) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const db = getOrCreateTenantClient(tenant.databaseUrl, TenantPrismaClient);
  const [employees, customers] = await Promise.all([
    db.employee.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    db.customer.findMany({ orderBy: { email: "asc" } }),
  ]);

  async function setSelection(formData: FormData) {
    "use server";
    const raw = String(formData.get("selection") ?? "");
    if (raw === "RESET") {
      await setImpersonation(tenantSlug, null);
    } else {
      const [role, entityId] = raw.split(":");
      if (role && ["OWNER", "MANAGER", "EMPLOYEE", "CUSTOMER"].includes(role)) {
        await setImpersonation(tenantSlug, {
          role: role as TenantRole,
          entityId: entityId || null,
        });
      }
    }
    revalidatePath(`/t/${tenantSlug}`, "layout");
  }

  const currentValue = currentEntityId
    ? `${currentRole}:${currentEntityId}`
    : currentRole;

  return (
    <form
      action={setSelection}
      className="border-t border-gray-200 p-3 dark:border-gray-800"
    >
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
        View as (super-admin)
      </label>
      <select
        name="selection"
        defaultValue={currentValue}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
      >
        <optgroup label="Operator">
          <option value="OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
        </optgroup>

        {employees.length > 0 ? (
          <optgroup label="As employee">
            {employees.map((e) => (
              <option key={e.id} value={`EMPLOYEE:${e.id}`}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </optgroup>
        ) : (
          <optgroup label="As employee">
            <option disabled>— no employees yet —</option>
          </optgroup>
        )}

        {customers.length > 0 ? (
          <optgroup label="As customer">
            {customers.map((c) => (
              <option key={c.id} value={`CUSTOMER:${c.id}`}>
                {c.name ?? c.email}
              </option>
            ))}
          </optgroup>
        ) : (
          <optgroup label="As customer">
            <option disabled>— no customers yet —</option>
          </optgroup>
        )}
      </select>

      <div className="mt-2 flex gap-1">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          Set view
        </button>
        {impersonated ? (
          <button
            type="submit"
            name="selection"
            value="RESET"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        ) : null}
      </div>
    </form>
  );
}

export async function ImpersonationBanner({
  role,
  entityName,
  tenantName,
}: {
  role: TenantRole;
  entityName: string | null;
  tenantName: string;
}) {
  const subject =
    role === "EMPLOYEE"
      ? entityName
        ? `employee ${entityName}`
        : "any employee"
      : role === "CUSTOMER"
        ? entityName
          ? `customer ${entityName}`
          : "any customer"
        : role === "MANAGER"
          ? "operator (manager)"
          : "operator (owner)";

  return (
    <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-100">
      🕶 Viewing <strong>{tenantName}</strong> as <strong>{subject}</strong> via super-admin override.
    </div>
  );
}
