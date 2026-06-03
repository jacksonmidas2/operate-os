import Link from "next/link";
import { revalidatePath } from "next/cache";
import { controlPrisma, type GlobalRole, type TenantRole } from "@operate/db-control";
import { PageHeader } from "@/components/Shell";

async function inviteUser(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = (String(formData.get("name") ?? "").trim() || null) as
    | string
    | null;
  const globalRole = String(formData.get("globalRole") ?? "NONE") as GlobalRole;
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantRole = String(formData.get("tenantRole") ?? "OWNER") as TenantRole;

  if (!email) return;

  const user = await controlPrisma.user.upsert({
    where: { email },
    update: { globalRole, name: name ?? undefined },
    create: { email, name, globalRole },
  });

  if (tenantSlug) {
    const tenant = await controlPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (tenant) {
      await controlPrisma.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { role: tenantRole, status: "ACTIVE" },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          role: tenantRole,
          status: "INVITED",
          invitedAt: new Date(),
        },
      });
    }
  }

  revalidatePath("/admin/users");
}

async function updateGlobalRole(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "NONE") as GlobalRole;
  await controlPrisma.user.update({
    where: { id: userId },
    data: { globalRole: role },
  });
  revalidatePath("/admin/users");
}

async function removeTenantMembership(formData: FormData) {
  "use server";
  const membershipId = String(formData.get("membershipId") ?? "");
  await controlPrisma.tenantUser.delete({ where: { id: membershipId } });
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  const [users, tenants] = await Promise.all([
    controlPrisma.user.findMany({
      include: {
        tenantUsers: { include: { tenant: true } },
        accounts: { select: { provider: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    controlPrisma.tenant.findMany({ orderBy: { legalName: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Users"
        description="Pre-invite people by email + assign roles. They get the access the moment they sign in with Google."
      />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          action={inviteUser}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-base font-semibold">Invite by email</h2>
          <Field label="Email" name="email" type="email" required />
          <Field label="Name (optional)" name="name" />
          <SelectField
            label="Global role"
            name="globalRole"
            defaultValue="NONE"
            options={[
              { value: "NONE", label: "None (per-tenant only)" },
              { value: "SUPER_ADMIN", label: "Super-admin" },
            ]}
          />

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs text-gray-500">Optionally add to a tenant:</p>
          <SelectField
            label="Tenant"
            name="tenantSlug"
            defaultValue=""
            options={[
              { value: "", label: "— none —" },
              ...tenants.map((t) => ({ value: t.slug, label: t.legalName })),
            ]}
          />
          <SelectField
            label="Tenant role"
            name="tenantRole"
            defaultValue="OWNER"
            options={[
              { value: "OWNER", label: "Owner" },
              { value: "MANAGER", label: "Manager" },
              { value: "EMPLOYEE", label: "Employee" },
              { value: "CUSTOMER", label: "Customer" },
            ]}
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Invite + assign
          </button>
          <p className="text-xs text-gray-500">
            Creates the row + role. When they sign in with Google, NextAuth
            auto-links to it.
          </p>
        </form>

        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold">All users ({users.length})</h2>
          <ul className="mt-3 space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{u.name ?? u.email}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {u.emailVerified ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900 dark:bg-green-900/30 dark:text-green-100">
                          ✓ signed in
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100">
                          invited
                        </span>
                      )}
                      {u.accounts.length > 0 ? (
                        <span className="text-gray-500">
                          via{" "}
                          {u.accounts
                            .map((a) => a.provider)
                            .join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <form
                    action={updateGlobalRole}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.globalRole}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    >
                      <option value="NONE">NONE</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Set role
                    </button>
                  </form>
                </div>

                {u.tenantUsers.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {u.tenantUsers.map((tu) => (
                      <li
                        key={tu.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs dark:border-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/tenants/${tu.tenant.slug}`}
                            className="font-medium text-brand-600 hover:underline"
                          >
                            {tu.tenant.legalName}
                          </Link>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                            {tu.role}
                          </span>
                          <span className="text-gray-500">
                            {tu.status.toLowerCase()}
                          </span>
                        </div>
                        <form action={removeTenantMembership}>
                          <input
                            type="hidden"
                            name="membershipId"
                            value={tu.id}
                          />
                          <button
                            type="submit"
                            className="text-xs text-gray-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
